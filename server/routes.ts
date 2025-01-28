import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { familyMembers, relationships, timelineEvents, documents } from "@db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from 'express'; // Import express for static file serving

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

  // Handle document upload
  app.post("/api/documents", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { familyMemberId, title, documentType, description } = req.body;

      // Create the file URL
      const fileUrl = `/uploads/${req.file.filename}`;

      // Store document metadata in database
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

  // Add seed data endpoint
  app.post("/api/seed", async (req, res) => {
    try {
      // Clear existing data
      await db.delete(timelineEvents);
      await db.delete(relationships);
      await db.delete(familyMembers);
      await db.delete(documents); //added this line to delete documents as well

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