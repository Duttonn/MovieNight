import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@shared/schema'; // Import all schema objects
import { eq, and, not, desc, sql, inArray, or, isNull } from 'drizzle-orm'; // Added or, isNull

import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Define the storage interface
export interface IStorage {
  sessionStore: session.SessionStore;

  // User operations
  getUser(id: number): Promise<schema.User | undefined>;
  getUserByUsername(username: string): Promise<schema.User | undefined>;
  getUserByEmail(email: string): Promise<schema.User | undefined>;
  createUser(user: schema.InsertUser): Promise<schema.User>;
  searchUsers(query: string, excludeUserId: number): Promise<schema.User[]>;

  // Movie operations
  getMovie(id: number): Promise<schema.Movie | undefined>;
  getMoviesByUser(userId: number): Promise<schema.Movie[]>;
  getMoviesByGroup(groupId: number): Promise<schema.Movie[]>;
  getUnwatchedMovies(userId: number): Promise<schema.Movie[]>; // Updated to accept userId
  createMovie(movie: schema.InsertMovie): Promise<schema.Movie>;
  updateMovie(id: number, updates: Partial<schema.Movie>): Promise<schema.Movie | undefined>;

  // Group operations
  getGroup(id: number): Promise<schema.Group | undefined>;
  getGroupsByUser(userId: number): Promise<schema.Group[]>;
  createGroup(group: schema.InsertGroup): Promise<schema.Group>;
  updateGroup(id: number, updates: Partial<schema.Group>): Promise<schema.Group | undefined>;

  // Group member operations
  addUserToGroup(groupMember: schema.InsertGroupMember): Promise<schema.GroupMember>;
  getGroupMembers(groupId: number): Promise<schema.GroupMember[]>;
  removeUserFromGroup(groupId: number, userId: number): Promise<void>;

  // Friend request operations
  createFriendRequest(friendRequest: schema.InsertFriendRequest): Promise<schema.FriendRequest>;
  getFriendRequestById(id: number): Promise<schema.FriendRequest | undefined>;
  getPendingFriendRequests(userId: number): Promise<schema.FriendRequest[]>;
  updateFriendRequestStatus(id: number, status: string): Promise<schema.FriendRequest | undefined>;

  // Friend operations
  addFriend(friend: schema.InsertFriend): Promise<schema.Friend>;
  getFriends(userId: number): Promise<schema.User[]>;
  removeFriend(userId: number, friendId: number): Promise<void>;
}

// Drizzle/SQLite implementation
class DrizzleStorage implements IStorage {
  private db;
  sessionStore: session.SessionStore;

