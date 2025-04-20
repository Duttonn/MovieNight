import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createGroup = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
    schedule: v.object({
      type: v.union(v.literal("recurring"), v.literal("oneoff")),
      day: v.optional(v.number()),
      time: v.string(),
      date: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Include the creator in members
    const members = [...new Set([userId, ...args.memberIds])];

    return await ctx.db.insert("groups", {
      name: args.name,
      members,
      schedule: args.schedule,
      currentProposerIndex: 0,
    });
  },
});

export const listMyGroups = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("groups")
      .withIndex("by_members", q => q.eq("members", [userId]))
      .collect();
  },
});

export const getNextMovieNight = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    const now = Date.now();
    let nextDate: number;

    if (group.schedule.type === "oneoff") {
      nextDate = group.schedule.date!;
    } else {
      // Calculate next occurrence of the scheduled day
      const today = new Date();
      const targetDay = group.schedule.day!;
      const daysUntilNext = (targetDay - today.getDay() + 7) % 7;
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + daysUntilNext);
      
      // Set the time
      const [hours, minutes] = group.schedule.time.split(':').map(Number);
      nextDay.setHours(hours, minutes, 0, 0);
      
      nextDate = nextDay.getTime();
    }

    // Get the current proposer
    const proposer = await ctx.db.get(group.members[group.currentProposerIndex]);

    return {
      date: nextDate,
      proposer,
    };
  },
});

export const updateMovieNight = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    // Update the proposer index
    const nextIndex = (group.currentProposerIndex + 1) % group.members.length;

    await ctx.db.patch(args.groupId, {
      currentProposerIndex: nextIndex,
      lastMovieNight: Date.now(),
    });
  },
});
