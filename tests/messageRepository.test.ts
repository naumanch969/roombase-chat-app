/**
 * Unit Tests for Message Repository
 * Tests ADT implementation, mutability, and concurrency
 * 
 * Test Strategy:
 * - Test representation invariants
 * - Test preconditions and postconditions
 * - Test concurrent operations
 * - Test mutation operations (edit, delete)
 */

import { MessageRepository } from '../src/utils/messageRepository';

describe('MessageRepository', () => {
   let repository: MessageRepository;

   beforeEach(() => {
      repository = new MessageRepository();
   });

   afterEach(() => {
      repository.clear();
   });

   describe('addMessage() - Specification Testing', () => {
      test('should add message with valid parameters', async () => {
         const message = await repository.addMessage('user1', 'Hello world', 'room1');

         expect(message.id).toBeDefined();
         expect(message.username).toBe('user1');
         expect(message.text).toBe('Hello world');
         expect(message.room).toBe('room1');
         expect(message.deleted).toBe(false);
         expect(message.edited).toBe(false);
      });

      test('should enforce precondition: username non-empty', async () => {
         await expect(
            repository.addMessage('', 'Hello', 'room1')
         ).rejects.toThrow('Precondition violated: username must be non-empty');
      });

      test('should enforce precondition: text non-empty', async () => {
         await expect(
            repository.addMessage('user1', '', 'room1')
         ).rejects.toThrow('Precondition violated: text must be non-empty');
      });

      test('should enforce precondition: room non-empty', async () => {
         await expect(
            repository.addMessage('user1', 'Hello', '')
         ).rejects.toThrow('Precondition violated: room must be non-empty');
      });

      test('should generate unique message IDs', async () => {
         const msg1 = await repository.addMessage('user1', 'Message 1', 'room1');
         const msg2 = await repository.addMessage('user1', 'Message 2', 'room1');

         expect(msg1.id).not.toBe(msg2.id);
      });

      test('should associate message with room', async () => {
         await repository.addMessage('user1', 'Message 1', 'room1');
         await repository.addMessage('user2', 'Message 2', 'room1');

         const messages = repository.getMessagesForRoom('room1');
         expect(messages.length).toBe(2);
      });
   });

   describe('editMessage() - Mutability Testing', () => {
      test('should edit message successfully', async () => {
         const original = await repository.addMessage('user1', 'Original text', 'room1');
         const edited = await repository.editMessage(original.id, 'Edited text', 'user1');

         expect(edited).not.toBeNull();
         expect(edited!.text).toBe('Edited text');
         expect(edited!.edited).toBe(true);
         expect(edited!.editHistory!.length).toBe(1);
         expect(edited!.editHistory![0].text).toBe('Original text');
      });

      test('should prevent editing messages by other users', async () => {
         const message = await repository.addMessage('user1', 'Original', 'room1');
         const result = await repository.editMessage(message.id, 'Hacked', 'user2');

         expect(result).toBeNull();
      });

      test('should enforce precondition: messageId not null', async () => {
         await expect(
            repository.editMessage(null as any, 'text', 'user1')
         ).rejects.toThrow('Precondition violated: messageId cannot be null');
      });

      test('should enforce precondition: newText non-empty', async () => {
         const message = await repository.addMessage('user1', 'Original', 'room1');

         await expect(
            repository.editMessage(message.id, '', 'user1')
         ).rejects.toThrow('Precondition violated: newText must be non-empty');
      });

      test('should maintain edit history chronologically', async () => {
         const message = await repository.addMessage('user1', 'Version 1', 'room1');
         
         await new Promise(resolve => setTimeout(resolve, 10));
         await repository.editMessage(message.id, 'Version 2', 'user1');
         
         await new Promise(resolve => setTimeout(resolve, 10));
         await repository.editMessage(message.id, 'Version 3', 'user1');

         const edited = repository.getMessage(message.id);
         expect(edited!.editHistory!.length).toBe(2);
         expect(edited!.editHistory![0].timestamp).toBeLessThan(edited!.editHistory![1].timestamp);
      });

      test('should not allow editing deleted messages', async () => {
         const message = await repository.addMessage('user1', 'Original', 'room1');
         await repository.deleteMessage(message.id, 'user1');

         await expect(
            repository.editMessage(message.id, 'New text', 'user1')
         ).rejects.toThrow('Precondition violated: cannot edit deleted message');
      });
   });

   describe('deleteMessage() - Mutability Testing', () => {
      test('should soft delete message', async () => {
         const message = await repository.addMessage('user1', 'To delete', 'room1');
         const success = await repository.deleteMessage(message.id, 'user1');

         expect(success).toBe(true);

         const deleted = repository.getMessage(message.id);
         expect(deleted!.deleted).toBe(true);
         expect(deleted!.text).toBe('[Message deleted]');
      });

      test('should prevent deleting messages by other users', async () => {
         const message = await repository.addMessage('user1', 'Message', 'room1');
         const success = await repository.deleteMessage(message.id, 'user2');

         expect(success).toBe(false);
      });

      test('should not include deleted messages in room messages', async () => {
         const msg1 = await repository.addMessage('user1', 'Message 1', 'room1');
         await repository.addMessage('user1', 'Message 2', 'room1');
         
         await repository.deleteMessage(msg1.id, 'user1');

         const messages = repository.getMessagesForRoom('room1');
         expect(messages.length).toBe(1);
         expect(messages[0].text).toBe('Message 2');
      });
   });

   describe('Threading and Recursion Testing', () => {
      test('should add reply with parent reference', async () => {
         const parent = await repository.addMessage('user1', 'Parent message', 'room1');
         const reply = await repository.addMessage('user2', 'Reply message', 'room1', parent.id);

         expect(reply.parentId).toBe(parent.id);
      });

      test('should enforce parent exists precondition', async () => {
         await expect(
            repository.addMessage('user1', 'Reply', 'room1', 'nonexistent-id')
         ).rejects.toThrow('Precondition violated: parent message does not exist');
      });

      test('should populate replies in parent message', async () => {
         const parent = await repository.addMessage('user1', 'Parent', 'room1');
         await repository.addMessage('user2', 'Reply 1', 'room1', parent.id);
         await repository.addMessage('user3', 'Reply 2', 'room1', parent.id);

         const updated = repository.getMessage(parent.id);
         expect(updated!.replies!.length).toBe(2);
      });

      test('should support nested replies (recursion)', async () => {
         const parent = await repository.addMessage('user1', 'Parent', 'room1');
         const reply1 = await repository.addMessage('user2', 'Reply 1', 'room1', parent.id);
         const reply2 = await repository.addMessage('user3', 'Reply to Reply', 'room1', reply1.id);

         expect(reply2.parentId).toBe(reply1.id);
         expect(reply1.parentId).toBe(parent.id);
      });

      test('should get message thread with nested replies', async () => {
         const parent = await repository.addMessage('user1', 'Parent', 'room1');
         await repository.addMessage('user2', 'Reply 1', 'room1', parent.id);
         await repository.addMessage('user3', 'Reply 2', 'room1', parent.id);

         const thread = repository.getMessageThread(parent.id);
         expect(thread).toBeDefined();
         expect(thread!.replies!.length).toBe(2);
      });

      test('should filter deleted replies from thread', async () => {
         const parent = await repository.addMessage('user1', 'Parent', 'room1');
         const reply1 = await repository.addMessage('user2', 'Reply 1', 'room1', parent.id);
         await repository.addMessage('user3', 'Reply 2', 'room1', parent.id);

         await repository.deleteMessage(reply1.id, 'user2');

         const thread = repository.getMessageThread(parent.id);
         expect(thread!.replies!.length).toBe(1);
      });
   });

   describe('Concurrency Testing', () => {
      test('should handle concurrent message additions', async () => {
         const promises = [];
         for (let i = 0; i < 10; i++) {
            promises.push(repository.addMessage(`user${i}`, `Message ${i}`, 'room1'));
         }

         const messages = await Promise.all(promises);
         
         // All messages should have unique IDs
         const ids = new Set(messages.map(m => m.id));
         expect(ids.size).toBe(10);
      });

      test('should handle concurrent edits atomically', async () => {
         const message = await repository.addMessage('user1', 'Original', 'room1');

         // Try concurrent edits (only one should succeed due to locking)
         const edit1 = repository.editMessage(message.id, 'Edit 1', 'user1');
         const edit2 = repository.editMessage(message.id, 'Edit 2', 'user1');

         await Promise.all([edit1, edit2]);

         const final = repository.getMessage(message.id);
         // Text should be one of the edits, not corrupted
         expect(['Edit 1', 'Edit 2']).toContain(final!.text);
      });
   });

   describe('Invariant Testing', () => {
      test('should maintain unique message IDs invariant', async () => {
         for (let i = 0; i < 5; i++) {
            await repository.addMessage('user1', `Message ${i}`, 'room1');
         }

         const messages = repository.getMessagesForRoom('room1');
         const ids = messages.map(m => m.id);
         const uniqueIds = new Set(ids);

         expect(uniqueIds.size).toBe(ids.length);
      });

      test('should maintain timestamp validity invariant', async () => {
         const message = await repository.addMessage('user1', 'Test', 'room1');
         
         expect(message.timestamp).toBeGreaterThan(0);
         expect(message.timestamp).toBeLessThanOrEqual(Date.now());
      });
   });
});