  constructor() {
    const sqliteClient = createClient({ url: "file:./local.db" });
    this.db = drizzle(sqliteClient, { schema }); // Use the imported schema

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // --- Updated Movie Operations ---

  async createMovie(insertMovie: schema.InsertMovie): Promise<schema.Movie> {
    // Drizzle automatically handles default values like proposedAt, watched
    const result = await this.db.insert(schema.movies).values(insertMovie).returning();
    if (!result || result.length === 0) throw new Error("Failed to create movie");
    return result[0];
  }

  async getUnwatchedMovies(userId: number): Promise<schema.Movie[]> {
    // 1. Get the IDs of groups the user is a member of
    const userGroupMemberships = await this.db.select({ groupId: schema.groupMembers.groupId })
                                             .from(schema.groupMembers)
                                             .where(eq(schema.groupMembers.userId, userId));
    const userGroupIds = userGroupMemberships.map(gm => gm.groupId);
    
    // 2. Get the IDs of users who are friends with the current user
    const friendships = await this.db.select({ friendId: schema.friends.friendId })
                                    .from(schema.friends)
                                    .where(eq(schema.friends.userId, userId));
    const friendIds = friendships.map(f => f.friendId);
    
    // 3. Fetch movies that are unwatched AND match one of the following criteria:
    //    - Belong to one of the user's groups
    //    - Were proposed by a friend of the user
    //    - Were proposed by the user themselves
    return await this.db.select()
      .from(schema.movies)
      .where(and(
        eq(schema.movies.watched, false), // Unwatched movies only
        or(
          userGroupIds.length > 0 ? inArray(schema.movies.groupId, userGroupIds) : sql`false`, // In user's groups
          friendIds.length > 0 ? inArray(schema.movies.proposerId, friendIds) : sql`false`, // Proposed by friends
          eq(schema.movies.proposerId, userId) // Proposed by the user themselves
        )
      ));
  }

  // --- User Operations ---
  async getUser(id: number): Promise<schema.User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<schema.User | undefined> {
     // Assuming case-insensitive search is desired, use lower() if DB supports it or handle in code
     // For simplicity here, using direct comparison (might be case-sensitive depending on SQLite collation)
     // Using sql.lower for potential case-insensitivity in SQLite
    const result = await this.db.select().from(schema.users).where(eq(sql`lower(${schema.users.username})`, username.toLowerCase())).limit(1);
    return result[0];
  }

   async getUserByEmail(email: string): Promise<schema.User | undefined> {
    // Using sql.lower for potential case-insensitivity
    const result = await this.db.select().from(schema.users).where(eq(sql`lower(${schema.users.email})`, email.toLowerCase())).limit(1);
    return result[0];
  }

  async createUser(insertUser: schema.InsertUser): Promise<schema.User> {
    const result = await this.db.insert(schema.users).values(insertUser).returning();
     if (!result || result.length === 0) throw new Error("Failed to create user");
    return result[0];
  }

  // --- New User Search Operation ---
  async searchUsers(query: string, excludeUserId: number): Promise<schema.User[]> {
    const lowerQuery = query.toLowerCase();
    // Use `like` for partial matching and `sql.lower` for case-insensitivity
    // Filter out the user performing the search
    return await this.db.select()
      .from(schema.users)
      .where(and(
        not(eq(schema.users.id, excludeUserId)), // Exclude the current user
        sql`lower(${schema.users.username}) LIKE ${'%' + lowerQuery + '%'}` // Search username (case-insensitive)
        // Optionally add search by name if needed:
        // or(sql`lower(${schema.users.name}) LIKE ${'%' + lowerQuery + '%'}`)
      ))
      .limit(10); // Limit results for performance
  }

  // --- Other Movie Operations ---

  async getMovie(id: number): Promise<schema.Movie | undefined> {
    const result = await this.db.select().from(schema.movies).where(eq(schema.movies.id, id)).limit(1);
    return result[0];
  }

  async getMoviesByUser(userId: number): Promise<schema.Movie[]> {
     return await this.db.select().from(schema.movies).where(eq(schema.movies.proposerId, userId));
  }

  async getMoviesByGroup(groupId: number): Promise<schema.Movie[]> {
     return await this.db.select().from(schema.movies).where(eq(schema.movies.groupId, groupId));
  }

  async updateMovie(id: number, updates: Partial<schema.Movie>): Promise<schema.Movie | undefined> {
    const result = await this.db.update(schema.movies).set(updates).where(eq(schema.movies.id, id)).returning();
    return result[0];
  }

  // --- Group Operations ---
  async getGroup(id: number): Promise<schema.Group | undefined> {
    const result = await this.db.select().from(schema.groups).where(eq(schema.groups.id, id)).limit(1);
    return result[0];
  }

  async getGroupsByUser(userId: number): Promise<schema.Group[]> {
    // This requires a join or subquery with groupMembers table
    const groupMemberships = await this.db.select({ groupId: schema.groupMembers.groupId })
                                         .from(schema.groupMembers)
                                         .where(eq(schema.groupMembers.userId, userId));
    const groupIds = groupMemberships.map(gm => gm.groupId);
    if (groupIds.length === 0) return [];
    // Use inArray for better SQL generation
    return await this.db.select().from(schema.groups).where(inArray(schema.groups.id, groupIds));
  }

  async createGroup(insertGroup: schema.InsertGroup): Promise<schema.Group> {
     const result = await this.db.insert(schema.groups).values({
       ...insertGroup,
       currentProposerIndex: 0 // Ensure default is set if not in schema default
     }).returning();
      if (!result || result.length === 0) throw new Error("Failed to create group");
     return result[0];
  }

  async updateGroup(id: number, updates: Partial<schema.Group>): Promise<schema.Group | undefined> {
    const result = await this.db.update(schema.groups).set(updates).where(eq(schema.groups.id, id)).returning();
    return result[0];
  }

  // --- Group Member Operations ---
  async addUserToGroup(insertGroupMember: schema.InsertGroupMember): Promise<schema.GroupMember> {
    const result = await this.db.insert(schema.groupMembers).values(insertGroupMember).returning();
     if (!result || result.length === 0) throw new Error("Failed to add user to group");
    return result[0];
  }

  async getGroupMembers(groupId: number): Promise<schema.GroupMember[]> {
    return await this.db.select().from(schema.groupMembers).where(eq(schema.groupMembers.groupId, groupId));
  }

  async removeUserFromGroup(groupId: number, userId: number): Promise<void> {
    await this.db.delete(schema.groupMembers).where(and(
      eq(schema.groupMembers.groupId, groupId),
      eq(schema.groupMembers.userId, userId)
    ));
  }

  // --- Friend Request Operations ---
  async createFriendRequest(insertFriendRequest: schema.InsertFriendRequest): Promise<schema.FriendRequest> {
     const result = await this.db.insert(schema.friendRequests).values({
       ...insertFriendRequest,
       status: 'pending', // Ensure default status
       createdAt: new Date() // Ensure default timestamp
     }).returning();
      if (!result || result.length === 0) throw new Error("Failed to create friend request");
     return result[0];
  }

   async getFriendRequestById(id: number): Promise<schema.FriendRequest | undefined> {
    const result = await this.db.select().from(schema.friendRequests).where(eq(schema.friendRequests.id, id)).limit(1);
    return result[0];
  }

  async getPendingFriendRequests(userId: number): Promise<schema.FriendRequest[]> {
    return await this.db.select().from(schema.friendRequests).where(and(
      eq(schema.friendRequests.toUserId, userId),
      eq(schema.friendRequests.status, 'pending')
    ));
  }

  async updateFriendRequestStatus(id: number, status: string): Promise<schema.FriendRequest | undefined> {
    const result = await this.db.update(schema.friendRequests).set({ status }).where(eq(schema.friendRequests.id, id)).returning();
    return result[0];
  }

  // --- Friend Operations ---
  async addFriend(insertFriend: schema.InsertFriend): Promise<schema.Friend> {
    const result = await this.db.insert(schema.friends).values(insertFriend).returning();
     if (!result || result.length === 0) throw new Error("Failed to add friend");
    return result[0];
  }

  async getFriends(userId: number): Promise<schema.User[]> {
    // Requires join
    const friendships = await this.db.select({ friendId: schema.friends.friendId })
                                    .from(schema.friends)
                                    .where(eq(schema.friends.userId, userId));
    const friendIds = friendships.map(f => f.friendId);
     if (friendIds.length === 0) return [];
     // Use inArray for better SQL generation
    return await this.db.select().from(schema.users).where(inArray(schema.users.id, friendIds));
  }

  async removeFriend(userId: number, friendId: number): Promise<void> {
     // Need to remove both directions
    await this.db.delete(schema.friends).where(and(
      eq(schema.friends.userId, userId),
      eq(schema.friends.friendId, friendId)
    ));
     await this.db.delete(schema.friends).where(and(
      eq(schema.friends.userId, friendId),
      eq(schema.friends.friendId, userId)
    ));
  }

}

// Export the Drizzle-based storage instance
export const storage = new DrizzleStorage();
