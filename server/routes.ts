import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { familyMembers, relationships, documents } from "@db/schema";
import { eq, and } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Family Members
  app.get("/api/family-members", async (req, res) => {
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
    res.json(members);
  });

  app.post("/api/family-members", async (req, res) => {
    const member = await db.insert(familyMembers).values(req.body).returning();
    res.json(member[0]);
  });

  app.put("/api/family-members/:id", async (req, res) => {
    const { id } = req.params;
    const member = await db
      .update(familyMembers)
      .set(req.body)
      .where(eq(familyMembers.id, parseInt(id)))
      .returning();
    res.json(member[0]);
  });

  app.delete("/api/family-members/:id", async (req, res) => {
    const { id } = req.params;
    await db.delete(familyMembers).where(eq(familyMembers.id, parseInt(id)));
    res.json({ success: true });
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
  app.post("/api/documents", async (req, res) => {
    const document = await db.insert(documents).values(req.body).returning();
    res.json(document[0]);
  });

  app.delete("/api/documents/:id", async (req, res) => {
    const { id } = req.params;
    await db.delete(documents).where(eq(documents.id, parseInt(id)));
    res.json({ success: true });
  });

  return httpServer;
}
