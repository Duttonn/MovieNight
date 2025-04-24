import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import axios from "axios";
import { z } from "zod";
import { 
  insertMovieNightSchema, 
  insertMovieRatingSchema, 
  insertFriendRequestSchema,
  insertMovieGroupSchema,
  insertGroupMemberSchema,
  insertMovieSuggestionSchema,
  insertSuggestionInterestSchema,
  insertWeeklyMovieSelectionSchema
} from "@shared/schema";

// TMDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY || "3e1dd3d6f8a52126be47495c9ed03233"; // Default key for development
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Helper to transform TMDB movie to our schema
const transformTMDBMovie = (tmdbMovie: any) => {
  return {
    tmdbId: tmdbMovie.id,
    title: tmdbMovie.title,
    overview: tmdbMovie.overview,
    posterPath: tmdbMovie.poster_path,
    backdropPath: tmdbMovie.backdrop_path,
    releaseDate: tmdbMovie.release_date,
    runtime: tmdbMovie.runtime,
    genres: tmdbMovie.genres ? tmdbMovie.genres.map((genre: any) => genre.name) : [],
  };
};

import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Using isAuthenticated middleware imported from auth.ts

  // --- TMDB API Routes ---
  
  // Search movies
  app.get("/api/movies/search", async (req, res) => {
    try {
      const query = req.query.query as string;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          query,
          language: "en-US",
          page: 1,
          include_adult: false
        }
      });
      
      const results = response.data.results.map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date,
        voteAverage: movie.vote_average,
        genreIds: movie.genre_ids
      }));
      
      res.json(results);
    } catch (error) {
      console.error("Error searching movies:", error);
      res.status(500).json({ message: "Failed to search movies" });
    }
  });

  // Get movie details
  app.get("/api/movies/:id", async (req, res) => {
    try {
      const id = req.params.id;
      
      // Check if we already have the movie in our database
      const existingMovie = await storage.getMovieByTmdbId(parseInt(id));
      if (existingMovie) {
        let userRating = null;
        let isInWatchlist = false;
        
        // If user is authenticated, get their rating and watchlist status
        if (req.isAuthenticated()) {
          const userId = req.user!.id;
          const movieId = existingMovie.id;
          userRating = await storage.getMovieRating(userId, movieId);
          isInWatchlist = await storage.isMovieInWatchlist(userId, movieId);
        }
        
        // Get fresh data from TMDB for videos
        const response = await axios.get(`${TMDB_BASE_URL}/movie/${id}`, {
          params: {
            api_key: TMDB_API_KEY,
            language: "en-US",
            append_to_response: "videos,credits"
          }
        });
        
        return res.json({
          ...existingMovie,
          userRating: userRating?.rating || null,
          userReview: userRating?.review || null,
          isInWatchlist,
          videos: response.data.videos,
          credits: response.data.credits
        });
      }
      
      // Fetch movie details from TMDB
      const response = await axios.get(`${TMDB_BASE_URL}/movie/${id}`, {
        params: {
          api_key: TMDB_API_KEY,
          language: "en-US",
          append_to_response: "videos,credits"
        }
      });
      
      // Transform and store movie in our database
      const movieData = transformTMDBMovie(response.data);
      const savedMovie = await storage.createMovie(movieData);
      
      // Add videos and other additional info
      const result = {
        ...savedMovie,
        userRating: null,
        userReview: null,
        isInWatchlist: false,
        videos: response.data.videos,
        credits: response.data.credits,
        voteAverage: response.data.vote_average,
        voteCount: response.data.vote_count
      };
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching movie details:", error);
      res.status(500).json({ message: "Failed to fetch movie details" });
    }
  });

  // Get popular movies
  app.get("/api/movies/discover/popular", async (req, res) => {
    try {
      const response = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
        params: {
          api_key: TMDB_API_KEY,
          language: "en-US",
          page: 1
        }
      });
      
      const results = response.data.results.map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date,
        voteAverage: movie.vote_average,
        genreIds: movie.genre_ids
      }));
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching popular movies:", error);
      res.status(500).json({ message: "Failed to fetch popular movies" });
    }
  });

  // Get recommended movies
  app.get("/api/movies/discover/recommended", async (req, res) => {
    try {
      // For demo purposes, we'll use trending movies as recommendations
      // In a real app, we would use user preferences and history
      const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/week`, {
        params: {
          api_key: TMDB_API_KEY,
          language: "en-US"
        }
      });
      
      const results = response.data.results.map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date,
        voteAverage: movie.vote_average,
        genreIds: movie.genre_ids
      }));
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching recommended movies:", error);
      res.status(500).json({ message: "Failed to fetch recommended movies" });
    }
  });

  // Get movie genres - use the correct endpoint
  app.get("/api/movies/genres", async (req, res) => {
    try {
      // First try the standard API endpoint for genres
      const response = await axios.get(`${TMDB_BASE_URL}/genre/movie/list`, {
        params: {
          api_key: TMDB_API_KEY,
          language: "en-US"
        }
      });
      
      // If successful, return the genres from the response
      if (response.data && response.data.genres) {
        return res.json(response.data.genres);
      }
      
      // If we reach this point, something went wrong with the TMDB response
      // Return a generic list of common movie genres
      return res.json(getCommonGenres());
    } catch (error) {
      console.error("Error fetching genres:", error);
      // Return fallback genres
      return res.json(getCommonGenres());
    }
  });
  
  // Helper function to get common movie genres
  function getCommonGenres() {
    return [
      { id: 28, name: "Action" },
      { id: 12, name: "Adventure" },
      { id: 16, name: "Animation" },
      { id: 35, name: "Comedy" },
      { id: 80, name: "Crime" },
      { id: 99, name: "Documentary" },
      { id: 18, name: "Drama" },
      { id: 10751, name: "Family" },
      { id: 14, name: "Fantasy" },
      { id: 36, name: "History" },
      { id: 27, name: "Horror" },
      { id: 10402, name: "Music" },
      { id: 9648, name: "Mystery" },
      { id: 10749, name: "Romance" },
      { id: 878, name: "Science Fiction" },
      { id: 53, name: "Thriller" },
      { id: 10752, name: "War" },
      { id: 37, name: "Western" }
    ];
  }

  // --- Movie Night Routes ---
  
  // Get user's upcoming movie nights
  app.get("/api/movienights/upcoming", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const upcomingNights = await storage.getUpcomingMovieNights(userId);
      
      // Get attendees and movies for each night
      const nightsWithDetails = await Promise.all(upcomingNights.map(async (night) => {
        const attendees = await storage.getMovieNightAttendees(night.id);
        const movieNightMovies = await storage.getMovieNightMovies(night.id);
        
        // Get the actual movie details
        const movieIds = movieNightMovies.map(m => m.movieId);
        const movies = await storage.getMoviesByIds(movieIds);
        
        return {
          ...night,
          attendeesCount: attendees.length,
          movies
        };
      }));
      
      res.json(nightsWithDetails);
    } catch (error) {
      console.error("Error fetching upcoming movie nights:", error);
      res.status(500).json({ message: "Failed to fetch upcoming movie nights" });
    }
  });

  // Get user's past movie nights
  app.get("/api/movienights/past", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const pastNights = await storage.getPastMovieNights(userId);
      
      // Get attendees and movies for each night
      const nightsWithDetails = await Promise.all(pastNights.map(async (night) => {
        const attendees = await storage.getMovieNightAttendees(night.id);
        const movieNightMovies = await storage.getMovieNightMovies(night.id);
        
        // Get the actual movie details
        const movieIds = movieNightMovies.map(m => m.movieId);
        const movies = await storage.getMoviesByIds(movieIds);
        
        // Get ratings for these movies
        const moviesWithRatings = await Promise.all(movies.map(async (movie) => {
          const rating = await storage.getMovieRating(userId, movie.id);
          return {
            ...movie,
            userRating: rating?.rating || null
          };
        }));
        
        return {
          ...night,
          attendeesCount: attendees.length,
          movies: moviesWithRatings
        };
      }));
      
      res.json(nightsWithDetails);
    } catch (error) {
      console.error("Error fetching past movie nights:", error);
      res.status(500).json({ message: "Failed to fetch past movie nights" });
    }
  });

  // Create new movie night
  app.post("/api/movienights", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const movieNightData = insertMovieNightSchema.parse({
        ...req.body,
        hostId: userId
      });
      
      const newMovieNight = await storage.createMovieNight(movieNightData);
      
      // Add any movies if provided
      if (req.body.movies && Array.isArray(req.body.movies)) {
        for (const [index, tmdbId] of req.body.movies.entries()) {
          // Get or create the movie
          let movie = await storage.getMovieByTmdbId(tmdbId);
          
          if (!movie) {
            try {
              // Fetch from TMDB API
              const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
                params: {
                  api_key: TMDB_API_KEY,
                  language: "en-US"
                }
              });
              
              const movieData = transformTMDBMovie(response.data);
              movie = await storage.createMovie(movieData);
            } catch (error) {
              console.error(`Failed to fetch movie with TMDB ID ${tmdbId}:`, error);
              continue;
            }
          }
          
          // Add movie to the night
          await storage.addMovieToMovieNight({
            movieNightId: newMovieNight.id,
            movieId: movie.id,
            order: index
          });
        }
      }
      
      res.status(201).json(newMovieNight);
    } catch (error) {
      console.error("Error creating movie night:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid movie night data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create movie night" });
    }
  });

  // Update movie night
  app.patch("/api/movienights/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const nightId = parseInt(req.params.id);
      
      // Verify the night exists and belongs to user
      const night = await storage.getMovieNight(nightId);
      if (!night) {
        return res.status(404).json({ message: "Movie night not found" });
      }
      
      if (night.hostId !== userId) {
        return res.status(403).json({ message: "You don't have permission to update this movie night" });
      }
      
      // Update the movie night
      const updatedNight = await storage.updateMovieNight(nightId, req.body);
      
      // Handle movie updates if provided
      if (req.body.movies && Array.isArray(req.body.movies)) {
        // First remove existing movies
        const existingMovies = await storage.getMovieNightMovies(nightId);
        for (const movieRecord of existingMovies) {
          await storage.removeMovieFromMovieNight(movieRecord.id);
        }
        
        // Add new movies
        for (const [index, tmdbId] of req.body.movies.entries()) {
          // Get or create the movie
          let movie = await storage.getMovieByTmdbId(tmdbId);
          
          if (!movie) {
            try {
              // Fetch from TMDB API
              const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
                params: {
                  api_key: TMDB_API_KEY,
                  language: "en-US"
                }
              });
              
              const movieData = transformTMDBMovie(response.data);
              movie = await storage.createMovie(movieData);
            } catch (error) {
              console.error(`Failed to fetch movie with TMDB ID ${tmdbId}:`, error);
              continue;
            }
          }
          
          // Add movie to the night
          await storage.addMovieToMovieNight({
            movieNightId: nightId,
            movieId: movie.id,
            order: index
          });
        }
      }
      
      res.json(updatedNight);
    } catch (error) {
      console.error("Error updating movie night:", error);
      res.status(500).json({ message: "Failed to update movie night" });
    }
  });

  // Delete movie night
  app.delete("/api/movienights/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const nightId = parseInt(req.params.id);
      
      // Verify the night exists and belongs to user
      const night = await storage.getMovieNight(nightId);
      if (!night) {
        return res.status(404).json({ message: "Movie night not found" });
      }
      
      if (night.hostId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this movie night" });
      }
      
      await storage.deleteMovieNight(nightId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting movie night:", error);
      res.status(500).json({ message: "Failed to delete movie night" });
    }
  });

  // --- Rating Routes ---
  
  // Rate a movie
  app.post("/api/ratings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const ratingData = insertMovieRatingSchema.parse({
        ...req.body,
        userId
      });
      
      const rating = await storage.createOrUpdateMovieRating(ratingData);
      res.status(201).json(rating);
    } catch (error) {
      console.error("Error rating movie:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rating data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to rate movie" });
    }
  });

  // Get user's movie ratings
  app.get("/api/ratings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const ratings = await storage.getMovieRatingsByUserId(userId);
      
      // Get movie details for each rating
      const ratingsWithMovies = await Promise.all(ratings.map(async (rating) => {
        const movie = await storage.getMovie(rating.movieId);
        return {
          ...rating,
          movie
        };
      }));
      
      res.json(ratingsWithMovies);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  // --- Watchlist Routes ---
  
  // Get user's watchlist
  app.get("/api/watchlist", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const watchlistItems = await storage.getWatchlistByUserId(userId);
      
      // Get movie details for each item
      const watchlistWithMovies = await Promise.all(watchlistItems.map(async (item) => {
        const movie = await storage.getMovie(item.movieId);
        return {
          ...item,
          movie
        };
      }));
      
      res.json(watchlistWithMovies);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });

  // Add movie to watchlist
  app.post("/api/watchlist", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { movieId } = req.body;
      
      if (!movieId) {
        return res.status(400).json({ message: "Movie ID is required" });
      }
      
      const watchlistItem = await storage.addToWatchlist({
        userId,
        movieId
      });
      
      res.status(201).json(watchlistItem);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });

  // Remove movie from watchlist
  app.delete("/api/watchlist/:movieId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const movieId = parseInt(req.params.movieId);
      
      await storage.removeFromWatchlist(userId, movieId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  // --- Friends API Routes ---
  
  // Search for users
  app.get("/api/users/search", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const query = req.query.query as string;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      const users = await storage.searchUsers(query);
      
      // Don't include the current user in search results
      const filteredUsers = users.filter(user => user.id !== userId);
      
      // Remove sensitive information
      const sanitizedUsers = filteredUsers.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarInitials: user.avatarInitials
      }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });
  
  // Get current user's friends
  app.get("/api/friends", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const friends = await storage.getFriendsByUserId(userId);
      
      // Remove sensitive information
      const sanitizedFriends = friends.map(friend => ({
        id: friend.id,
        username: friend.username,
        displayName: friend.displayName,
        avatarInitials: friend.avatarInitials
      }));
      
      res.json(sanitizedFriends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });
  
  // Get pending friend requests
  app.get("/api/friends/requests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      // Get both incoming and outgoing requests
      const incomingRequests = await storage.getFriendRequestsByReceiver(userId);
      const outgoingRequests = await storage.getFriendRequestsBySender(userId);
      
      // Enhance with user info
      const enhancedIncoming = await Promise.all(incomingRequests.map(async (request) => {
        const sender = await storage.getUser(request.senderId);
        return {
          ...request,
          user: sender ? {
            id: sender.id,
            username: sender.username,
            displayName: sender.displayName,
            avatarInitials: sender.avatarInitials
          } : null,
          direction: "incoming"
        };
      }));
      
      const enhancedOutgoing = await Promise.all(outgoingRequests.map(async (request) => {
        const receiver = await storage.getUser(request.receiverId);
        return {
          ...request,
          user: receiver ? {
            id: receiver.id,
            username: receiver.username,
            displayName: receiver.displayName,
            avatarInitials: receiver.avatarInitials
          } : null,
          direction: "outgoing"
        };
      }));
      
      res.json({
        incoming: enhancedIncoming,
        outgoing: enhancedOutgoing
      });
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ message: "Failed to fetch friend requests" });
    }
  });
  
  // Send friend request
  app.post("/api/friends/requests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { receiverId } = req.body;
      
      if (!receiverId) {
        return res.status(400).json({ message: "Receiver ID is required" });
      }
      
      // Check if user exists
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if a request already exists
      const existingRequests = await storage.getFriendRequestsBySender(userId);
      const alreadyRequested = existingRequests.some(
        req => req.receiverId === receiverId && req.status === "pending"
      );
      
      if (alreadyRequested) {
        return res.status(400).json({ message: "Friend request already sent" });
      }
      
      // Check if they're already friends
      const friends = await storage.getFriendsByUserId(userId);
      const alreadyFriends = friends.some(friend => friend.id === receiverId);
      
      if (alreadyFriends) {
        return res.status(400).json({ message: "You are already friends with this user" });
      }
      
      const friendRequestData = insertFriendRequestSchema.parse({
        senderId: userId,
        receiverId,
        status: "pending"
      });
      
      const newRequest = await storage.createFriendRequest(friendRequestData);
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error sending friend request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send friend request" });
    }
  });
  
  // Respond to friend request
  app.patch("/api/friends/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const requestId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Valid status (accepted/rejected) is required" });
      }
      
      // Check if request exists and is for this user
      const request = await storage.getFriendRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      
      if (request.receiverId !== userId) {
        return res.status(403).json({ message: "You don't have permission to respond to this request" });
      }
      
      if (request.status !== "pending") {
        return res.status(400).json({ message: "This request has already been processed" });
      }
      
      const updatedRequest = await storage.updateFriendRequestStatus(requestId, status);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error responding to friend request:", error);
      res.status(500).json({ message: "Failed to respond to friend request" });
    }
  });

  // --- Movie Groups API Routes ---
  
  // Get user's movie groups
  app.get("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const groups = await storage.getMovieGroupsByUserId(userId);
      
      // Add member count to each group
      const groupsWithMemberCounts = await Promise.all(groups.map(async (group) => {
        const members = await storage.getGroupMembers(group.id);
        return {
          ...group,
          memberCount: members.length
        };
      }));
      
      res.json(groupsWithMemberCounts);
    } catch (error) {
      console.error("Error fetching movie groups:", error);
      res.status(500).json({ message: "Failed to fetch movie groups" });
    }
  });
  
  // Get a specific movie group
  app.get("/api/groups/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const groupId = parseInt(req.params.id);
      
      // Check if group exists
      const group = await storage.getMovieGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Check if user is member
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      
      // Get members with user info
      const members = await storage.getGroupMembers(groupId);
      const membersWithInfo = await Promise.all(members.map(async (member) => {
        const user = await storage.getUser(member.userId);
        return {
          ...member,
          user: user ? {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarInitials: user.avatarInitials
          } : null
        };
      }));
      
      // Get the current weekly selection if any
      const currentSelection = await storage.getCurrentWeeklyMovieSelection(groupId);
      let currentMovie = null;
      
      if (currentSelection) {
        const suggestion = await storage.getMovieSuggestion(currentSelection.suggestionId);
        if (suggestion) {
          const movie = await storage.getMovie(suggestion.movieId);
          currentMovie = {
            ...movie,
            suggestedBy: suggestion.proposerId,
            scheduledDate: currentSelection.scheduledDate,
            status: currentSelection.status
          };
        }
      }
      
      const result = {
        ...group,
        members: membersWithInfo,
        currentMovie
      };
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching movie group:", error);
      res.status(500).json({ message: "Failed to fetch movie group" });
    }
  });
  
  // Create new movie group
  app.post("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { name, description, friendIds } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Group name is required" });
      }
      
      const groupData = insertMovieGroupSchema.parse({
        name,
        description: description || null,
        creatorId: userId
      });
      
      const newGroup = await storage.createMovieGroup(groupData);
      
      // Add members if provided
      if (friendIds && Array.isArray(friendIds)) {
        for (const friendId of friendIds) {
          // Verify this is actually a friend
          const friends = await storage.getFriendsByUserId(userId);
          const isFriend = friends.some(friend => friend.id === friendId);
          
          if (isFriend) {
            await storage.addGroupMember({
              groupId: newGroup.id,
              userId: friendId
            });
          }
        }
      }
      
      res.status(201).json(newGroup);
    } catch (error) {
      console.error("Error creating movie group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create movie group" });
    }
  });
  
  // Update movie group
  app.patch("/api/groups/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const groupId = parseInt(req.params.id);
      
      // Check if group exists
      const group = await storage.getMovieGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Only creator can update
      if (group.creatorId !== userId) {
        return res.status(403).json({ message: "Only the group creator can update the group" });
      }
      
      const updatedGroup = await storage.updateMovieGroup(groupId, req.body);
      res.json(updatedGroup);
    } catch (error) {
      console.error("Error updating movie group:", error);
      res.status(500).json({ message: "Failed to update movie group" });
    }
  });
  
  // Add member to group
  app.post("/api/groups/:id/members", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const groupId = parseInt(req.params.id);
      const { userId: memberUserId } = req.body;
      
      if (!memberUserId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Check if group exists
      const group = await storage.getMovieGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Only creator can add members
      if (group.creatorId !== userId) {
        return res.status(403).json({ message: "Only the group creator can add members" });
      }
      
      // Verify the member is a friend of the creator
      const friends = await storage.getFriendsByUserId(userId);
      const isFriend = friends.some(friend => friend.id === memberUserId);
      
      if (!isFriend) {
        return res.status(400).json({ message: "You can only add friends to your group" });
      }
      
      // Check if already a member
      const isAlreadyMember = await storage.isUserInGroup(groupId, memberUserId);
      if (isAlreadyMember) {
        return res.status(400).json({ message: "User is already a member of this group" });
      }
      
      const memberData = insertGroupMemberSchema.parse({
        groupId,
        userId: memberUserId
      });
      
      const newMember = await storage.addGroupMember(memberData);
      res.status(201).json(newMember);
    } catch (error) {
      console.error("Error adding member to group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid member data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add member to group" });
    }
  });
  
  // Remove member from group
  app.delete("/api/groups/:groupId/members/:memberId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const groupId = parseInt(req.params.groupId);
      const memberId = parseInt(req.params.memberId);
      
      // Check if group exists
      const group = await storage.getMovieGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Only creator can remove members, or members can remove themselves
      if (group.creatorId !== userId && memberId !== userId) {
        return res.status(403).json({ message: "You don't have permission to remove this member" });
      }
      
      await storage.removeGroupMember(groupId, memberId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing member from group:", error);
      res.status(500).json({ message: "Failed to remove member from group" });
    }
  });

  // --- Movie Suggestions API Routes ---
  
  // Get suggestions for a group
  app.get("/api/groups/:id/suggestions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const groupId = parseInt(req.params.id);
      
      // Check if group exists
      const group = await storage.getMovieGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Check if user is member
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      
      const suggestions = await storage.getMovieSuggestionsByGroupId(groupId);
      
      // Add movie and proposer info
      const enhancedSuggestions = await Promise.all(suggestions.map(async (suggestion) => {
        const movie = await storage.getMovie(suggestion.movieId);
        const proposer = await storage.getUser(suggestion.proposerId);
        
        // Get interest ratings from other members
        const interests = await storage.getSuggestionInterestsBySuggestionId(suggestion.id);
        
        // Get user's own interest if it exists
        const userInterest = interests.find(interest => interest.userId === userId);
        
        return {
          ...suggestion,
          movie,
          proposer: proposer ? {
            id: proposer.id,
            username: proposer.username,
            displayName: proposer.displayName,
            avatarInitials: proposer.avatarInitials
          } : null,
          interestCount: interests.length,
          averageInterestLevel: interests.length > 0 
            ? interests.reduce((sum, interest) => sum + interest.interestLevel, 0) / interests.length 
            : null,
          userInterestLevel: userInterest?.interestLevel || null
        };
      }));
      
      res.json(enhancedSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });
  
  // Add a new suggestion
  app.post("/api/groups/:id/suggestions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const groupId = parseInt(req.params.id);
      const { movieId, proposalIntent, notes } = req.body;
      
      if (!movieId || !proposalIntent) {
        return res.status(400).json({ message: "Movie ID and proposal intent are required" });
      }
      
      // Check if group exists
      const group = await storage.getMovieGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Check if user is member
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      
      // Check if movie exists
      const movie = await storage.getMovie(movieId);
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      // Check if already suggested
      const suggestions = await storage.getMovieSuggestionsByGroupId(groupId);
      const alreadySuggested = suggestions.some(s => s.movieId === movieId && !s.isWatched);
      
      if (alreadySuggested) {
        return res.status(400).json({ message: "This movie has already been suggested" });
      }
      
      const suggestionData = insertMovieSuggestionSchema.parse({
        groupId,
        movieId,
        proposerId: userId,
        proposalIntent: parseInt(proposalIntent.toString()),
        notes: notes || null,
        isWatched: false
      });
      
      const newSuggestion = await storage.createMovieSuggestion(suggestionData);
      
      // Automatically create the proposer's interest level (same as intent)
      await storage.createOrUpdateSuggestionInterest({
        suggestionId: newSuggestion.id,
        userId,
        interestLevel: parseInt(proposalIntent.toString()),
        comment: "Auto-added as suggester"
      });
      
      res.status(201).json(newSuggestion);
    } catch (error) {
      console.error("Error creating suggestion:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid suggestion data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create suggestion" });
    }
  });
  
  // Add or update interest in a suggestion
  app.post("/api/suggestions/:id/interest", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const suggestionId = parseInt(req.params.id);
      const { interestLevel, comment } = req.body;
      
      if (!interestLevel || interestLevel < 1 || interestLevel > 4) {
        return res.status(400).json({ message: "Interest level must be between 1 and 4" });
      }
      
      // Check if suggestion exists
      const suggestion = await storage.getMovieSuggestion(suggestionId);
      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(suggestion.groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      
      const interestData = insertSuggestionInterestSchema.parse({
        suggestionId,
        userId,
        interestLevel: parseInt(interestLevel.toString()),
        comment: comment || null
      });
      
      const interest = await storage.createOrUpdateSuggestionInterest(interestData);
      res.status(201).json(interest);
    } catch (error) {
      console.error("Error recording interest:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid interest data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to record interest" });
    }
  });
  
  // Get weekly movie selections for a group
  app.get("/api/groups/:id/selections", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const groupId = parseInt(req.params.id);
      
      // Check if group exists
      const group = await storage.getMovieGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Check if user is member
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      
      const selections = await storage.getWeeklyMovieSelectionsByGroupId(groupId);
      
      // Add movie and suggestion info
      const enhancedSelections = await Promise.all(selections.map(async (selection) => {
        const suggestion = await storage.getMovieSuggestion(selection.suggestionId);
        let movie = null;
        let proposer = null;
        
        if (suggestion) {
          movie = await storage.getMovie(suggestion.movieId);
          proposer = await storage.getUser(suggestion.proposerId);
        }
        
        // Get the user whose turn it was
        const turnUser = await storage.getUser(selection.turnUserId);
        
        return {
          ...selection,
          suggestion,
          movie,
          proposer: proposer ? {
            id: proposer.id,
            username: proposer.username,
            displayName: proposer.displayName,
            avatarInitials: proposer.avatarInitials
          } : null,
          turnUser: turnUser ? {
            id: turnUser.id,
            username: turnUser.username,
            displayName: turnUser.displayName,
            avatarInitials: turnUser.avatarInitials
          } : null
        };
      }));
      
      res.json(enhancedSelections);
    } catch (error) {
      console.error("Error fetching weekly selections:", error);
      res.status(500).json({ message: "Failed to fetch weekly selections" });
    }
  });
  
  // Create a new weekly movie selection
  app.post("/api/groups/:id/selections", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const groupId = parseInt(req.params.id);
      const { suggestionId, weekOf, scheduledDate, turnUserId } = req.body;
      
      if (!suggestionId || !weekOf || !turnUserId) {
        return res.status(400).json({ message: "Suggestion ID, week date, and turn user ID are required" });
      }
      
      // Check if group exists
      const group = await storage.getMovieGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Only creator can create selections
      if (group.creatorId !== userId) {
        return res.status(403).json({ message: "Only the group creator can create weekly selections" });
      }
      
      // Check if suggestion exists and belongs to this group
      const suggestion = await storage.getMovieSuggestion(suggestionId);
      if (!suggestion || suggestion.groupId !== groupId) {
        return res.status(400).json({ message: "Invalid suggestion" });
      }
      
      // Check if user is a member
      const isMember = await storage.isUserInGroup(groupId, turnUserId);
      if (!isMember) {
        return res.status(400).json({ message: "Turn user is not a member of this group" });
      }
      
      // Calculate combined score (average interest * proposer intent)
      const interests = await storage.getSuggestionInterestsBySuggestionId(suggestionId);
      const avgInterest = interests.length > 0
        ? interests.reduce((sum, interest) => sum + interest.interestLevel, 0) / interests.length
        : 0;
      
      const combinedScore = avgInterest * suggestion.proposalIntent;
      
      const selectionData = insertWeeklyMovieSelectionSchema.parse({
        groupId,
        suggestionId,
        weekOf: new Date(weekOf),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        turnUserId: parseInt(turnUserId.toString()),
        combinedScore,
        status: "scheduled"
      });
      
      const newSelection = await storage.createWeeklyMovieSelection(selectionData);
      res.status(201).json(newSelection);
    } catch (error) {
      console.error("Error creating weekly selection:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid selection data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create weekly selection" });
    }
  });
  
  // Mark a weekly selection as watched
  app.patch("/api/selections/:id/watched", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const selectionId = parseInt(req.params.id);
      const { feedback } = req.body;
      
      // Check if selection exists
      const selection = await storage.getWeeklyMovieSelection(selectionId);
      if (!selection) {
        return res.status(404).json({ message: "Selection not found" });
      }
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(selection.groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      
      const updatedSelection = await storage.markWeeklyMovieSelectionAsWatched(selectionId, feedback);
      res.json(updatedSelection);
    } catch (error) {
      console.error("Error marking selection as watched:", error);
      res.status(500).json({ message: "Failed to mark selection as watched" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
