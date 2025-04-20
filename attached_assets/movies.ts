import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function calculateMovieScore(movie: {
  proposalIntent: number;
  interestScore?: number;
}) {
  if (!movie.interestScore) return 0;
  
  // Base score is the product
  let score = movie.proposalIntent * movie.interestScore;
  
  // Bonus for high match (both 4)
  if (movie.proposalIntent === 4 && movie.interestScore === 4) {
    score += 4;
  }
  
  // Penalty for very low interest
  if (movie.interestScore === 1) {
    score -= 8;
  }
  
  return score;
}

export const proposeMovie = mutation({
  args: {
    title: v.string(),
    proposalIntent: v.number(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("movies", {
      title: args.title,
      proposerId: userId,
      proposalIntent: args.proposalIntent,
      proposedAt: Date.now(),
      watched: false,
      groupId: args.groupId,
    });
  },
});

export const rateMovie = mutation({
  args: {
    movieId: v.id("movies"),
    interestScore: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.movieId, {
      interestScore: args.interestScore,
    });
  },
});

export const markWatched = mutation({
  args: {
    movieId: v.id("movies"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.movieId, {
      watched: true,
      watchedAt: Date.now(),
      notes: args.notes,
    });
  },
});

export const listMovies = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("movies")
      .withIndex("by_watched_and_time", (q) => q.eq("watched", false))
      .order("desc")
      .collect();
  },
});

export const getWeeklyPick = query({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db
      .query("movies")
      .withIndex("by_watched_and_time", (q) => q.eq("watched", false))
      .collect();

    // Filter for movies with both scores
    const scoredMovies = movies.filter((m) => m.interestScore !== undefined);
    
    if (scoredMovies.length === 0) return null;

    // Calculate weighted scores
    const withScores = scoredMovies.map(movie => ({
      movie,
      score: calculateMovieScore(movie)
    }));

    // Sort by score
    withScores.sort((a, b) => b.score - a.score);
    
    return withScores[0]?.movie ?? null;
  },
});
