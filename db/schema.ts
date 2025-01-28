import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
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
}, (table) => ({
  uniqueIdx: uniqueIndex("unique_relationship_idx").on(table.personId, table.relatedPersonId, table.relationType),
  selfRelationCheck: sql`CONSTRAINT prevent_self_relation CHECK ((person_id <> related_person_id) IS TRUE)`,
}));

// Define relations
export const familyMembersRelations = relations(familyMembers, ({ many }) => ({
  outgoingRelations: many(relationships, {
    fields: [familyMembers.id],
    references: [relationships.personId],
  }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  person: one(familyMembers, {
    fields: [relationships.personId],
    references: [familyMembers.id],
  }),
  relatedPerson: one(familyMembers, {
    fields: [relationships.relatedPersonId],
    references: [familyMembers.id],
  }),
}));

// Export types and schemas
export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;

export const insertFamilyMemberSchema = createInsertSchema(familyMembers);
export const selectFamilyMemberSchema = createSelectSchema(familyMembers);