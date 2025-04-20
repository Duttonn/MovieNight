import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { useMutation } from "convex/react";
import { api } from "./_generated/api";

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if username is taken
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", q => q.eq("username", args.username))
      .first();
    
    if (existing) {
      throw new Error("Username already taken");
    }

    // Check if email is taken
    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();
    
    if (existingEmail) {
      throw new Error("Email already registered");
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      username: args.username,
      name: args.username,
    });

    return userId;
  },
});

export const signIn = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Your sign-in logic here
    return null;
  },
});

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
