/**
 * Tests for Recursive Features
 * Demonstrates recursion concepts:
 * - Recursive data types (Message with replies)
 * - Recursive subproblems (search, depth calculation)
 * - Base cases and recursive cases
 */

import { MessageRepository } from '../src/utils/messageRepository';

describe('Recursive Features Tests', () => {
   let repository: MessageRepository;

   beforeEach(() => {
      repository = new MessageRepository();
   });

   afterEach(() => {
      repository.clear();
   });

   describe('Recursive Data Type: Message Threads', () => {
      /**
       * Test recursive data structure:
       * Message { content, replies: Message[] }
       */
      test('should create nested message structure', async () => {
         // Create tree:
         //       Root
         //      /    \
         //   Reply1  Reply2
         //     |
         //  Nested

         const root = await repository.addMessage('user1', 'Root message', 'room1');
         const reply1 = await repository.addMessage('user2', 'First reply', 'room1', root.id);
         const reply2 = await repository.addMessage('user3', 'Second reply', 'room1', root.id);
         const nested = await repository.addMessage('user4', 'Nested reply', 'room1', reply1.id);

         // Verify structure
         expect(root.replies).toHaveLength(2);
         expect(reply1.replies).toHaveLength(1);
         expect(reply2.replies).toHaveLength(0);
      });

      /**
       * Base case: Message with no replies
       */
      test('should handle base case: message with no replies', async () => {
         const message = await repository.addMessage('user1', 'Single message', 'room1');
         
         expect(message.replies).toHaveLength(0);
         expect(message.parentId).toBeUndefined();
      });
   });

   describe('Recursive Search: searchMessages()', () => {
      /**
       * Tests recursive subproblem:
       * - Base case: Search in message text
       * - Recursive case: Search in message text + recurse on all replies
       */
      test('should find keyword in root message', async () => {
         const message = await repository.addMessage('user1', 'Contains keyword', 'room1');

         const results = repository.searchMessages('keyword', 'room1');

         expect(results).toHaveLength(1);
         expect(results[0].id).toBe(message.id);
      });

      test('should find keyword in nested replies', async () => {
         // Create structure:
         //   Root
         //    |
         //   Reply1 (contains "target")
         //    |
         //   Nested (contains "target")

         const root = await repository.addMessage('user1', 'Root message', 'room1');
         const reply1 = await repository.addMessage('user2', 'Reply with target', 'room1', root.id);
         const nested = await repository.addMessage('user3', 'Nested target here', 'room1', reply1.id);

         const results = repository.searchMessages('target', 'room1');

         expect(results).toHaveLength(2);
         expect(results.map(r => r.text)).toContain('Reply with target');
         expect(results.map(r => r.text)).toContain('Nested target here');
      });

      test('should handle base case: no replies to search', async () => {
         const message = await repository.addMessage('user1', 'Single message', 'room1');

         const results = repository.searchMessages('message', 'room1');

         expect(results).toHaveLength(1);
      });

      test('should handle empty search results', async () => {
         await repository.addMessage('user1', 'Hello world', 'room1');

         const results = repository.searchMessages('nonexistent', 'room1');

         expect(results).toHaveLength(0);
      });
   });

   describe('Recursive Depth Calculation: getThreadDepth()', () => {
      /**
       * Tests recursive depth calculation:
       * - Base case: No replies → depth = 0
       * - Recursive case: 1 + max(depth of all replies)
       */
      test('should calculate depth 0 for single message', async () => {
         const message = await repository.addMessage('user1', 'Single', 'room1');

         const depth = repository.getThreadDepth(message.id);

         expect(depth).toBe(0);
      });

      test('should calculate depth 1 for one level of replies', async () => {
         const root = await repository.addMessage('user1', 'Root', 'room1');
         await repository.addMessage('user2', 'Reply1', 'room1', root.id);
         await repository.addMessage('user3', 'Reply2', 'room1', root.id);

         const depth = repository.getThreadDepth(root.id);

         expect(depth).toBe(1);
      });

      test('should calculate depth for deep nested structure', async () => {
         // Create chain: Root → L1 → L2 → L3
         const root = await repository.addMessage('user1', 'Root', 'room1');
         const l1 = await repository.addMessage('user2', 'Level 1', 'room1', root.id);
         const l2 = await repository.addMessage('user3', 'Level 2', 'room1', l1.id);
         const l3 = await repository.addMessage('user4', 'Level 3', 'room1', l2.id);

         const depth = repository.getThreadDepth(root.id);

         expect(depth).toBe(3);
      });

      test('should calculate max depth with branching', async () => {
         // Create structure:
         //       Root (depth 2)
         //      /    \
         //   L1a     L1b (depth 1)
         //     |       |
         //   L2a     L2b

         const root = await repository.addMessage('user1', 'Root', 'room1');
         const l1a = await repository.addMessage('user2', 'L1a', 'room1', root.id);
         const l1b = await repository.addMessage('user3', 'L1b', 'room1', root.id);
         const l2a = await repository.addMessage('user4', 'L2a', 'room1', l1a.id);
         const l2b = await repository.addMessage('user5', 'L2b', 'room1', l1b.id);

         const depth = repository.getThreadDepth(root.id);

         expect(depth).toBe(2); // Max of both branches
      });

      test('should return -1 for non-existent message', () => {
         const depth = repository.getThreadDepth('nonexistent');

         expect(depth).toBe(-1);
      });
   });

   describe('Choosing the Right Recursive Subproblem', () => {
      /**
       * This test demonstrates proper recursive decomposition
       * WRONG: Search entire tree repeatedly (exponential time)
       * RIGHT: Search each node once, decompose into smaller subproblems
       */
      test('should efficiently search without revisiting nodes', async () => {
         // Create complex structure
         const root = await repository.addMessage('user1', 'Root', 'room1');
         
         for (let i = 0; i < 5; i++) {
            const reply = await repository.addMessage(`user${i}`, `Reply ${i}`, 'room1', root.id);
            for (let j = 0; j < 3; j++) {
               await repository.addMessage(`user${i}-${j}`, `Nested ${j}`, 'room1', reply.id);
            }
         }

         // Search should visit each node exactly once
         const results = repository.searchMessages('Reply', 'room1');

         // Should find 5 replies (not exponential duplicates)
         expect(results).toHaveLength(5);
      });
   });
});
