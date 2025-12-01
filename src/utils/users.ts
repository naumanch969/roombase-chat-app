import { User, UserJoinResult } from "../types/index";

/**
 * User Repository ADT (Abstract Data Type)
 * Manages user state with proper abstractions and invariants
 * 
 * Abstraction Function:
 * AF(users) = A collection of active chat users where:
 *   - Each user has a unique socket ID
 *   - Usernames are unique (case-insensitive)
 *   - Each user is assigned to a room
 *   - Users can have roles: admin, moderator, or user
 *   - Users can be muted or banned
 * 
 * Representation Invariant:
 * - All socket IDs are unique
 * - All usernames are unique (case-insensitive)
 * - room is non-empty string
 * - Muted/banned users remain in the collection
 */
class UserRepository {
   private users: Map<string, User>; // socketId -> User
   private usernameIndex: Map<string, string>; // lowercase username -> socketId

   /**
    * Constructor
    * Postconditions:
    * - users map is empty
    * - usernameIndex is empty
    */
   constructor() {
      this.users = new Map();
      this.usernameIndex = new Map();
      this.checkRep();
   }

   /**
    * Check representation invariant
    */
   private checkRep(): void {
      // Check uniqueness of ids
      const socketIds = new Set<string>();
      const usernames = new Set<string>();

      for (const [id, user] of this.users) {
         if (socketIds.has(id)) {
            throw new Error('Invariant violation: duplicate socket ID');
         }
         socketIds.add(id);

         const lowerUsername = user.username.toLowerCase();
         if (usernames.has(lowerUsername)) {
            throw new Error('Invariant violation: duplicate username');
         }
         usernames.add(lowerUsername);

         if (!user.room || user.room.length === 0) {
            throw new Error('Invariant violation: room must be non-empty');
         }
      }

      // Check username index consistency
      if (this.usernameIndex.size !== this.users.size) {
         throw new Error('Invariant violation: username index size mismatch');
      }
   }

   /**
    * Adds a user to the chat when they join a room
    * Prevents duplicate usernames (case-insensitive)
    * 
    * @param id - Socket ID of the user
    * @param username - Username of the user
    * @param room - Room name to join
    * @param role - Optional user role (default: 'user')
    * @returns Object containing error or the created user
    * 
    * Preconditions:
    * - id !== null && id.length > 0
    * - username !== null && username.length > 0
    * - room !== null && room.length > 0
    * - Socket ID is not already in use
    * 
    * Postconditions:
    * - If successful: user is added to repository
    * - If username taken: returns error message
    * - checkRep() passes
    */
   public userJoin(
      id: string,
      username: string,
      room: string,
      role: 'admin' | 'moderator' | 'user' = 'user'
   ): UserJoinResult {
      // Precondition checks
      if (!id || id.length === 0) {
         throw new Error('Precondition violated: id must be non-empty');
      }
      if (!username || username.length === 0) {
         throw new Error('Precondition violated: username must be non-empty');
      }
      if (!room || room.length === 0) {
         throw new Error('Precondition violated: room must be non-empty');
      }
      if (this.users.has(id)) {
         throw new Error('Precondition violated: socket ID already in use');
      }

      // Check for duplicate username
      const lowerUsername = username.toLowerCase();
      if (this.usernameIndex.has(lowerUsername)) {
         return { error: "Username is already taken" };
      }

      const user: User = {
         id,
         username,
         room,
         role,
         muted: false,
         banned: false
      };

      this.users.set(id, user);
      this.usernameIndex.set(lowerUsername, id);

      this.checkRep();
      return { user };
   }

   /**
    * Gets current user by socket ID
    * @param id - Socket ID of the user
    * @returns User object or undefined if not found
    */
   public getCurrentUser(id: string): User | undefined {
      return this.users.get(id);
   }

   /**
    * Get user by username (case-insensitive)
    * @param username - Username to find
    * @returns User object or undefined
    */
   public getUserByUsername(username: string): User | undefined {
      const socketId = this.usernameIndex.get(username.toLowerCase());
      return socketId ? this.users.get(socketId) : undefined;
   }

   /**
    * Mute a user
    * @param username - Username to mute
    * @returns true if muted, false if user not found
    */
   public muteUser(username: string): boolean {
      const user = this.getUserByUsername(username);
      if (!user) {
         return false;
      }
      user.muted = true;
      return true;
   }

   /**
    * Unmute a user
    * @param username - Username to unmute
    * @returns true if unmuted, false if user not found
    */
   public unmuteUser(username: string): boolean {
      const user = this.getUserByUsername(username);
      if (!user) {
         return false;
      }
      user.muted = false;
      return true;
   }

   /**
    * Ban a user
    * @param username - Username to ban
    * @returns true if banned, false if user not found
    */
   public banUser(username: string): boolean {
      const user = this.getUserByUsername(username);
      if (!user) {
         return false;
      }
      user.banned = true;
      return true;
   }

   /**
    * Removes user from chat when they disconnect
    * 
    * @param id - Socket ID of the user
    * @returns User object if removed, undefined if not found
    * 
    * Postconditions:
    * - User is removed from repository
    * - Username index is updated
    * - checkRep() passes
    */
   public userLeave(id: string): User | undefined {
      const user = this.users.get(id);

      if (user) {
         this.users.delete(id);
         this.usernameIndex.delete(user.username.toLowerCase());
         this.checkRep();
         return user;
      }

      return undefined;
   }

   /**
    * Gets all users in a specific room
    * @param room - Room name
    * @returns Array of users in the room
    */
   public getRoomUsers(room: string): User[] {
      const roomUsers: User[] = [];
      for (const user of this.users.values()) {
         if (user.room === room) {
            roomUsers.push(user);
         }
      }
      return roomUsers;
   }

   /**
    * Clear all users (for testing)
    */
   public clear(): void {
      this.users.clear();
      this.usernameIndex.clear();
      this.checkRep();
   }
}

// Export singleton instance and class
export const userRepository = new UserRepository();
export { UserRepository };

// Export legacy function wrappers for backward compatibility
export function userJoin(id: string, username: string, room: string): UserJoinResult {
   return userRepository.userJoin(id, username, room);
}

export function getCurrentUser(id: string): User | undefined {
   return userRepository.getCurrentUser(id);
}

export function userLeave(id: string): User | undefined {
   return userRepository.userLeave(id);
}

export function getRoomUsers(room: string): User[] {
   return userRepository.getRoomUsers(room);
}
