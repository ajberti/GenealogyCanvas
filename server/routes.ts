import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { familyMembers, relationships, documents } from "@db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from 'express';

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

  return httpServer;
}