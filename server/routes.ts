import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertMovieSchema, 
  insertGroupSchema,
  insertGroupMemberSchema,
  insertFriendRequestSchema
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
        // Create a random password
        const tempPassword = Math.random().toString(36).slice(2);
        
        existingUser = await storage.createUser({
          username,
          password: tempPassword, // We don't need to hash since it's just a simple login
          email: `${username}@example.com`,
          name: null,
          avatar: null
        });
      }
      
      // Log the user in
      req.login(existingUser, (err) => {
        if (err) return next(err);
        res.status(200).json(existingUser);
      });
    } catch (error) {
      next(error);
    }
  });

  // Movies API
  app.get("/api/movies", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const movies = await storage.getUnwatchedMovies();
      
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
      
      // Get the user ID before validation since Zod will reject proposerId if it's undefined
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Add proposerId to the request body before validation
      const requestData = {
        ...req.body,
        proposerId: userId
      };
      
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
      const { notes, personalRating } = req.body;
      
      const movie = await storage.getMovie(Number(id));
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      const updatedMovie = await storage.updateMovie(Number(id), {
        watched: true,
        watchedAt: new Date(),
        notes,
        personalRating
      });
      
      res.json(updatedMovie);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/movies/top-pick", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const movies = await storage.getUnwatchedMovies();
      
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

  // Add endpoint for fetching a single group by ID
  app.get("/api/groups/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { id } = req.params;
      const group = await storage.getGroup(Number(id));
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Get group members
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
      
      res.json({
        ...group,
        members: members.filter(Boolean)
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/groups", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const groupData = insertGroupSchema.parse(req.body);
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

  app.get("/api/groups/:id/next-movie-night", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { id } = req.params;
      const group = await storage.getGroup(Number(id));
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      let nextDate: Date;

      if (group.scheduleType === "oneoff") {
        nextDate = group.scheduleDate!;
      } else {
        // Calculate next occurrence of the scheduled day
        const today = new Date();
        const targetDay = group.scheduleDay!;
        const daysUntilNext = (targetDay - today.getDay() + 7) % 7;
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + daysUntilNext);
        
        // Set the time
        const [hours, minutes] = group.scheduleTime.split(':').map(Number);
        nextDay.setHours(hours, minutes, 0, 0);
        
        nextDate = nextDay;
      }
      
      // Get group members to find the current proposer
      const groupMembers = await storage.getGroupMembers(group.id);
      const memberIds = groupMembers.map(member => member.userId);
      
      // Get the current proposer index (clamped to valid range)
      const currentIndex = Math.min(group.currentProposerIndex, memberIds.length - 1);
      const proposerId = memberIds[currentIndex];
      
      // Get proposer details
      const proposer = await storage.getUser(proposerId);
      
      res.json({
        date: nextDate,
        proposer: proposer ? {
          id: proposer.id,
          username: proposer.username,
          name: proposer.name,
          avatar: proposer.avatar
        } : null
      });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/groups/:id/update-movie-night", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { id } = req.params;
      const group = await storage.getGroup(Number(id));
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Get group members to calculate next proposer
      const groupMembers = await storage.getGroupMembers(group.id);
      const memberCount = groupMembers.length;
      
      // Update the proposer index
      const nextIndex = (group.currentProposerIndex + 1) % memberCount;
      
      const updatedGroup = await storage.updateGroup(Number(id), {
        currentProposerIndex: nextIndex,
        lastMovieNight: new Date()
      });
      
      res.json(updatedGroup);
    } catch (error) {
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
      
      // Simple search among all users
      const allUsers = Array.from((storage as any).usersMap.values());
      const matchingUsers = allUsers.filter(user => 
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(query.toLowerCase()))
      );
      
      // Exclude current user and limit to 5 results
      const filteredUsers = matchingUsers
        .filter(user => user.id !== req.user.id)
        .slice(0, 5)
        .map(user => ({
          id: user.id,
          username: user.username,
          name: user.name,
          avatar: user.avatar
        }));
      
      res.json(filteredUsers);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
