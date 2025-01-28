import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { familyMembers, relationships, documents } from "@db/schema";
import { eq, and, or } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from 'express';
import OpenAI from "openai";

const openai = new OpenAI();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Add static file serving for uploads
  app.use('/uploads', express.static('uploads'));

  // Family Members
  app.get("/api/family-members", async (req, res) => {
    try {
      const members = await db.query.familyMembers.findMany({
        with: {
          relationships: {
            with: {
              relatedPerson: true,
            },
          },
          documents: true,
        },
      });

      // Format dates safely
      const formattedMembers = members.map(member => ({
        ...member,
        birthDate: member.birthDate ? member.birthDate.toISOString() : null,
        deathDate: member.deathDate ? member.deathDate.toISOString() : null,
        documents: member.documents?.map(doc => ({
          ...doc,
          uploadDate: doc.uploadDate ? doc.uploadDate.toISOString() : null,
        })),
      }));

      res.json(formattedMembers);
    } catch (error) {
      console.error('Error fetching family members:', error);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  app.post("/api/family-members", async (req, res) => {
    try {
      const { relationships: relationshipData, ...memberData } = req.body;

      // Insert the member first
      const [member] = await db.insert(familyMembers).values(memberData).returning();

      // Add relationships if any
      if (relationshipData && relationshipData.length > 0) {
        // Check for existing relationships
        const existingRelationships = await db.query.relationships.findMany({
          where: or(
            and(
              eq(relationships.personId, member.id),
              eq(relationships.relationType, relationshipData[0].relationType)
            ),
            and(
              eq(relationships.relatedPersonId, member.id),
              eq(relationships.relationType, relationshipData[0].relationType === 'parent' ? 'child' :
                                        relationshipData[0].relationType === 'child' ? 'parent' :
                                        'spouse')
            )
          ),
        });

        if (existingRelationships.length > 0) {
          return res.status(400).json({ message: "Duplicate relationships detected" });
        }

        const relationshipsToInsert = relationshipData.flatMap(rel => {
          const relatedPersonId = parseInt(rel.relatedPersonId);
          return [
            {
              personId: member.id,
              relatedPersonId,
              relationType: rel.relationType,
            },
            {
              personId: relatedPersonId,
              relatedPersonId: member.id,
              relationType: rel.relationType === 'parent' ? 'child' :
                         rel.relationType === 'child' ? 'parent' :
                         'spouse',
            }
          ];
        });

        await db.insert(relationships).values(relationshipsToInsert);
      }

      // Fetch the complete member data with relationships
      const newMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.id, member.id),
        with: {
          relationships: {
            with: {
              relatedPerson: true,
            },
          },
        },
      });

      res.json(newMember);
    } catch (error) {
      console.error('Error creating family member:', error);
      res.status(500).json({ message: "Failed to create family member" });
    }
  });

  app.put("/api/family-members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { relationships: newRelationships, ...memberData } = req.body;

      // Format dates properly for database
      const formattedMemberData = {
        ...memberData,
        birthDate: memberData.birthDate ? new Date(memberData.birthDate) : null,
        deathDate: memberData.deathDate ? new Date(memberData.deathDate) : null,
      };

      // Update member data
      const [member] = await db
        .update(familyMembers)
        .set(formattedMemberData)
        .where(eq(familyMembers.id, parseInt(id)))
        .returning();

      // Handle relationships
      if (newRelationships) {
        // Delete existing relationships
        await db.delete(relationships)
          .where(eq(relationships.personId, parseInt(id)));

        // Check for duplicates in new relationships
        const seen = new Set();
        const hasDuplicates = newRelationships.some(rel => {
          const key = `${rel.relatedPersonId}-${rel.relationType}`;
          if (seen.has(key)) return true;
          seen.add(key);
          return false;
        });

        if (hasDuplicates) {
          return res.status(400).json({ message: "Duplicate relationships detected" });
        }

        // Add new relationships if any
        if (newRelationships.length > 0) {
          const relationshipsToInsert = newRelationships.flatMap(rel => {
            const relatedPersonId = parseInt(rel.relatedPersonId);
            return [
              {
                personId: member.id,
                relatedPersonId,
                relationType: rel.relationType,
              },
              {
                personId: relatedPersonId,
                relatedPersonId: member.id,
                relationType: rel.relationType === 'parent' ? 'child' :
                           rel.relationType === 'child' ? 'parent' :
                           'spouse',
              }
            ];
          });

          await db.insert(relationships).values(relationshipsToInsert);
        }
      }

      // Fetch updated member with relationships
      const updatedMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.id, parseInt(id)),
        with: {
          relationships: {
            with: {
              relatedPerson: true,
            },
          },
          documents: true,
        },
      });

      res.json(updatedMember);
    } catch (error) {
      console.error('Error updating family member:', error);
      res.status(500).json({ message: "Failed to update family member" });
    }
  });

  app.delete("/api/family-members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(familyMembers).where(eq(familyMembers.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting family member:', error);
      res.status(500).json({ message: "Failed to delete family member" });
    }
  });

  // Relationships
  app.post("/api/relationships", async (req, res) => {
    const relationship = await db.insert(relationships).values(req.body).returning();
    res.json(relationship[0]);
  });

  app.delete("/api/relationships/:id", async (req, res) => {
    const { id } = req.params;
    await db.delete(relationships).where(eq(relationships.id, parseInt(id)));
    res.json({ success: true });
  });

  // Documents
  app.post("/api/documents", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { familyMemberId, title, documentType, description } = req.body;
      const fileUrl = `/uploads/${req.file.filename}`;

      const document = await db.insert(documents).values({
        familyMemberId: parseInt(familyMemberId),
        title,
        documentType,
        fileUrl,
        description
      }).returning();

      res.json(document[0]);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    const { id } = req.params;
    await db.delete(documents).where(eq(documents.id, parseInt(id)));
    res.json({ success: true });
  });

  // Sample Data Seeding
  app.post("/api/seed", async (req, res) => {
    try {
      // Add sample family members
      const [grandfather] = await db.insert(familyMembers).values({
        firstName: "John",
        lastName: "Smith",
        gender: "male",
        birthDate: new Date("1940-03-15"),
        birthPlace: "London",
        bio: "Family patriarch",
      }).returning();

      const [grandmother] = await db.insert(familyMembers).values({
        firstName: "Mary",
        lastName: "Smith",
        gender: "female",
        birthDate: new Date("1942-06-20"),
        birthPlace: "Manchester",
        bio: "Family matriarch",
      }).returning();

      const [father] = await db.insert(familyMembers).values({
        firstName: "James",
        lastName: "Smith",
        gender: "male",
        birthDate: new Date("1965-09-10"),
        birthPlace: "Birmingham",
        bio: "Middle generation",
      }).returning();

      const [mother] = await db.insert(familyMembers).values({
        firstName: "Sarah",
        lastName: "Smith",
        gender: "female",
        birthDate: new Date("1968-12-25"),
        birthPlace: "Leeds",
        bio: "Joined the family through marriage",
      }).returning();

      const [child1] = await db.insert(familyMembers).values({
        firstName: "Emma",
        lastName: "Smith",
        gender: "female",
        birthDate: new Date("1990-04-05"),
        birthPlace: "London",
        bio: "First grandchild",
      }).returning();

      const [child2] = await db.insert(familyMembers).values({
        firstName: "Michael",
        lastName: "Smith",
        gender: "male",
        birthDate: new Date("1992-08-15"),
        birthPlace: "London",
        bio: "Second grandchild",
      }).returning();

      // Add relationships
      await db.insert(relationships).values([
        // Grandfather & Grandmother are spouses
        { personId: grandfather.id, relatedPersonId: grandmother.id, relationType: "spouse" },
        { personId: grandmother.id, relatedPersonId: grandfather.id, relationType: "spouse" },

        // Father is child of grandparents
        { personId: father.id, relatedPersonId: grandfather.id, relationType: "parent" },
        { personId: father.id, relatedPersonId: grandmother.id, relationType: "parent" },
        { personId: grandfather.id, relatedPersonId: father.id, relationType: "child" },
        { personId: grandmother.id, relatedPersonId: father.id, relationType: "child" },

        // Father & Mother are spouses
        { personId: father.id, relatedPersonId: mother.id, relationType: "spouse" },
        { personId: mother.id, relatedPersonId: father.id, relationType: "spouse" },

        // Children's relationships
        { personId: child1.id, relatedPersonId: father.id, relationType: "parent" },
        { personId: child1.id, relatedPersonId: mother.id, relationType: "parent" },
        { personId: child2.id, relatedPersonId: father.id, relationType: "parent" },
        { personId: child2.id, relatedPersonId: mother.id, relationType: "parent" },
        { personId: father.id, relatedPersonId: child1.id, relationType: "child" },
        { personId: mother.id, relatedPersonId: child1.id, relationType: "child" },
        { personId: father.id, relatedPersonId: child2.id, relationType: "child" },
        { personId: mother.id, relatedPersonId: child2.id, relationType: "child" },
      ]);

      res.json({ success: true, message: "Sample data seeded successfully" });
    } catch (error) {
      console.error("Error seeding data:", error);
      res.status(500).json({ success: false, message: "Error seeding data" });
    }
  });

  // Story Generation
  app.post("/api/family-members/:id/story", async (req, res) => {
    try {
      const { id } = req.params;

      // Fetch member with relationships
      const member = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.id, parseInt(id)),
        with: {
          relationships: {
            with: {
              relatedPerson: true,
            },
          },
        },
      });

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      // Prepare family context
      const familyContext = member.relationships?.map(rel => {
        const relation = rel.relationType;
        const related = rel.relatedPerson;
        return `${related?.firstName} ${related?.lastName} is their ${relation}`;
      }).join(". ");

      // Generate story prompt
      const prompt = `Create a heartwarming and engaging family story about ${member.firstName} ${member.lastName}. 
        Here are the key details about them:
        - Born in ${member.birthPlace || "an unknown location"}
        - Currently lives in ${member.currentLocation || "an unspecified location"}
        - Family connections: ${familyContext || "No known family connections"}
        - Additional information: ${member.bio || ""}

        Please write a warm, personal narrative that weaves together these facts into a cohesive story 
        about their life and family connections. Focus on significant life moments, family relationships, 
        and the bonds that connect them to their relatives. Keep the tone respectful and focus on 
        positive aspects of family relationships and life events.`;

      // Generate story using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a skilled family historian and storyteller, specializing in creating engaging narratives about family histories. Your stories are warm, personal, and focus on the connections between family members."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const story = response.choices[0].message.content;
      res.json({ story });
    } catch (error) {
      console.error('Story generation error:', error);
      res.status(500).json({ message: "Failed to generate story" });
    }
  });

  return httpServer;
}