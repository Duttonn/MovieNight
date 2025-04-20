import { 
  users, User, InsertUser, 
  movies, Movie, InsertMovie,
  groups, Group, InsertGroup,
  groupMembers, GroupMember, InsertGroupMember,
  friendRequests, FriendRequest, InsertFriendRequest,
  friends, Friend, InsertFriend
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Define the storage interface
export interface IStorage {
  sessionStore: session.SessionStore;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Movie operations
  getMovie(id: number): Promise<Movie | undefined>;
  getMoviesByUser(userId: number): Promise<Movie[]>;
  getMoviesByGroup(groupId: number): Promise<Movie[]>;
  getUnwatchedMovies(): Promise<Movie[]>;
  createMovie(movie: InsertMovie): Promise<Movie>;
  updateMovie(id: number, updates: Partial<Movie>): Promise<Movie | undefined>;
  
  // Group operations
  getGroup(id: number): Promise<Group | undefined>;
  getGroupsByUser(userId: number): Promise<Group[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: number, updates: Partial<Group>): Promise<Group | undefined>;
  
  // Group member operations
  addUserToGroup(groupMember: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<GroupMember[]>;
  removeUserFromGroup(groupId: number, userId: number): Promise<void>;
  
  // Friend request operations
  createFriendRequest(friendRequest: InsertFriendRequest): Promise<FriendRequest>;
  getFriendRequestById(id: number): Promise<FriendRequest | undefined>;
  getPendingFriendRequests(userId: number): Promise<FriendRequest[]>;
  updateFriendRequestStatus(id: number, status: string): Promise<FriendRequest | undefined>;
  
  // Friend operations
  addFriend(friend: InsertFriend): Promise<Friend>;
  getFriends(userId: number): Promise<User[]>;
  removeFriend(userId: number, friendId: number): Promise<void>;
}

// In-memory implementation
export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private moviesMap: Map<number, Movie>;
  private groupsMap: Map<number, Group>;
  private groupMembersMap: Map<number, GroupMember>;
  private friendRequestsMap: Map<number, FriendRequest>;
  private friendsMap: Map<number, Friend>;
  
  sessionStore: session.SessionStore;
  
  private userId: number;
  private movieId: number;
  private groupId: number;
  private groupMemberId: number;
  private friendRequestId: number;
  private friendId: number;

  constructor() {
    this.usersMap = new Map();
    this.moviesMap = new Map();
    this.groupsMap = new Map();
    this.groupMembersMap = new Map();
    this.friendRequestsMap = new Map();
    this.friendsMap = new Map();
    
    this.userId = 1;
    this.movieId = 1;
    this.groupId = 1;
    this.groupMemberId = 1;
    this.friendRequestId = 1;
    this.friendId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.usersMap.set(id, user);
    return user;
  }

  // Movie operations
  async getMovie(id: number): Promise<Movie | undefined> {
    return this.moviesMap.get(id);
  }

  async getMoviesByUser(userId: number): Promise<Movie[]> {
    return Array.from(this.moviesMap.values()).filter(
      (movie) => movie.proposerId === userId
    );
  }

  async getMoviesByGroup(groupId: number): Promise<Movie[]> {
    return Array.from(this.moviesMap.values()).filter(
      (movie) => movie.groupId === groupId
    );
  }

  async getUnwatchedMovies(): Promise<Movie[]> {
    return Array.from(this.moviesMap.values()).filter(
      (movie) => !movie.watched
    );
  }

  async createMovie(insertMovie: InsertMovie): Promise<Movie> {
    const id = this.movieId++;
    const movie: Movie = { 
      ...insertMovie, 
      id, 
      proposedAt: new Date(), 
      watched: false
    };
    this.moviesMap.set(id, movie);
    return movie;
  }

  async updateMovie(id: number, updates: Partial<Movie>): Promise<Movie | undefined> {
    const movie = this.moviesMap.get(id);
    if (!movie) return undefined;
    
    const updatedMovie = { ...movie, ...updates };
    this.moviesMap.set(id, updatedMovie);
    return updatedMovie;
  }

  // Group operations
  async getGroup(id: number): Promise<Group | undefined> {
    return this.groupsMap.get(id);
  }

  async getGroupsByUser(userId: number): Promise<Group[]> {
    const userGroupIds = Array.from(this.groupMembersMap.values())
      .filter(member => member.userId === userId)
      .map(member => member.groupId);
    
    return Array.from(this.groupsMap.values())
      .filter(group => userGroupIds.includes(group.id));
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const id = this.groupId++;
    const group: Group = { 
      ...insertGroup,
      id,
      currentProposerIndex: 0
    };
    this.groupsMap.set(id, group);
    return group;
  }

  async updateGroup(id: number, updates: Partial<Group>): Promise<Group | undefined> {
    const group = this.groupsMap.get(id);
    if (!group) return undefined;
    
    const updatedGroup = { ...group, ...updates };
    this.groupsMap.set(id, updatedGroup);
    return updatedGroup;
  }

  // Group member operations
  async addUserToGroup(insertGroupMember: InsertGroupMember): Promise<GroupMember> {
    const id = this.groupMemberId++;
    const groupMember: GroupMember = { ...insertGroupMember, id };
    this.groupMembersMap.set(id, groupMember);
    return groupMember;
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return Array.from(this.groupMembersMap.values()).filter(
      (member) => member.groupId === groupId
    );
  }

  async removeUserFromGroup(groupId: number, userId: number): Promise<void> {
    const groupMemberEntry = Array.from(this.groupMembersMap.entries()).find(
      ([_, member]) => member.groupId === groupId && member.userId === userId
    );
    
    if (groupMemberEntry) {
      this.groupMembersMap.delete(groupMemberEntry[0]);
    }
  }

  // Friend request operations
  async createFriendRequest(insertFriendRequest: InsertFriendRequest): Promise<FriendRequest> {
    const id = this.friendRequestId++;
    const friendRequest: FriendRequest = { 
      ...insertFriendRequest,
      id,
      status: "pending",
      createdAt: new Date()
    };
    this.friendRequestsMap.set(id, friendRequest);
    return friendRequest;
  }

  async getFriendRequestById(id: number): Promise<FriendRequest | undefined> {
    return this.friendRequestsMap.get(id);
  }

  async getPendingFriendRequests(userId: number): Promise<FriendRequest[]> {
    return Array.from(this.friendRequestsMap.values()).filter(
      (request) => request.toUserId === userId && request.status === "pending"
    );
  }

  async updateFriendRequestStatus(id: number, status: string): Promise<FriendRequest | undefined> {
    const request = this.friendRequestsMap.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { ...request, status };
    this.friendRequestsMap.set(id, updatedRequest);
    return updatedRequest;
  }

  // Friend operations
  async addFriend(insertFriend: InsertFriend): Promise<Friend> {
    const id = this.friendId++;
    const friend: Friend = { ...insertFriend, id };
    this.friendsMap.set(id, friend);
    return friend;
  }

  async getFriends(userId: number): Promise<User[]> {
    const friendIds = Array.from(this.friendsMap.values())
      .filter(friendship => friendship.userId === userId)
      .map(friendship => friendship.friendId);
    
    return Array.from(this.usersMap.values())
      .filter(user => friendIds.includes(user.id));
  }

  async removeFriend(userId: number, friendId: number): Promise<void> {
    const friendshipEntry = Array.from(this.friendsMap.entries()).find(
      ([_, friendship]) => 
        (friendship.userId === userId && friendship.friendId === friendId) ||
        (friendship.userId === friendId && friendship.friendId === userId)
    );
    
    if (friendshipEntry) {
      this.friendsMap.delete(friendshipEntry[0]);
    }
  }
}

export const storage = new MemStorage();
