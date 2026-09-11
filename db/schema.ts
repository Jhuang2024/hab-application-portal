import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
export const profiles = sqliteTable("profiles", {
    id: text("id").primaryKey(), email: text("email").notNull(), name: text("name").notNull(),
    organizer: integer("organizer").notNull().default(0), accountType: text("account_type"), createdAt: text("created_at").notNull()
});
export const applications = sqliteTable("applications", {
    id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => profiles.id),
    type: text("type", { enum: ["hacker", "judge", "mentor", "volunteer"] }).notNull(), status: text("status").notNull().default("draft"),
    name: text("name").notNull(), school: text("school").notNull().default(""), skills: text("skills").notNull().default(""),
    motivation: text("motivation").notNull().default(""), experience: text("experience").notNull().default(""),
    availability: text("availability").notNull().default(""), detailsJson: text("details_json").notNull().default("{}"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
    submittedAt: text("submitted_at"), version: integer("version").notNull().default(1)
}, t => [uniqueIndex("applications_user_type").on(t.userId, t.type), index("applications_status_updated").on(t.status, t.updatedAt)]);
export const reviews = sqliteTable("reviews", {
    id: text("id").primaryKey(), applicationId: text("application_id").notNull().references(() => applications.id), reviewerId: text("reviewer_id").notNull().references(() => profiles.id),
    motivation: integer("motivation").notNull(), experience: integer("experience").notNull(), contribution: integer("contribution").notNull(),
    notes: text("notes").notNull(), updatedAt: text("updated_at").notNull()
}, t => [uniqueIndex("reviews_application_reviewer").on(t.applicationId, t.reviewerId)]);
export const events = sqliteTable("events", {
    id: text("id").primaryKey(), applicationId: text("application_id").notNull().references(() => applications.id), actorId: text("actor_id").notNull().references(() => profiles.id),
    status: text("status").notNull(), createdAt: text("created_at").notNull()
}, t => [index("events_application_created").on(t.applicationId, t.createdAt)]);
