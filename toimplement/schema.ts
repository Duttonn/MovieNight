import { pgTable, text, serial, integer, timestamp, doublePrecision, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (extending the existing one)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarInitials: text("avatar_initials"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  avatarInitials: true,
  email: true,
});

// Friend requests
export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, declined
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFriendRequestSchema = createInsertSchema(friendRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Friend groups (for movie nights)
export const movieGroups = pgTable("movie_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  creatorId: integer("creator_id").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMovieGroupSchema = createInsertSchema(movieGroups).omit({
  id: true,
  createdAt: true,
});

// Group members
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joinedAt: true,
});

// Movie schema
export const movies = pgTable("movies", {
  id: serial("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull().unique(),
  title: text("title").notNull(),
  overview: text("overview"),
  posterPath: text("poster_path"),
  backdropPath: text("backdrop_path"),
  releaseDate: text("release_date"),
  runtime: integer("runtime"),
  genres: text("genres").array(),
});

export const insertMovieSchema = createInsertSchema(movies).omit({
  id: true,
});

// Movie night schema
export const movieNights = pgTable("movie_nights", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  location: text("location"),
  hostId: integer("host_id").notNull(),
  status: text("status").notNull().default("planning"), // planning, confirmed, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMovieNightSchema = createInsertSchema(movieNights).omit({
  id: true,
  createdAt: true,
});

// Movie night attendees
export const movieNightAttendees = pgTable("movie_night_attendees", {
  id: serial("id").primaryKey(),
  movieNightId: integer("movie_night_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, declined
});

export const insertMovieNightAttendeeSchema = createInsertSchema(movieNightAttendees).omit({
  id: true,
});

// Movie night movies
export const movieNightMovies = pgTable("movie_night_movies", {
  id: serial("id").primaryKey(),
  movieNightId: integer("movie_night_id").notNull(),
  movieId: integer("movie_id").notNull(),
  order: integer("order").default(0),
});

export const insertMovieNightMovieSchema = createInsertSchema(movieNightMovies).omit({
  id: true,
});

// Movie ratings
export const movieRatings = pgTable("movie_ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  movieId: integer("movie_id").notNull(),
  rating: doublePrecision("rating").notNull(), // 0.5 to 5.0
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMovieRatingSchema = createInsertSchema(movieRatings).omit({
  id: true,
  createdAt: true,
});

// Watchlist
export const watchlistItems = pgTable("watchlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  movieId: integer("movie_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertWatchlistItemSchema = createInsertSchema(watchlistItems).omit({
  id: true,
  addedAt: true,
});

// Movie suggestions (with intent level from proposer)
export const movieSuggestions = pgTable("movie_suggestions", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  movieId: integer("movie_id").notNull(),
  proposerId: integer("proposer_id").notNull(),
  proposalIntent: integer("proposal_intent").notNull(), // 1-4 scale
  notes: text("notes"),
  isWatched: boolean("is_watched").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMovieSuggestionSchema = createInsertSchema(movieSuggestions).omit({
  id: true,
  createdAt: true,
});

// Interest ratings from other group members
export const suggestionInterests = pgTable("suggestion_interests", {
  id: serial("id").primaryKey(),
  suggestionId: integer("suggestion_id").notNull(),
  userId: integer("user_id").notNull(),
  interestLevel: integer("interest_level").notNull(), // 1-4 scale
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSuggestionInterestSchema = createInsertSchema(suggestionInterests).omit({
  id: true,
  createdAt: true,
});

// Weekly movie selection
export const weeklyMovieSelections = pgTable("weekly_movie_selections", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  suggestionId: integer("suggestion_id").notNull(),
  weekOf: timestamp("week_of").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  turnUserId: integer("turn_user_id").notNull(), // Whose turn it was
  combinedScore: doublePrecision("combined_score"), // Calculated score
  status: text("status").notNull().default("scheduled"), // scheduled, watched, skipped
  feedback: text("feedback"), // Post-watching feedback
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWeeklyMovieSelectionSchema = createInsertSchema(weeklyMovieSelections).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;

export type MovieGroup = typeof movieGroups.$inferSelect;
export type InsertMovieGroup = z.infer<typeof insertMovieGroupSchema>;

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;

export type Movie = typeof movies.$inferSelect;
export type InsertMovie = z.infer<typeof insertMovieSchema>;

export type MovieNight = typeof movieNights.$inferSelect;
export type InsertMovieNight = z.infer<typeof insertMovieNightSchema>;

export type MovieNightAttendee = typeof movieNightAttendees.$inferSelect;
export type InsertMovieNightAttendee = z.infer<typeof insertMovieNightAttendeeSchema>;

export type MovieNightMovie = typeof movieNightMovies.$inferSelect;
export type InsertMovieNightMovie = z.infer<typeof insertMovieNightMovieSchema>;

export type MovieRating = typeof movieRatings.$inferSelect;
export type InsertMovieRating = z.infer<typeof insertMovieRatingSchema>;

export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistItemSchema>;

export type MovieSuggestion = typeof movieSuggestions.$inferSelect;
export type InsertMovieSuggestion = z.infer<typeof insertMovieSuggestionSchema>;

export type SuggestionInterest = typeof suggestionInterests.$inferSelect;
export type InsertSuggestionInterest = z.infer<typeof insertSuggestionInterestSchema>;

export type WeeklyMovieSelection = typeof weeklyMovieSelections.$inferSelect;
export type InsertWeeklyMovieSelection = z.infer<typeof insertWeeklyMovieSelectionSchema>;
