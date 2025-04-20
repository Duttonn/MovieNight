import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"]),

  movies: defineTable({
    title: v.string(),
    proposerId: v.id("users"),
    proposedAt: v.number(),
    proposalIntent: v.number(), // 1-4
    interestScore: v.optional(v.number()), // 1-4
    watched: v.boolean(),
    watchedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    personalRating: v.optional(v.number()), // Post-watch rating
    groupId: v.optional(v.id("groups")), // Optional for existing data
  })
    .index("by_proposer", ["proposerId"])
    .index("by_group_and_watched", ["groupId", "watched"])
    .index("by_watched_and_time", ["watched", "proposedAt"]),

  groups: defineTable({
    name: v.string(),
    members: v.array(v.id("users")),
    schedule: v.object({
      type: v.union(v.literal("recurring"), v.literal("oneoff")),
      day: v.optional(v.number()), // 0-6 for recurring
      time: v.string(), // HH:mm
      date: v.optional(v.number()), // timestamp for one-off
    }),
    currentProposerIndex: v.number(),
    lastMovieNight: v.optional(v.number()),
  }).index("by_members", ["members"]),

  friendRequests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
  })
    .index("by_to_user", ["toUserId", "status"])
    .index("by_from_user", ["fromUserId", "status"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
