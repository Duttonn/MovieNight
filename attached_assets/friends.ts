import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("users")
      .withIndex("by_username", q => q.gte("username", args.query))
      .filter(q => q.lt("username", args.query + "\uffff"))
      .take(5);
  },
});

export const sendFriendRequest = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const fromUserId = await getAuthUserId(ctx);
    if (!fromUserId) throw new Error("Not authenticated");

    // Find user by username
    const toUser = await ctx.db
      .query("users")
      .withIndex("by_username", q => q.eq("username", args.username))
      .first();
    
    if (!toUser) throw new Error("User not found");
    if (toUser._id === fromUserId) throw new Error("Cannot send friend request to yourself");

    // Check if request already exists
    const existing = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", q => q.eq("fromUserId", fromUserId))
      .filter(q => q.eq("status", "pending"))
      .first();
    
    if (existing) throw new Error("Friend request already exists");

    return await ctx.db.insert("friendRequests", {
      fromUserId,
      toUserId: toUser._id,
      status: "pending",
    });
  },
});

export const respondToFriendRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.toUserId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.requestId, {
      status: args.accept ? "accepted" : "rejected",
    });
  },
});

export const listFriends = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const accepted = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", q => q.eq("toUserId", userId))
      .filter(q => q.eq("status", "accepted"))
      .collect();

    const friendIds = accepted.map(req => req.fromUserId);
    return await Promise.all(
      friendIds.map(async (id) => await ctx.db.get(id))
    );
  },
});

export const listPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", q => q.eq("toUserId", userId))
      .filter(q => q.eq("status", "pending"))
      .collect();

    return await Promise.all(
      requests.map(async (req) => ({
        _id: req._id,
        from: await ctx.db.get(req.fromUserId),
      }))
    );
  },
});
