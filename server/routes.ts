import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from 'bcrypt'; // Import bcrypt
import * as schema from '@shared/schema'; // Import schema namespace
import { eq } from 'drizzle-orm'; // Import eq
import { 
  insertMovieSchema, 
  insertGroupSchema,
  insertGroupMemberSchema,
  insertFriendRequestSchema,
  type InsertMovie,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);
  
  // Simple authentication endpoint - just requires username
  app.post("/api/simple-auth", async (req, res, next) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      // Check if user already exists
      let existingUser = await storage.getUserByUsername(username);
      
      // If user doesn't exist, create a new one with basic info
      if (!existingUser) {
        // Create a random password and hash it
        const tempPassword = Math.random().toString(36).slice(2);
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
        
        existingUser = await storage.createUser({
          username,
          passwordHash, // Use the hashed password
          email: `${username}@example.com`, // Consider making email optional or null if not provided
          name: null,
          avatar: null
        });
      }
      
      // Log the user in (Passport handles session)
      req.login(existingUser, (err) => {
        if (err) return next(err);
        // Return safe user data (omit passwordHash)
        const { passwordHash, ...safeUser } = existingUser!;
        res.status(200).json(safeUser);
      });
    } catch (error) {
      next(error);
    }
  });

  // Movies API
  app.get("/api/movies", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      // Pass the user ID to filter movies based on friends and groups
      const movies = await storage.getUnwatchedMovies(req.user.id);
      
      // Get proposer details for each movie
      const moviesWithProposers = await Promise.all(
        movies.map(async (movie) => {
          const proposer = await storage.getUser(movie.proposerId);
          return {
            ...movie,
            proposer: proposer ? {
              id: proposer.id,
              username: proposer.username,
              name: proposer.name,
              avatar: proposer.avatar
            } : null
          };
        })
      );
      
      res.json(moviesWithProposers);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/movies", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Prepare data including proposerId, tmdbId, and posterPath if provided
      const requestData: Partial<InsertMovie> & { title: string; groupId: number; proposalIntent: number } = {
        ...req.body,
        proposerId: userId,
        // tmdbId and posterPath will be included from req.body if present
      };
      
      // Validate against the schema (which now includes tmdbId and posterPath)
      const movieData = insertMovieSchema.parse(requestData);
      const movie = await storage.createMovie(movieData);
      
      res.status(201).json(movie);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/movies/:id/rate", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { id } = req.params;
      const { interestScore } = req.body;
      
      const validationSchema = z.object({
        interestScore: z.number().min(1).max(4)
      });
      
      validationSchema.parse({ interestScore });
      
      const movie = await storage.getMovie(Number(id));
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      const updatedMovie = await storage.updateMovie(Number(id), { interestScore });
      res.json(updatedMovie);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/movies/:id/watch", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { id } = req.params;
      const { notes, personalRating } = req.body; // Optional fields from dialog
      
      const movie = await storage.getMovie(Number(id));
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      // Check if user is part of the group the movie belongs to
      if (movie.groupId) {
        const members = await storage.getGroupMembers(movie.groupId);
        if (!members.some((m: { userId: number }) => m.userId === req.user.id)) {
          return res.status(403).json({ message: "User not in group" });
        }
      }

      const updatedMovie = await storage.updateMovie(Number(id), {
        watched: true,
        watchedAt: new Date(),
        notes: notes,
        personalRating: personalRating
      });

      // Handle proposer rotation and movie transition
      if (movie.groupId) {
        const group = await storage.getGroup(movie.groupId);
        if (group) {
          const groupMembers = await storage.getGroupMembers(group.id);
          const memberCount = groupMembers.length;
          
          if (memberCount > 0) {
            // Get current proposer ID
            const currentProposerIndex = group.currentProposerIndex;
            const currentProposerId = groupMembers[currentProposerIndex]?.userId;
            
            // Calculate next proposer index and ID
            const nextIndex = (currentProposerIndex + 1) % memberCount;
            const nextProposerId = groupMembers[nextIndex]?.userId;
            
            if (currentProposerId && nextProposerId) {
              console.log(`Rotating from proposer ${currentProposerId} to ${nextProposerId}`);
              
              // 1. Get all movies for the group
              const groupMovies = await storage.getMoviesByGroup(movie.groupId);
              const unwatchedMovies = groupMovies.filter(m => !m.watched);
              
              // 2. Delete all unwatched movies from current proposer
              const currentProposerUnwatchedMovies = unwatchedMovies.filter(
                m => m.proposerId === currentProposerId
              );
              
              for (const movieToDelete of currentProposerUnwatchedMovies) {
                console.log(`Removing movie ${movieToDelete.id} "${movieToDelete.title}" from previous proposer's list`);
                await storage.deleteMovie(movieToDelete.id);
              }
            }
            
            // Update the group with new proposer index and clear decided movie
            await storage.updateGroup(group.id, {
              currentProposerIndex: nextIndex,
              lastMovieNight: new Date(),
              decidedMovieId: null, // Clear the decided movie
            });
          }
        }
      }

      res.json(updatedMovie);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/movies/top-pick", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      // Get unwatched movies filtered by the user's friends and groups
      const movies = await storage.getUnwatchedMovies(req.user.id);
      
      // Filter for movies with both scores
      const scoredMovies = movies.filter((m) => m.interestScore !== undefined);
      if (scoredMovies.length === 0) return res.json(null);

      // Calculate weighted scores
      const withScores = scoredMovies.map(movie => {
        // Base score is the product
        let score = movie.proposalIntent * (movie.interestScore || 0);
        
        // Bonus for high match (both 4)
        if (movie.proposalIntent === 4 && movie.interestScore === 4) {
          score += 4;
        }
        
        // Penalty for very low interest
        if (movie.interestScore === 1) {
          score -= 8;
        }
        
        return {
          movie,
          score
        };
      });

      // Sort by score
      withScores.sort((a, b) => b.score - a.score);
      
      const topMovie = withScores[0]?.movie;
      if (!topMovie) return res.json(null);
      
      // Get proposer details
      const proposer = await storage.getUser(topMovie.proposerId);
      const result = {
        ...topMovie,
        proposer: proposer ? {
          id: proposer.id,
          username: proposer.username,
          name: proposer.name,
          avatar: proposer.avatar
        } : null
      };
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
  
  // DELETE endpoint for removing a movie
  app.delete("/api/movies/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const movieId = Number(req.params.id);
      const movie = await storage.getMovie(movieId);
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      // Check if the user is the proposer of the movie
      if (movie.proposerId !== req.user.id) {
        return res.status(403).json({ message: "Only the proposer can delete this movie" });
      }
      
      // Prevent deletion of watched movies
      if (movie.watched) {
        return res.status(400).json({ message: "Cannot delete movies that have been watched" });
      }
      
      // If this is the decided movie for a group, clear that reference first
      if (movie.groupId) {
        const group = await storage.getGroup(movie.groupId);
        if (group && group.decidedMovieId === movie.id) {
          await storage.updateGroup(movie.groupId, { decidedMovieId: null });
        }
      }
      
      // Delete the movie
      await storage.deleteMovie(movieId);
      res.status(204).send(); // No content response on successful deletion
    } catch (error) {
      next(error);
    }
  });

  // Groups API
  app.get("/api/groups", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const groups = await storage.getGroupsByUser(req.user.id);
      
      // Add members to each group
      const groupsWithMembers = await Promise.all(
        groups.map(async (group) => {
          const groupMembers = await storage.getGroupMembers(group.id);
          const members = await Promise.all(
            groupMembers.map(async (member) => {
              const user = await storage.getUser(member.userId);
              return user ? {
                id: user.id,
                username: user.username,
                name: user.name,
                avatar: user.avatar
              } : null;
            })
          );
          
          return {
            ...group,
            members: members.filter(Boolean)
          };
        })
      );
      
      res.json(groupsWithMembers);
    } catch (error) {
      next(error);
    }
  });

  // Add endpoint for fetching a single group by ID (Modified to include decidedMovie)
  app.get("/api/groups/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { id } = req.params;
      const groupId = Number(id);
      
      // Use a single query to get group and related data
      const result = await storage.db.query.groups.findFirst({
        where: eq(schema.groups.id, groupId), // Used schema.groups.id
        with: {
          members: {
            with: {
              user: true // Fetch user details for each member
            }
          },
          decidedMovie: { // Fetch the decided movie details
            with: {
              proposer: true // Include proposer details for the decided movie
            }
          }
        }
      });

      if (!result) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if the requesting user is a member of the group
      const isMember = result.members.some((m: { userId: number }) => m.userId === req.user.id); // Added type for m
      if (!isMember) {
        return res.status(403).json({ message: "User not authorized for this group" });
      }

      // Format the response to match expected frontend structure
      const formattedGroup = {
        ...result,
        members: result.members.map((m: { user: schema.User }) => ({ // Added type for m
          id: m.user.id,
          username: m.user.username,
          name: m.user.name,
          avatar: m.user.avatar
        })),
        // Add posterUrl to decidedMovie if it exists
        decidedMovie: result.decidedMovie ? {
          ...result.decidedMovie,
          posterUrl: result.decidedMovie.posterPath ? `https://image.tmdb.org/t/p/w500${result.decidedMovie.posterPath}` : null,
          // Format proposer for decided movie
          proposer: result.decidedMovie.proposer ? {
            id: result.decidedMovie.proposer.id,
            username: result.decidedMovie.proposer.username,
            name: result.decidedMovie.proposer.name,
            avatar: result.decidedMovie.proposer.avatar
          } : undefined
        } : null
      };

      res.json(formattedGroup);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/groups", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      // Handle date conversion if scheduleDate is a string
      const requestData = { ...req.body };
      if (typeof requestData.scheduleDate === 'string' && requestData.scheduleDate) {
        requestData.scheduleDate = new Date(requestData.scheduleDate);
      }
      
      const groupData = insertGroupSchema.parse(requestData);
      const memberIds = req.body.memberIds || [];
      
      // Create the group
      const group = await storage.createGroup(groupData);
      
      // Add the creator as a member
      await storage.addUserToGroup({
        groupId: group.id,
        userId: req.user.id
      });
      
      // Add other members
      for (const memberId of memberIds) {
        await storage.addUserToGroup({
          groupId: group.id,
          userId: memberId
        });
      }
      
      // Get group with members
      const groupMembers = await storage.getGroupMembers(group.id);
      const members = await Promise.all(
        groupMembers.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return user ? {
            id: user.id,
            username: user.username,
            name: user.name,
            avatar: user.avatar
          } : null;
        })
      );
      
      res.status(201).json({
        ...group,
        members: members.filter(Boolean)
      });
    } catch (error) {
      next(error);
    }
  });

  // Add PATCH endpoint for updating groups
  app.patch("/api/groups/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { id } = req.params;
      const groupId = Number(id);
      const { memberIds, ...groupData } = req.body;
      
      // Check if group exists
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Update group metadata (name, schedule, etc.)
      const updatedGroup = await storage.updateGroup(groupId, groupData);
      
      // If memberIds are provided, update the group membership
      if (memberIds && Array.isArray(memberIds)) {
        // Always include the current user (group owner/creator)
        const updatedMemberIds = [...new Set([req.user.id, ...memberIds])];
        
        // Get current group members
        const currentMembers = await storage.getGroupMembers(groupId);
        const currentMemberIds = currentMembers.map(member => member.userId);
        
        // Find members to remove (in currentMemberIds but not in updatedMemberIds)
        const membersToRemove = currentMemberIds.filter(
          userId => userId !== req.user.id && !updatedMemberIds.includes(userId)
        );
        
        // Find members to add (in updatedMemberIds but not in currentMemberIds)
        const membersToAdd = updatedMemberIds.filter(
          userId => !currentMemberIds.includes(userId)
        );
        
        // Remove members - Note the order of parameters matches the storage implementation
        for (const userId of membersToRemove) {
          await storage.removeUserFromGroup(groupId, userId);
        }
        
        // Add new members
        for (const userId of membersToAdd) {
          await storage.addUserToGroup({
            groupId,
            userId
          });
        }
      }
      
      // Get updated group with members
      const groupMembers = await storage.getGroupMembers(groupId);
      const members = await Promise.all(
        groupMembers.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return user ? {
            id: user.id,
            username: user.username,
            name: user.name,
            avatar: user.avatar
          } : null;
        })
      );
      
      res.json({
        ...updatedGroup,
        members: members.filter(Boolean)
      });
    } catch (error) {
      next(error);
    }
  });

  // NEW: Endpoint to set the decided movie for a group
  app.patch("/api/groups/:id/decide", async (req, res, next) => {
    console.log(`[PATCH /api/groups/${req.params.id}/decide] Received request`); // Log entry
    try {
      if (!req.isAuthenticated()) {
        console.log(`[PATCH /api/groups/${req.params.id}/decide] Authentication failed`);
        return res.status(401).json({ message: "Not authenticated" });
      }

      const groupId = Number(req.params.id);
      const { movieId } = req.body;
      console.log(`[PATCH /api/groups/${groupId}/decide] Request body:`, req.body); // Log body

      if (movieId === undefined) { 
        console.log(`[PATCH /api/groups/${groupId}/decide] movieId is undefined`);
        return res.status(400).json({ message: "movieId is required" });
      }

      // Validate movieId (optional: check if movie exists and belongs to group)
      if (movieId !== null) {
        console.log(`[PATCH /api/groups/${groupId}/decide] Validating movieId: ${movieId}`);
        const movie = await storage.getMovie(Number(movieId));
        if (!movie) {
          console.log(`[PATCH /api/groups/${groupId}/decide] Movie ${movieId} not found`);
          return res.status(400).json({ message: "Invalid movie ID" });
        }
        if (movie.groupId !== groupId) {
          console.log(`[PATCH /api/groups/${groupId}/decide] Movie ${movieId} does not belong to group ${groupId}`);
          return res.status(400).json({ message: "Movie does not belong to this group" });
        }
        console.log(`[PATCH /api/groups/${groupId}/decide] Movie ${movieId} validation passed`);
      }

      // Check if user is a member of the group
      console.log(`[PATCH /api/groups/${groupId}/decide] Checking group membership for user ${req.user.id}`);
      const group = await storage.getGroup(groupId);
      if (!group) {
        console.log(`[PATCH /api/groups/${groupId}/decide] Group ${groupId} not found`);
        return res.status(404).json({ message: "Group not found" });
      }
      const members = await storage.getGroupMembers(groupId);
      if (!members.some((m: { userId: number }) => m.userId === req.user.id)) { 
        console.log(`[PATCH /api/groups/${groupId}/decide] User ${req.user.id} is not a member`);
        return res.status(403).json({ message: "User not authorized for this group" });
      }
      console.log(`[PATCH /api/groups/${groupId}/decide] User ${req.user.id} membership confirmed`);

      // Update the group with the decided movie ID
      const updatePayload = { decidedMovieId: movieId === null ? null : Number(movieId) };
      console.log(`[PATCH /api/groups/${groupId}/decide] Updating group with payload:`, updatePayload);
      const updatedGroup = await storage.updateGroup(groupId, updatePayload);
      console.log(`[PATCH /api/groups/${groupId}/decide] Group updated successfully:`, updatedGroup);

      res.json(updatedGroup);
    } catch (error) {
      console.error(`[PATCH /api/groups/${req.params.id}/decide] Error:`, error); // Log error
      next(error);
    }
  });

  // Friends API
  app.get("/api/friends", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const friends = await storage.getFriends(req.user.id);
      // Remove sensitive data
      const safeUsers = friends.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.avatar
      }));
      
      res.json(safeUsers);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/friends/requests", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const requests = await storage.getPendingFriendRequests(req.user.id);
      
      // Get sender details for each request
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          const sender = await storage.getUser(request.fromUserId);
          return {
            id: request.id,
            from: sender ? {
              id: sender.id,
              username: sender.username,
              name: sender.name,
              avatar: sender.avatar
            } : null,
            createdAt: request.createdAt
          };
        })
      );
      
      res.json(requestsWithDetails);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/friends/requests", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { username } = req.body;
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Can't send request to self
      if (user.id === req.user.id) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
      }
      
      // Create the friend request
      const friendRequest = await storage.createFriendRequest({
        fromUserId: req.user.id,
        toUserId: user.id
      });
      
      res.status(201).json(friendRequest);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/friends/requests/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { id } = req.params;
      const { accept } = req.body;
      
      const request = await storage.getFriendRequestById(Number(id));
      if (!request) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      
      // Verify the request is for this user
      if (request.toUserId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to respond to this request" });
      }
      
      // Update request status
      const status = accept ? "accepted" : "rejected";
      await storage.updateFriendRequestStatus(Number(id), status);
      
      // If accepted, create friendship
      if (accept) {
        await storage.addFriend({
          userId: req.user.id,
          friendId: request.fromUserId
        });
        await storage.addFriend({
          userId: request.fromUserId,
          friendId: req.user.id
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/users/search", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      // Use the new storage method for searching
      const matchingUsers = await storage.searchUsers(query, req.user.id);
      
      // Map to safe user format (no sensitive data)
      const safeUsers = matchingUsers.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.avatar
      }));
      
      res.json(safeUsers);
    } catch (error) {
      next(error);
    }
  });

  // Error handling middleware (ensure it's registered after all routes)
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled error:", err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: err.errors });
    }
    res.status(500).json({ message: err.message || "Internal Server Error" });
  });

  const server = createServer(app);
  return server;
}
