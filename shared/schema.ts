import { integer, text, sqliteTable, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  name: text("name"),
  avatar: text("avatar"),
  passwordHash: text("password_hash").notNull(),
  email: text("email").unique(), // Added email field based on storage usage
});

export const usersRelations = relations(users, ({ many }) => ({
  moviesProposed: many(movies, { relationName: "proposer" }),
  groupMemberships: many(groupMembers),
  friendRequestsSent: many(friendRequests, { relationName: "sender" }),
  friendRequestsReceived: many(friendRequests, { relationName: "receiver" }),
  friends: many(friends, { relationName: "user" }),
  friendsOf: many(friends, { relationName: "friend" }),
}));

// Movies Table
export const movies = sqliteTable("movies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  tmdbId: integer("tmdb_id"), // Added from previous step
  posterPath: text("poster_path"), // Added from previous step
  proposerId: integer("proposer_id")
    .notNull()
    .references(() => users.id),
  proposedAt: integer("proposed_at", { mode: "timestamp" }) // Use integer for SQLite timestamp
    .notNull()
    .$defaultFn(() => new Date()),
  proposalIntent: integer("proposal_intent").notNull(), // 1-4
  interestScore: integer("interest_score"), // 1-4
  watched: integer("watched", { mode: "boolean" }).default(false),
  watchedAt: integer("watched_at", { mode: "timestamp" }), // Use integer for SQLite timestamp
  notes: text("notes"),
  personalRating: integer("personal_rating"),
  groupId: integer("group_id").references(() => groups.id),
});

export const moviesRelations = relations(movies, ({ one }) => ({
  proposer: one(users, {
    fields: [movies.proposerId],
    references: [users.id],
    relationName: "proposer",
  }),
  group: one(groups, {
    fields: [movies.groupId],
    references: [groups.id],
  }),
}));

// Groups Table
export const groups = sqliteTable("groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  scheduleType: text("schedule_type", { enum: ["recurring", "oneoff"] }).notNull(),
  scheduleDay: integer("schedule_day"), // 0-6 for Sunday-Saturday
  scheduleTime: text("schedule_time"), // HH:MM format
  scheduleDate: integer("schedule_date", { mode: "timestamp" }), // Use integer for SQLite timestamp
  currentProposerIndex: integer("current_proposer_index").default(0),
  lastMovieNight: integer("last_movie_night", { mode: "timestamp" }), // Use integer for SQLite timestamp
});

export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  movies: many(movies),
}));

// Group Members Table (Junction Table)
export const groupMembers = sqliteTable(
  "group_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }), // Added primary key
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
  },
  // (t) => ({
  //   pk: primaryKey({ columns: [t.groupId, t.userId] }), // Composite key might be better if IDs are unique
  // })
);

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

// Friend Requests Table
export const friendRequests = sqliteTable("friend_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromUserId: integer("from_user_id")
    .notNull()
    .references(() => users.id),
  toUserId: integer("to_user_id")
    .notNull()
    .references(() => users.id),
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }) // Use integer for SQLite timestamp
    .notNull()
    .$defaultFn(() => new Date()),
});

export const friendRequestsRelations = relations(friendRequests, ({ one }) => ({
  sender: one(users, {
    fields: [friendRequests.fromUserId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [friendRequests.toUserId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

// Friends Table (Junction Table)
export const friends = sqliteTable(
  "friends",
  {
    id: integer("id").primaryKey({ autoIncrement: true }), // Added primary key
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    friendId: integer("friend_id")
      .notNull()
      .references(() => users.id),
  },
  // (t) => ({
  //   pk: primaryKey({ columns: [t.userId, t.friendId] }), // Composite key might be better
  // })
);

export const friendsRelations = relations(friends, ({ one }) => ({
  user: one(users, {
    fields: [friends.userId],
    references: [users.id],
    relationName: "user",
  }),
  friend: one(users, {
    fields: [friends.friendId],
    references: [users.id],
    relationName: "friend",
  }),
}));

// Zod Schemas for Validation
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters"),
  passwordHash: z.string(), // Handled separately during registration/login
  email: z.string().email("Invalid email address").optional(), // Make email optional or required as needed
}).omit({ id: true });

export const insertMovieSchema = createInsertSchema(movies, {
  title: z.string().min(1, "Title is required"),
  proposalIntent: z.number().min(1).max(4),
  groupId: z.number().positive("Group selection is required"),
  tmdbId: z.number().optional(),
  posterPath: z.string().optional(),
}).omit({
  id: true,
  proposedAt: true,
  watched: true,
  watchedAt: true,
  interestScore: true, // Interest is set via rating, not initial proposal
});

export const insertGroupSchema = createInsertSchema(groups, {
  name: z.string().min(1, "Group name is required"),
  scheduleType: z.enum(["recurring", "oneoff"]),
  scheduleDay: z.number().min(0).max(6).optional(),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)").optional(),
  scheduleDate: z.date().optional(),
}).omit({ id: true, currentProposerIndex: true, lastMovieNight: true });

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true });
export const insertFriendRequestSchema = createInsertSchema(friendRequests).omit({ id: true, status: true, createdAt: true });
export const insertFriendSchema = createInsertSchema(friends).omit({ id: true });

// Select Schemas (if needed, often inferred or defined per query)
export const selectUserSchema = createSelectSchema(users);
export const selectMovieSchema = createSelectSchema(movies);
export const selectGroupSchema = createSelectSchema(groups);
// ... add others if needed

// Export types for convenience (Drizzle infers these too)
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Movie = typeof movies.$inferSelect;
export type InsertMovie = typeof movies.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;
export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = typeof friendRequests.$inferInsert;
export type Friend = typeof friends.$inferSelect;
export type InsertFriend = typeof friends.$inferInsert;
