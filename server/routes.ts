import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { familyMembers, relationships, timelineEvents } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Add API prefix middleware to ensure all API routes are handled correctly
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Get all family members with relationships and timeline events
  app.get("/api/family-members", async (req, res) => {
    try {
      const members = await db.query.familyMembers.findMany({
        with: {
          fromRelationships: {
            with: {
              toMember: true
            }
          },
          timelineEvents: true
        },
        orderBy: [familyMembers.lastName, familyMembers.firstName]
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
      // Clear existing data
      await db.delete(timelineEvents);
      await db.delete(relationships);
      await db.delete(familyMembers);

      // Add sample family members
      const [grandfather] = await db.insert(familyMembers).values({
        firstName: "John",
        lastName: "Smith",
        gender: "male",
        birthDate: new Date("1940-03-15"),
        birthPlace: "London",
        bio: "Family patriarch",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const [grandmother] = await db.insert(familyMembers).values({
        firstName: "Mary",
        lastName: "Smith",
        gender: "female",
        birthDate: new Date("1942-06-20"),
        birthPlace: "Manchester",
        bio: "Family matriarch",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const [father] = await db.insert(familyMembers).values({
        firstName: "James",
        lastName: "Smith",
        gender: "male",
        birthDate: new Date("1965-09-10"),
        birthPlace: "Birmingham",
        bio: "Middle generation",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Add relationships
      await db.insert(relationships).values([
        {
          fromMemberId: grandfather.id,
          toMemberId: grandmother.id,
          relationType: "spouse",
          createdAt: new Date()
        },
        {
          fromMemberId: grandfather.id,
          toMemberId: father.id,
          relationType: "child",
          createdAt: new Date()
        },
        {
          fromMemberId: grandmother.id,
          toMemberId: grandfather.id,
          relationType: "spouse",
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
          toMemberId: grandfather.id,
          relationType: "parent",
          createdAt: new Date()
        },
        {
          fromMemberId: father.id,
          toMemberId: grandmother.id,
          relationType: "parent",
          createdAt: new Date()
        }
      ]);

      // Add timeline events
      await db.insert(timelineEvents).values([
        {
          familyMemberId: grandfather.id,
          title: "Graduated University",
          description: "Graduated from Oxford University with honors in Engineering",
          eventDate: new Date("1962-06-15"),
          location: "Oxford",
          eventType: "education",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          familyMemberId: grandfather.id,
          title: "Marriage",
          description: "Married Mary in a beautiful ceremony",
          eventDate: new Date("1964-08-20"),
          location: "London",
          eventType: "marriage",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          familyMemberId: grandmother.id,
          title: "Started Teaching Career",
          description: "Began teaching at London Primary School",
          eventDate: new Date("1963-09-01"),
          location: "London",
          eventType: "career",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          familyMemberId: father.id,
          title: "First Job",
          description: "Started working at Thames Engineering",
          eventDate: new Date("1987-07-01"),
          location: "London",
          eventType: "career",
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

  return httpServer;
}