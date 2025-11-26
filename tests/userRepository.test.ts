/**
 * Unit Tests for User Repository ADT
 * Tests abstraction, invariants, and user management
 */

import { userRepository, UserRepository } from '../src/utils/users';

describe('UserRepository', () => {
   let repository: UserRepository;

   beforeEach(() => {
      repository = new UserRepository();
   });

   afterEach(() => {
      repository.clear();
   });

   describe('userJoin() - Specification Testing', () => {
      test('should add user successfully', () => {
         const result = repository.userJoin('socket1', 'user1', 'room1');

         expect(result.error).toBeUndefined();
         expect(result.user).toBeDefined();
         expect(result.user!.id).toBe('socket1');
         expect(result.user!.username).toBe('user1');
         expect(result.user!.room).toBe('room1');
      });

      test('should prevent duplicate usernames (case-insensitive)', () => {
         repository.userJoin('socket1', 'TestUser', 'room1');
         const result = repository.userJoin('socket2', 'testuser', 'room1');

         expect(result.error).toBe('Username is already taken');
         expect(result.user).toBeUndefined();
      });

      test('should allow same username in different rooms after first user leaves', () => {
         repository.userJoin('socket1', 'user1', 'room1');
         repository.userLeave('socket1');
         
         const result = repository.userJoin('socket2', 'user1', 'room2');

         expect(result.error).toBeUndefined();
         expect(result.user).toBeDefined();
      });

      test('should enforce precondition: id non-empty', () => {
         expect(() => {
            repository.userJoin('', 'user1', 'room1');
         }).toThrow('Precondition violated: id must be non-empty');
      });

      test('should enforce precondition: username non-empty', () => {
         expect(() => {
            repository.userJoin('socket1', '', 'room1');
         }).toThrow('Precondition violated: username must be non-empty');
      });

      test('should enforce precondition: room non-empty', () => {
         expect(() => {
            repository.userJoin('socket1', 'user1', '');
         }).toThrow('Precondition violated: room must be non-empty');
      });

      test('should set default role to user', () => {
         const result = repository.userJoin('socket1', 'user1', 'room1');

         expect(result.user!.role).toBe('user');
         expect(result.user!.muted).toBe(false);
         expect(result.user!.banned).toBe(false);
      });

      test('should allow setting custom role', () => {
         const result = repository.userJoin('socket1', 'admin1', 'room1', 'admin');

         expect(result.user!.role).toBe('admin');
      });
   });

   describe('getCurrentUser()', () => {
      test('should retrieve user by socket ID', () => {
         repository.userJoin('socket1', 'user1', 'room1');
         const user = repository.getCurrentUser('socket1');

         expect(user).toBeDefined();
         expect(user!.username).toBe('user1');
      });

      test('should return undefined for non-existent socket', () => {
         const user = repository.getCurrentUser('nonexistent');

         expect(user).toBeUndefined();
      });
   });

   describe('getUserByUsername()', () => {
      test('should retrieve user by username', () => {
         repository.userJoin('socket1', 'TestUser', 'room1');
         const user = repository.getUserByUsername('TestUser');

         expect(user).toBeDefined();
         expect(user!.id).toBe('socket1');
      });

      test('should be case-insensitive', () => {
         repository.userJoin('socket1', 'TestUser', 'room1');
         const user = repository.getUserByUsername('testuser');

         expect(user).toBeDefined();
      });

      test('should return undefined for non-existent user', () => {
         const user = repository.getUserByUsername('nonexistent');

         expect(user).toBeUndefined();
      });
   });

   describe('muteUser()', () => {
      test('should mute user successfully', () => {
         repository.userJoin('socket1', 'user1', 'room1');
         const success = repository.muteUser('user1');

         expect(success).toBe(true);

         const user = repository.getCurrentUser('socket1');
         expect(user!.muted).toBe(true);
      });

      test('should return false for non-existent user', () => {
         const success = repository.muteUser('nonexistent');

         expect(success).toBe(false);
      });
   });

   describe('unmuteUser()', () => {
      test('should unmute user successfully', () => {
         repository.userJoin('socket1', 'user1', 'room1');
         repository.muteUser('user1');
         const success = repository.unmuteUser('user1');

         expect(success).toBe(true);

         const user = repository.getCurrentUser('socket1');
         expect(user!.muted).toBe(false);
      });
   });

   describe('banUser()', () => {
      test('should ban user successfully', () => {
         repository.userJoin('socket1', 'user1', 'room1');
         const success = repository.banUser('user1');

         expect(success).toBe(true);

         const user = repository.getCurrentUser('socket1');
         expect(user!.banned).toBe(true);
      });

      test('should return false for non-existent user', () => {
         const success = repository.banUser('nonexistent');

         expect(success).toBe(false);
      });
   });

   describe('userLeave()', () => {
      test('should remove user successfully', () => {
         repository.userJoin('socket1', 'user1', 'room1');
         const user = repository.userLeave('socket1');

         expect(user).toBeDefined();
         expect(user!.username).toBe('user1');

         // Verify user is removed
         const removed = repository.getCurrentUser('socket1');
         expect(removed).toBeUndefined();
      });

      test('should allow username reuse after user leaves', () => {
         repository.userJoin('socket1', 'user1', 'room1');
         repository.userLeave('socket1');

         const result = repository.userJoin('socket2', 'user1', 'room1');
         expect(result.error).toBeUndefined();
      });

      test('should return undefined for non-existent socket', () => {
         const user = repository.userLeave('nonexistent');

         expect(user).toBeUndefined();
      });
   });

   describe('getRoomUsers()', () => {
      test('should return all users in a room', () => {
         repository.userJoin('socket1', 'user1', 'room1');
         repository.userJoin('socket2', 'user2', 'room1');
         repository.userJoin('socket3', 'user3', 'room2');

         const room1Users = repository.getRoomUsers('room1');

         expect(room1Users.length).toBe(2);
         expect(room1Users.map((u: any) => u.username)).toContain('user1');
         expect(room1Users.map((u: any) => u.username)).toContain('user2');
      });

      test('should return empty array for empty room', () => {
         const users = repository.getRoomUsers('emptyroom');

         expect(users).toEqual([]);
      });
   });

   describe('Invariant Testing', () => {
      test('should maintain unique socket IDs', () => {
         repository.userJoin('socket1', 'user1', 'room1');

         expect(() => {
            repository.userJoin('socket1', 'user2', 'room1');
         }).toThrow('Precondition violated: socket ID already in use');
      });

      test('should maintain unique usernames', () => {
         repository.userJoin('socket1', 'user1', 'room1');
         const result = repository.userJoin('socket2', 'user1', 'room1');

         expect(result.error).toBeDefined();
      });

      test('should maintain room non-empty invariant', () => {
         // This is tested via preconditions
         expect(() => {
            repository.userJoin('socket1', 'user1', '');
         }).toThrow();
      });
   });
});
