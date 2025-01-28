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
  createdAt: timestamp("created_at").default(sql`NOW()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`NOW()`).notNull(),
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
  createdAt: timestamp("created_at").default(sql`NOW()`).notNull(),
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
  createdAt: timestamp("created_at").default(sql`NOW()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`NOW()`).notNull(),
});

// Define relations with explicit fields
export const familyMemberRelations = relations(familyMembers, ({ many }) => ({
  relationships: many(relationships, { fields: [familyMembers.id], references: [relationships.fromMemberId] }),
  timelineEvents: many(timelineEvents, { fields: [familyMembers.id], references: [timelineEvents.familyMemberId] }),
}));

export const relationshipRelations = relations(relationships, ({ one }) => ({
  fromMember: one(familyMembers, { fields: [relationships.fromMemberId], references: [familyMembers.id] }),
  toMember: one(familyMembers, { fields: [relationships.toMemberId], references: [familyMembers.id] }),
}));

export const timelineEventRelations = relations(timelineEvents, ({ one }) => ({
  familyMember: one(familyMembers, { fields: [timelineEvents.familyMemberId], references: [familyMembers.id] }),
}));

// Export types and schemas
export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;

export const insertFamilyMemberSchema = createInsertSchema(familyMembers);
export const selectFamilyMemberSchema = createSelectSchema(familyMembers);
export const insertTimelineEventSchema = createInsertSchema(timelineEvents);
export const selectTimelineEventSchema = createSelectSchema(timelineEvents);