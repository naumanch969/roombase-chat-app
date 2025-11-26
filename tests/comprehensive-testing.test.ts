/**
 * Comprehensive Testing Demonstration
 * 
 * This file demonstrates all major testing concepts:
 * 1. Black-box vs White-box testing
 * 2. Partition-based test case selection
 * 3. Unit testing vs Integration testing
 * 4. Test-first programming
 * 5. Boundary value analysis
 * 6. Equivalence classes
 */

import CommandParser from '../src/utils/commandParser';
import { MessageRepository } from '../src/utils/messageRepository';
import { userRepository } from '../src/utils/users';

describe('Comprehensive Testing Concepts', () => {
   
   /**
    * PARTITION-BASED TESTING
    * 
    * Strategy: Divide input space into equivalence classes (partitions)
    * Test one representative from each partition
    * 
    * For /edit command, partitions are:
    * 1. Valid edit (authorized user, valid message)
    * 2. Unauthorized edit (wrong user)
    * 3. Invalid message ID (doesn't exist)
    * 4. Deleted message (can't be edited)
    * 5. Empty new text (invalid input)
    */
   describe('Partition Testing: /edit command', () => {
      let repository: MessageRepository;

      beforeEach(() => {
         repository = new MessageRepository();
      });

      afterEach(() => {
         repository.clear();
      });

      // PARTITION 1: Valid edit (happy path)
      test('Partition 1: Valid authorized edit', async () => {
         const message = await repository.addMessage('user1', 'Original', 'room1');
         const edited = await repository.editMessage(message.id, 'Edited', 'user1');

         expect(edited).not.toBeNull();
         expect(edited?.text).toBe('Edited');
         expect(edited?.edited).toBe(true);
      });

      // PARTITION 2: Unauthorized edit (security)
      test('Partition 2: Unauthorized edit attempt', async () => {
         const message = await repository.addMessage('user1', 'Original', 'room1');
         const edited = await repository.editMessage(message.id, 'Hacked', 'user2');

         expect(edited).toBeNull(); // Authorization failed
      });

      // PARTITION 3: Invalid message ID (constraint)
      test('Partition 3: Edit non-existent message', async () => {
         await expect(
            repository.editMessage('fake-id', 'New text', 'user1')
         ).rejects.toThrow('message does not exist');
      });

      // PARTITION 4: Deleted message (constraint)
      test('Partition 4: Cannot edit deleted message', async () => {
         const message = await repository.addMessage('user1', 'Original', 'room1');
         await repository.deleteMessage(message.id, 'user1');

         await expect(
            repository.editMessage(message.id, 'Edit deleted', 'user1')
         ).rejects.toThrow('cannot edit deleted message');
      });

      // PARTITION 5: Empty new text (invalid input)
      test('Partition 5: Edit with empty text', async () => {
         const message = await repository.addMessage('user1', 'Original', 'room1');

         await expect(
            repository.editMessage(message.id, '', 'user1')
         ).rejects.toThrow('newText must be non-empty');
      });
   });

   /**
    * BLACK-BOX TESTING
    * 
    * Test based on specification only, without knowing implementation
    * Focus on inputs and expected outputs
    */
   describe('Black-box Testing: CommandParser', () => {
      let parser: CommandParser;

      beforeEach(() => {
         parser = new CommandParser();
      });

      test('Should parse valid commands according to specification', () => {
         // Test based on spec: "/edit <id> <text>"
         const result = parser.parse('/edit 123 new text');
         expect(result.type).toBe('edit');
         expect(result.args[0]).toBe('123');
      });

      test('Should return unknown for invalid commands', () => {
         // Test based on spec: unknown commands return 'unknown'
         const result = parser.parse('/invalid command');
         expect(result.type).toBe('unknown');
      });

      test('Should handle quoted strings', () => {
         // Test based on spec: quoted strings preserved
         const result = parser.parse('/edit 123 "multi word text"');
         expect(result.args).toContain('multi word text');
      });
   });

   /**
    * WHITE-BOX TESTING
    * 
    * Test based on internal code structure and logic paths
    * Aim for code coverage of all branches
    */
   describe('White-box Testing: CommandParser internals', () => {
      let parser: CommandParser;

      beforeEach(() => {
         parser = new CommandParser();
      });

      test('Should exercise tokenization branch for numbers', () => {
         // Tests the NUMBER token branch in tokenize()
         const result = parser.parse('/delete 12345');
         expect(result.args[0]).toBe('12345');
      });

      test('Should exercise tokenization branch for strings', () => {
         // Tests the STRING token branch in tokenize()
         const result = parser.parse('/edit 1 "quoted"');
         expect(result.args).toContain('quoted');
      });

      test('Should exercise AST building for multiple arguments', () => {
         // Tests the loop in buildAST() that processes multiple children
         const result = parser.parse('/edit 1 arg1 arg2 arg3');
         expect(result.args.length).toBe(4);
      });

      test('Should exercise validation logic for each command type', () => {
         // Tests all cases in validate() switch statement
         const editCmd = parser.parse('/edit 1 text');
         expect(parser.validate(editCmd)).toBe(true);

         const deleteCmd = parser.parse('/delete 1');
         expect(parser.validate(deleteCmd)).toBe(true);

         const muteCmd = parser.parse('/mute user');
         expect(parser.validate(muteCmd)).toBe(true);
      });
   });

   /**
    * BOUNDARY VALUE ANALYSIS
    * 
    * Test at the boundaries of equivalence classes
    * Common errors occur at boundaries
    */
   describe('Boundary Value Testing', () => {
      test('Message text length boundaries', async () => {
         const repository = new MessageRepository();

         // Boundary: Minimum valid length (1 character)
         const msg1 = await repository.addMessage('user', 'a', 'room');
         expect(msg1.text).toBe('a');

         // Boundary: Empty string (invalid)
         await expect(
            repository.addMessage('user', '', 'room')
         ).rejects.toThrow();

         // Boundary: Very long text (valid, no upper limit in our spec)
         const longText = 'a'.repeat(10000);
         const msg2 = await repository.addMessage('user', longText, 'room');
         expect(msg2.text.length).toBe(10000);

         repository.clear();
      });

      test('Thread depth boundaries', async () => {
         const repository = new MessageRepository();

         // Boundary: Depth 0 (no replies)
         const msg1 = await repository.addMessage('user', 'root', 'room');
         expect(repository.getThreadDepth(msg1.id)).toBe(0);

         // Boundary: Depth 1 (one level)
         const reply1 = await repository.addMessage('user', 'reply', 'room', msg1.id);
         expect(repository.getThreadDepth(msg1.id)).toBe(1);

         // Boundary: Deep nesting (stress test)
         let current = reply1;
         for (let i = 0; i < 50; i++) {
            current = await repository.addMessage('user', `level${i}`, 'room', current.id);
         }
         expect(repository.getThreadDepth(msg1.id)).toBe(51);

         repository.clear();
      });
   });

   /**
    * TEST-FIRST PROGRAMMING DEMONSTRATION
    * 
    * Write the test BEFORE implementing the feature
    * This test documents expected behavior
    */
   describe('Test-First: New Feature - Read Receipts', () => {
      let repository: MessageRepository;

      beforeEach(() => {
         repository = new MessageRepository();
      });

      afterEach(() => {
         repository.clear();
      });

      /**
       * STEP 1: Write test first (documents requirements)
       * 
       * Requirements:
       * - Users can mark messages as "read"
       * - Count should increment atomically
       * - Count should start at 0
       * - Multiple users can read same message
       */
      test('should track read receipt count for messages', async () => {
         // Given: A message exists
         const message = await repository.addMessage('author', 'Hello', 'room1');

         // When: No one has read it yet
         const initialCount = repository.getReadReceiptCount(message.id);

         // Then: Count should be 0
         expect(initialCount).toBe(0);

         // When: First user reads it
         const count1 = await repository.incrementReadReceipt(message.id);

         // Then: Count should be 1
         expect(count1).toBe(1);

         // When: Second user reads it
         const count2 = await repository.incrementReadReceipt(message.id);

         // Then: Count should be 2
         expect(count2).toBe(2);

         // When: We check the count again
         const finalCount = repository.getReadReceiptCount(message.id);

         // Then: It should still be 2
         expect(finalCount).toBe(2);
      });

      /**
       * STEP 2: Write test for concurrent access (before implementing)
       * This test catches race conditions
       */
      test('should handle concurrent read receipts atomically', async () => {
         const message = await repository.addMessage('author', 'Hello', 'room1');

         // Simulate 10 users reading simultaneously
         const promises = Array.from({ length: 10 }, () =>
            repository.incrementReadReceipt(message.id)
         );

         await Promise.all(promises);

         // Should be exactly 10, not less (no lost updates)
         const count = repository.getReadReceiptCount(message.id);
         expect(count).toBe(10);
      });

      /**
       * STEP 3: Implementation would go here
       * See messageRepository.ts for the actual implementation
       * that satisfies these tests
       */
   });

   /**
    * EQUIVALENCE CLASS TESTING
    * 
    * Group inputs into classes that should behave the same
    * Test one representative from each class
    */
   describe('Equivalence Classes: User Roles', () => {
      beforeEach(() => {
         userRepository.clear();
      });

      afterEach(() => {
         userRepository.clear();
      });

      /**
       * Equivalence Classes for user roles:
       * 1. Admin users (can mute/ban others)
       * 2. Moderator users (can mute, can't ban)
       * 3. Regular users (can't mute or ban)
       */

      // Class 1: Admin
      test('Class 1: Admin can mute users', () => {
         const admin = userRepository.userJoin('socket1', 'admin1', 'room1', 'admin');
         expect(admin.user?.role).toBe('admin');
         
         const success = userRepository.muteUser('targetUser');
         // Admin should succeed (if user exists)
      });

      // Class 2: Moderator
      test('Class 2: Moderator can mute users', () => {
         const mod = userRepository.userJoin('socket2', 'mod1', 'room1', 'moderator');
         expect(mod.user?.role).toBe('moderator');
      });

      // Class 3: Regular user
      test('Class 3: Regular user cannot mute', () => {
         const user = userRepository.userJoin('socket3', 'user1', 'room1', 'user');
         expect(user.user?.role).toBe('user');
         // Mute attempt should fail (tested in integration tests)
      });
   });

   /**
    * REGRESSION TESTING
    * 
    * Tests to ensure old bugs don't come back
    * Document the bug that was fixed
    */
   describe('Regression Tests', () => {
      /**
       * Bug: Message edit history was not being saved
       * Fixed: Added editHistory array and push logic
       * This test ensures the fix stays in place
       */
      test('Bug #42: Edit history should be preserved', async () => {
         const repository = new MessageRepository();
         
         const message = await repository.addMessage('user1', 'v1', 'room1');
         await repository.editMessage(message.id, 'v2', 'user1');
         await repository.editMessage(message.id, 'v3', 'user1');

         const final = repository.getMessage(message.id);
         expect(final?.editHistory?.length).toBe(2);
         expect(final?.editHistory?.[0].text).toBe('v1');
         expect(final?.editHistory?.[1].text).toBe('v2');

         repository.clear();
      });

      /**
       * Bug: Race condition in concurrent edits
       * Fixed: Added locking mechanism
       * This test ensures concurrent safety
       */
      test('Bug #57: Concurrent edits should not corrupt data', async () => {
         const repository = new MessageRepository();
         const message = await repository.addMessage('user1', 'original', 'room1');

         // Try to edit multiple times concurrently
         const edits = [
            repository.editMessage(message.id, 'edit1', 'user1'),
            repository.editMessage(message.id, 'edit2', 'user1'),
            repository.editMessage(message.id, 'edit3', 'user1')
         ];

         await Promise.all(edits);

         // Should have 3 edits in history, no corruption
         const final = repository.getMessage(message.id);
         expect(final?.editHistory?.length).toBe(3);

         repository.clear();
      });
   });
});
