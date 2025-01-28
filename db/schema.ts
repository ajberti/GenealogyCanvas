import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gender: text("gender").notNull(),
  birthDate: timestamp("birth_date"),
  deathDate: timestamp("death_date"),
  birthPlace: text("birth_place"),
  currentLocation: text("current_location"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  fromMemberId: integer("from_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: 'cascade' }),
  toMemberId: integer("to_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: 'cascade' }),
  relationType: text("relation_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  location: text("location"),
  eventType: text("event_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  documentType: text("document_type").notNull(),
  fileUrl: text("file_url").notNull(),
  description: text("description"),
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
});

export const familyMemberRelations = relations(familyMembers, ({ many }) => ({
  fromRelationships: many(relationships),
  timelineEvents: many(timelineEvents),
  documents: many(documents),
}));

export const relationshipRelations = relations(relationships, ({ one }) => ({
  fromMember: one(familyMembers, {
    fields: [relationships.fromMemberId],
    references: [familyMembers.id],
  }),
  toMember: one(familyMembers, {
    fields: [relationships.toMemberId],
    references: [familyMembers.id],
  }),
}));

// Export types and schemas
export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export const insertFamilyMemberSchema = createInsertSchema(familyMembers);
export const selectFamilyMemberSchema = createSelectSchema(familyMembers);
export const insertTimelineEventSchema = createInsertSchema(timelineEvents);
export const selectTimelineEventSchema = createSelectSchema(timelineEvents);
export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);