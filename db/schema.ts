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
  fromMemberId: integer("from_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: 'cascade' }),
  toMemberId: integer("to_member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: 'cascade' }),
  relationType: text("relation_type").notNull(),
  createdAt: timestamp("created_at").default(sql`NOW()`),
}, (table) => ({
  uniqueRelation: uniqueIndex("unique_relation_idx").on(
    table.fromMemberId, 
    table.toMemberId,
    table.relationType
  ),
}));

// Define relations
export const familyMemberRelations = relations(familyMembers, ({ many }) => ({
  fromRelationships: many(relationships, {
    relationName: "fromMemberRelations",
    fields: [familyMembers.id],
    references: [relationships.fromMemberId],
  }),
}));

export const relationshipRelations = relations(relationships, ({ one }) => ({
  fromMember: one(familyMembers, {
    relationName: "fromMemberRelations",
    fields: [relationships.fromMemberId],
    references: [familyMembers.id],
  }),
  toMember: one(familyMembers, {
    relationName: "toMemberRelations",
    fields: [relationships.toMemberId],
    references: [familyMembers.id],
  }),
}));

// Export types and schemas
export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;

export const insertFamilyMemberSchema = createInsertSchema(familyMembers);
export const selectFamilyMemberSchema = createSelectSchema(familyMembers);