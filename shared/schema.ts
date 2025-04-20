import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatar: text("avatar")
});

export const movies = pgTable("movies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  proposerId: integer("proposer_id").notNull().references(() => users.id),
  proposedAt: timestamp("proposed_at").notNull().defaultNow(),
  proposalIntent: integer("proposal_intent").notNull(), // 1-4
  interestScore: integer("interest_score"),  // 1-4
  watched: boolean("watched").notNull().default(false),
  watchedAt: timestamp("watched_at"),
  notes: text("notes"),
  personalRating: integer("personal_rating"), // Post-watch rating
  groupId: integer("group_id").references(() => groups.id)
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scheduleType: text("schedule_type").notNull(), // "recurring" or "oneoff"
  scheduleDay: integer("schedule_day"), // 0-6 for recurring
  scheduleTime: text("schedule_time").notNull(), // HH:mm
  scheduleDate: timestamp("schedule_date"), // timestamp for one-off
  currentProposerIndex: integer("current_proposer_index").notNull().default(0),
  lastMovieNight: timestamp("last_movie_night")
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(), 
  groupId: integer("group_id").notNull().references(() => groups.id),
  userId: integer("user_id").notNull().references(() => users.id)
});

export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "rejected"
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  friendId: integer("friend_id").notNull().references(() => users.id)
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertMovieSchema = createInsertSchema(movies).omit({ id: true, proposedAt: true, watched: true, watchedAt: true, personalRating: true });
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, currentProposerIndex: true, lastMovieNight: true });
export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true });
export const insertFriendRequestSchema = createInsertSchema(friendRequests).omit({ id: true, status: true, createdAt: true });
export const insertFriendSchema = createInsertSchema(friends).omit({ id: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type Movie = typeof movies.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;

export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;
export type FriendRequest = typeof friendRequests.$inferSelect;

export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Friend = typeof friends.$inferSelect;
