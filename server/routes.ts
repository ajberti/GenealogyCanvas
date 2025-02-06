import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { familyMembers, relationships, timelineEvents, documents } from "@db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from 'express';

import { Client } from '@replit/object-storage';

const client = new Client();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .jpg, .jpeg, .png, .gif and .pdf files are accepted'));
    }
  }
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Add API prefix middleware to ensure all API routes are handled correctly
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Handle document upload with full URL
  app.post("/api/documents", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { familyMemberId, title, documentType, description } = req.body;

      // Generate unique filename
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const filename = `${uniqueSuffix}-${req.file.originalname}`;

      // Upload to Object Storage
      const { ok, error } = await client.uploadFromText(filename, req.file.buffer.toString('base64'));
      if (!ok) {
        console.error('Error uploading to Object Storage:', error);
        return res.status(500).json({ message: "Failed to upload file" });
      }

      // Download file content as base64
      const { ok: downloadOk, value: fileContent } = await client.downloadAsText(filename);
      if (!downloadOk) {
        return res.status(500).json({ message: "Failed to retrieve file" });
      }

      // Convert base64 to binary buffer
      const fileBuffer = Buffer.from(fileContent, 'base64');
      
      // Create local file with binary content
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localPath = path.join(uploadDir, filename);
      fs.writeFileSync(localPath, fileBuffer);

      const fileUrl = `/uploads/${filename}`;


      // Store document metadata in database with signed URL
      const [document] = await db.insert(documents).values({
        familyMemberId: parseInt(familyMemberId),
        title,
        documentType,
        fileUrl,
        description,
        uploadDate: new Date(),
      }).returning();

      res.json({ 
        success: true, 
        message: "Document uploaded successfully",
        document
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Update document deletion to handle full URLs
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);

      // Get the document to find its file path
      const [document] = await db.select().from(documents).where(eq(documents.id, documentId));

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Extract the filename from the URL
      const filename = document.fileUrl.split('/').pop()?.split('?')[0];
      if (filename) {
        // Delete from Object Storage
        const { ok, error } = await client.delete(filename);
        if (!ok) {
          console.error('Error deleting from Object Storage:', error);
        }
      }

      // Delete from database
      await db.delete(documents).where(eq(documents.id, documentId));

      res.json({ success: true, message: "Document deleted successfully" });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Add family member
  app.post("/api/family-members", async (req, res) => {
    try {
      const { relationships: relationshipData, birthDate, deathDate, ...memberData } = req.body;

      // Convert string dates to Date objects for database insertion
      const formattedData = {
        ...memberData,
        birthDate: birthDate ? new Date(birthDate) : null,
        deathDate: deathDate ? new Date(deathDate) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Insert the new family member
      const [member] = await db.insert(familyMembers).values(formattedData).returning();

      // If there are relationships, add them one by one
      if (relationshipData && Array.isArray(relationshipData) && relationshipData.length > 0) {
        const validRelationships = relationshipData.filter(
          rel => rel && rel.relatedPersonId && rel.relationType
        );

        // Insert each relationship individually
        for (const rel of validRelationships) {
          // Insert the primary relationship
          await db.insert(relationships).values({
            fromMemberId: member.id,
            toMemberId: parseInt(rel.relatedPersonId),
            relationType: rel.relationType,
            createdAt: new Date()
          });

          // For spouse relationships, create the reciprocal relationship
          if (rel.relationType === 'spouse') {
            await db.insert(relationships).values({
              fromMemberId: parseInt(rel.relatedPersonId),
              toMemberId: member.id,
              relationType: 'spouse',
              createdAt: new Date()
            });
          }
        }
      }

      res.json(member);
    } catch (error) {
      console.error('Error creating family member:', error);
      res.status(500).json({ message: "Failed to create family member" });
    }
  });

  // Update endpoint handling - replace the existing update endpoint code
  app.put("/api/family-members/:id", async (req, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const { relationships: relationshipData, birthDate, deathDate, ...memberData } = req.body;

      // Convert string dates to Date objects for database update
      const formattedData = {
        ...memberData,
        birthDate: birthDate ? new Date(birthDate) : null,
        deathDate: deathDate ? new Date(deathDate) : null,
        updatedAt: new Date(),
      };

      // Update the family member
      const [updatedMember] = await db
        .update(familyMembers)
        .set(formattedData)
        .where(eq(familyMembers.id, memberId))
        .returning();

      if (!updatedMember) {
        return res.status(404).json({ message: "Family member not found" });
      }

      // Delete all existing relationships for this member
      await db.delete(relationships)
        .where(eq(relationships.fromMemberId, memberId));

      // Also delete any reciprocal relationships where this member is the target
      await db.delete(relationships)
        .where(eq(relationships.toMemberId, memberId));

      // If there are new relationships, add them
      if (relationshipData && Array.isArray(relationshipData) && relationshipData.length > 0) {
        const validRelationships = relationshipData.filter(
          rel => rel && rel.relatedPersonId && rel.relationType
        );

        // Create a Set to track processed relationships and avoid duplicates
        const processedRelationships = new Set();

        for (const rel of validRelationships) {
          const relatedPersonId = parseInt(rel.relatedPersonId);
          const relationshipKey = `${memberId}-${relatedPersonId}-${rel.relationType}`;

          // Skip if we've already processed this relationship
          if (processedRelationships.has(relationshipKey)) continue;

          // Add the primary relationship
          await db.insert(relationships).values({
            fromMemberId: memberId,
            toMemberId: relatedPersonId,
            relationType: rel.relationType,
            createdAt: new Date()
          });

          // Add reciprocal relationship based on type
          let reciprocalType;
          switch (rel.relationType) {
            case 'parent':
              reciprocalType = 'child';
              break;
            case 'child':
              reciprocalType = 'parent';
              break;
            case 'spouse':
              reciprocalType = 'spouse';
              break;
          }

          if (reciprocalType) {
            await db.insert(relationships).values({
              fromMemberId: relatedPersonId,
              toMemberId: memberId,
              relationType: reciprocalType,
              createdAt: new Date()
            });
          }

          // Mark this relationship as processed
          processedRelationships.add(relationshipKey);
          processedRelationships.add(`${relatedPersonId}-${memberId}-${reciprocalType}`);
        }
      }

      res.json(updatedMember);
    } catch (error) {
      console.error('Error updating family member:', error);
      res.status(500).json({ message: "Failed to update family member" });
    }
  });

  // Get all family members with relationships and timeline events
  app.get("/api/family-members", async (req, res) => {
    try {
      const members = await db.query.familyMembers.findMany({
        with: {
          fromRelationships: {
            columns: {
              id: true,
              relationType: true,
              fromMemberId: true,
              toMemberId: true,
              createdAt: true
            },
            with: {
              toMember: true
            }
          },
          timelineEvents: true,
          documents: true
        }
      });

      const formattedMembers = members.map(member => ({
        ...member,
        birthDate: member.birthDate?.toISOString() || null,
        deathDate: member.deathDate?.toISOString() || null,
        relationships: member.fromRelationships?.map(rel => ({
          id: rel.id,
          personId: member.id,
          relatedPersonId: rel.toMemberId,
          relationType: rel.relationType,
          relatedPerson: rel.toMember
        })),
        timelineEvents: member.timelineEvents?.map(event => ({
          ...event,
          eventDate: event.eventDate.toISOString(),
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString()
        })),
        documents: member.documents?.map(doc => ({
          ...doc,
          uploadDate: doc.uploadDate.toISOString()
        }))
      }));

      res.json(formattedMembers);
    } catch (error) {
      console.error('Error fetching family members:', error);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });


  // Add seed data endpoint
  app.post("/api/seed", async (req, res) => {
    try {
      // Add sample family members
      const [grandfather] = await db.insert(familyMembers).values({
        firstName: "John",
        lastName: "Smith",
        gender: "male",
        birthDate: new Date("1940-03-15"),
        birthPlace: "London",
        bio: "Family patriarch, retired engineer and devoted grandfather",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const [grandmother] = await db.insert(familyMembers).values({
        firstName: "Mary",
        lastName: "Smith",
        gender: "female",
        birthDate: new Date("1942-06-20"),
        birthPlace: "Manchester",
        bio: "Family matriarch, former teacher and passionate gardener",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const [father] = await db.insert(familyMembers).values({
        firstName: "James",
        lastName: "Smith",
        gender: "male",
        birthDate: new Date("1965-09-10"),
        birthPlace: "Birmingham",
        bio: "Software engineer and amateur photographer",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const [mother] = await db.insert(familyMembers).values({
        firstName: "Sarah",
        lastName: "Smith",
        gender: "female",
        birthDate: new Date("1968-04-25"),
        birthPlace: "Bristol",
        bio: "Pediatrician and avid reader",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const [son] = await db.insert(familyMembers).values({
        firstName: "Michael",
        lastName: "Smith",
        gender: "male",
        birthDate: new Date("1995-12-03"),
        birthPlace: "London",
        bio: "University student studying Computer Science",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Add relationships
      await db.insert(relationships).values([
        // Grandparents' marriage
        {
          fromMemberId: grandfather.id,
          toMemberId: grandmother.id,
          relationType: "spouse",
          createdAt: new Date()
        },
        {
          fromMemberId: grandmother.id,
          toMemberId: grandfather.id,
          relationType: "spouse",
          createdAt: new Date()
        },
        // Parents' marriage
        {
          fromMemberId: father.id,
          toMemberId: mother.id,
          relationType: "spouse",
          createdAt: new Date()
        },
        {
          fromMemberId: mother.id,
          toMemberId: father.id,
          relationType: "spouse",
          createdAt: new Date()
        },
        // Parent-child relationships
        {
          fromMemberId: grandfather.id,
          toMemberId: father.id,
          relationType: "child",
          createdAt: new Date()
        },
        {
          fromMemberId: grandmother.id,
          toMemberId: father.id,
          relationType: "child",
          createdAt: new Date()
        },
        {
          fromMemberId: father.id,
          toMemberId: son.id,
          relationType: "child",
          createdAt: new Date()
        },
        {
          fromMemberId: mother.id,
          toMemberId: son.id,
          relationType: "child",
          createdAt: new Date()
        },
        // Child-parent relationships
        {
          fromMemberId: father.id,
          toMemberId: grandfather.id,
          relationType: "parent",
          createdAt: new Date()
        },
        {
          fromMemberId: father.id,
          toMemberId: grandmother.id,
          relationType: "parent",
          createdAt: new Date()
        },
        {
          fromMemberId: son.id,
          toMemberId: father.id,
          relationType: "parent",
          createdAt: new Date()
        },
        {
          fromMemberId: son.id,
          toMemberId: mother.id,
          relationType: "parent",
          createdAt: new Date()
        }
      ]);

      // Add timeline events
      await db.insert(timelineEvents).values([
        {
          familyMemberId: grandfather.id,
          title: "Graduated University",
          description: "Graduated from Imperial College with a degree in Engineering",
          eventDate: new Date("1962-06-15"),
          location: "London",
          eventType: "education",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          familyMemberId: grandfather.id,
          title: "Marriage",
          description: "Married Mary in a traditional ceremony",
          eventDate: new Date("1964-08-20"),
          location: "Manchester Cathedral",
          eventType: "marriage",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          familyMemberId: grandmother.id,
          title: "Started Teaching Career",
          description: "Began teaching at Manchester Grammar School",
          eventDate: new Date("1963-09-01"),
          location: "Manchester",
          eventType: "career",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          familyMemberId: father.id,
          title: "University Graduation",
          description: "Graduated with First Class Honours in Computer Science",
          eventDate: new Date("1987-07-01"),
          location: "Cambridge",
          eventType: "education",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          familyMemberId: mother.id,
          title: "Medical School Graduation",
          description: "Completed medical school with specialization in pediatrics",
          eventDate: new Date("1992-05-15"),
          location: "London",
          eventType: "education",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          familyMemberId: son.id,
          title: "Started University",
          description: "Began studying Computer Science at University College London",
          eventDate: new Date("2014-09-20"),
          location: "London",
          eventType: "education",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      res.json({ success: true, message: "Sample data seeded successfully" });
    } catch (error) {
      console.error("Error seeding data:", error);
      res.status(500).json({ success: false, message: "Error seeding data" });
    }
  });

  // Add family member deletion endpoint
  app.delete("/api/family-members/:id", async (req, res) => {
    try {
      const memberId = parseInt(req.params.id);

      // Delete the member (cascade deletion will handle relationships)
      await db.delete(familyMembers)
        .where(eq(familyMembers.id, memberId));

      res.json({ success: true, message: "Family member deleted successfully" });
    } catch (error) {
      console.error('Error deleting family member:', error);
      res.status(500).json({ message: "Failed to delete family member" });
    }
  });

  return httpServer;
}