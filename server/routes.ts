import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { familyMembers, relationships, timelineEvents, documents } from "@db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from 'express';

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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
      cb(new Error('Invalid file type. Only .jpg, .jpeg, .png, .gif and .pdf files are accepted'));
    }
  }
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

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

  // Delete document endpoint
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);

      // Get the document to find its file path
      const [document] = await db.select().from(documents).where(eq(documents.id, documentId));

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Delete the physical file
      const filePath = path.join(process.cwd(), document.fileUrl.substring(1)); //remove leading /
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      await db.delete(documents).where(eq(documents.id, documentId));

      res.json({ success: true, message: "Document deleted successfully" });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  return httpServer;
}