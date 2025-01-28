import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { familyMembers, relationships } from "@db/schema";
import { eq } from "drizzle-orm";
import express from 'express';
import OpenAI from "openai";

const openai = new OpenAI();

interface RelationshipInput {
  relatedPersonId: string;
  relationType: 'parent' | 'child' | 'spouse';
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Family Members
  app.get("/api/family-members", async (req, res) => {
    try {
      const members = await db.query.familyMembers.findMany({
        with: {
          outgoingRelations: {
            with: {
              relatedPerson: true
            }
          }
        }
      });

      // Format dates safely
      const formattedMembers = members.map(member => ({
        ...member,
        birthDate: member.birthDate ? member.birthDate.toISOString() : null,
        deathDate: member.deathDate ? member.deathDate.toISOString() : null,
        relationships: member.outgoingRelations
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
      const [member] = await db.insert(familyMembers).values({
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        gender: memberData.gender,
        birthDate: memberData.birthDate ? new Date(memberData.birthDate) : null,
        deathDate: memberData.deathDate ? new Date(memberData.deathDate) : null,
        birthPlace: memberData.birthPlace,
        currentLocation: memberData.currentLocation,
        bio: memberData.bio,
      }).returning();

      // Add relationships if any
      if (relationshipData && relationshipData.length > 0) {
        const relationshipsToInsert = relationshipData.flatMap((rel: RelationshipInput) => {
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

      const newMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.id, member.id),
        with: {
          outgoingRelations: {
            with: {
              relatedPerson: true
            }
          }
        }
      });

      res.json({ ...newMember, relationships: newMember?.outgoingRelations });
    } catch (error) {
      console.error('Error creating family member:', error);
      res.status(500).json({ message: "Failed to create family member" });
    }
  });

  app.put("/api/family-members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { relationships: newRelationships, ...memberData } = req.body as {
        relationships: RelationshipInput[];
        [key: string]: any;
      };

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
        const hasDuplicates = newRelationships.some((rel: RelationshipInput) => {
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
          const relationshipsToInsert = newRelationships.flatMap((rel: RelationshipInput) => {
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
          outgoingRelations: {
            with: {
              relatedPerson: true
            }
          }
        }
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

      // Add relationships
      await db.insert(relationships).values([
        // Grandparents relationship
        { personId: grandfather.id, relatedPersonId: grandmother.id, relationType: "spouse" },
        { personId: grandmother.id, relatedPersonId: grandfather.id, relationType: "spouse" },

        // Father's relationships
        { personId: father.id, relatedPersonId: grandfather.id, relationType: "parent" },
        { personId: father.id, relatedPersonId: grandmother.id, relationType: "parent" },
        { personId: father.id, relatedPersonId: mother.id, relationType: "spouse" },

        // Reciprocal relationships
        { personId: grandfather.id, relatedPersonId: father.id, relationType: "child" },
        { personId: grandmother.id, relatedPersonId: father.id, relationType: "child" },
        { personId: mother.id, relatedPersonId: father.id, relationType: "spouse" },
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
          outgoingRelations: {
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
      const familyContext = member.outgoingRelations?.map(rel => {
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

  // Add static file serving for uploads
  app.use('/uploads', express.static('uploads'));

  return httpServer;
}