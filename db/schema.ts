import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
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
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`),
});

export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => familyMembers.id, { onDelete: 'cascade' }),
  relatedPersonId: integer("related_person_id").notNull().references(() => familyMembers.id, { onDelete: 'cascade' }),
  relationType: text("relation_type").notNull(),
  createdAt: timestamp("created_at").default(sql`NOW()`),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").notNull().references(() => familyMembers.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  documentType: text("document_type").notNull(),
  fileUrl: text("file_url").notNull(),
  description: text("description"),
  uploadDate: timestamp("upload_date").default(sql`NOW()`),
});

export const familyMemberRelations = relations(familyMembers, ({ many }) => ({
  relationships: many(relationships),
  documents: many(documents),
}));

export const relationshipRelations = relations(relationships, ({ one }) => ({
  person: one(familyMembers, {
    fields: [relationships.personId],
    references: [familyMembers.id],
  }),
  relatedPerson: one(familyMembers, {
    fields: [relationships.relatedPersonId],
    references: [familyMembers.id],
  }),
}));

export const documentRelations = relations(documents, ({ one }) => ({
  familyMember: one(familyMembers, {
    fields: [documents.familyMemberId],
    references: [familyMembers.id],
  }),
}));

export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type Document = typeof documents.$inferSelect;

export const insertFamilyMemberSchema = createInsertSchema(familyMembers);
export const selectFamilyMemberSchema = createSelectSchema(familyMembers);