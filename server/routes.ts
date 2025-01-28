import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { familyMembers, relationships, timelineEvents } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Family Members
  app.get("/api/family-members", async (req, res) => {
    try {
      const members = await db.query.familyMembers.findMany({
        with: {
          relationships: {
            with: {
              toMember: true
            }
          },
          timelineEvents: true
        }
      });

      const formattedMembers = members.map(member => ({
        ...member,
        birthDate: member.birthDate?.toISOString() || null,
        deathDate: member.deathDate?.toISOString() || null,
        relationships: member.relationships?.map(rel => ({
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

  // Timeline Events
  app.get("/api/family-members/:id/timeline", async (req, res) => {
    try {
      const { id } = req.params;
      const events = await db.query.timelineEvents.findMany({
        where: eq(timelineEvents.familyMemberId, parseInt(id)),
        orderBy: [desc(timelineEvents.eventDate)]
      });

      const formattedEvents = events.map(event => ({
        ...event,
        eventDate: event.eventDate.toISOString(),
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString()
      }));

      res.json(formattedEvents);
    } catch (error) {
      console.error('Error fetching timeline events:', error);
      res.status(500).json({ message: "Failed to fetch timeline events" });
    }
  });

  return httpServer;
}