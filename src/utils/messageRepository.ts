/**
 * Message Repository ADT (Abstract Data Type)
 * Implements message management with:
 * - Abstraction: Hides internal representation
 * - Mutability: Controls message edits and deletes with invariants
 * - Specifications: Clear preconditions and postconditions
 * - Concurrency: Thread-safe operations
 */

import moment from 'moment-timezone';
import { Message, MessageEdit } from '../types/index';

/**
 * Generate a unique ID for messages
 * Uses timestamp and random number to ensure uniqueness
 */
function generateId(): string {
   return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * MessageRepository Class
 * Abstract Data Type for managing chat messages
 * 
 * Abstraction Function:
 * AF(messages) = A collection of chat messages where:
 *   - Each message has a unique ID
 *   - Messages can be edited with history tracking
 *   - Messages can be soft-deleted (marked as deleted)
 *   - Messages can have parent-child relationships for threading
 * 
 * Representation Invariant:
 * - All message IDs are unique
 * - Deleted messages remain in store but are marked deleted
 * - Edit history is chronologically ordered
 * - Parent message must exist before adding a reply
 * - timestamp is always > 0
 */
export class MessageRepository {
   // Private representation
   private messages: Map<string, Message>;
   private messagesByRoom: Map<string, Set<string>>;
   private lock: boolean; // Simple lock for atomic operations

   /**
    * Constructor
    * Initializes empty message repository
    * 
    * Postconditions:
    * - messages map is empty
    * - messagesByRoom map is empty
    * - lock is false
    */
   constructor() {
      this.messages = new Map();
      this.messagesByRoom = new Map();
      this.lock = false;
      this.checkRep();
   }

   /**
    * Check representation invariant
    * @throws Error if invariant is violated
    */
   private checkRep(): void {
      // Check uniqueness of IDs
      const ids = new Set<string>();
      for (const [id, message] of this.messages) {
         if (ids.has(id)) {
            throw new Error('Invariant violation: duplicate message ID');
         }
         ids.add(id);

         // Check timestamp is valid
         if (message.timestamp <= 0) {
            throw new Error('Invariant violation: invalid timestamp');
         }

         // Check edit history is chronologically ordered
         if (message.editHistory && message.editHistory.length > 0) {
            for (let i = 1; i < message.editHistory.length; i++) {
               if (message.editHistory[i].timestamp < message.editHistory[i - 1].timestamp) {
                  throw new Error('Invariant violation: edit history not chronologically ordered');
               }
            }
         }

         // Check parent exists if parentId is set
         if (message.parentId && !this.messages.has(message.parentId)) {
            throw new Error('Invariant violation: parent message does not exist');
         }
      }
   }

   /**
    * Acquire lock for atomic operations
    * Simple spinlock implementation for demonstration
    */
   private async acquireLock(): Promise<void> {
      while (this.lock) {
         await new Promise(resolve => setTimeout(resolve, 1));
      }
      this.lock = true;
   }


   private releaseLock(): void {
      this.lock = false;
   }

   /**
    * Add a new message to the repository
    * 
    * @param username - Username of sender
    * @param text - Message text content
    * @param room - Room name
    * @param parentId - Optional parent message ID for replies
    * @returns Created message
    * 
    * Preconditions:
    * - username !== null && username.length > 0
    * - text !== null && text.length > 0
    * - room !== null && room.length > 0
    * - If parentId provided, parent message must exist
    * 
    * Postconditions:
    * - New message is added to repository
    * - Message has unique ID
    * - Message is associated with room
    * - checkRep() passes
    */
   public async addMessage(
      username: string,
      text: string,
      room: string,
      parentId?: string
   ): Promise<Message> {
      // Precondition checks
      if (!username || username.length === 0) {
         throw new Error('Precondition violated: username must be non-empty');
      }
      if (!text || text.length === 0) {
         throw new Error('Precondition violated: text must be non-empty');
      }
      if (!room || room.length === 0) {
         throw new Error('Precondition violated: room must be non-empty');
      }
      if (parentId && !this.messages.has(parentId)) {
         throw new Error('Precondition violated: parent message does not exist');
      }

      await this.acquireLock();
      try {
         const now = Date.now();
         const message: Message = {
            id: generateId(),
            username,
            text,
            time: moment().tz('Asia/Karachi').format('h:mm a'),
            timestamp: now,
            room,
            edited: false,
            editHistory: [],
            deleted: false,
            parentId,
            replies: []
         };

         this.messages.set(message.id, message);

         // Update room index
         if (!this.messagesByRoom.has(room)) {
            this.messagesByRoom.set(room, new Set());
         }
         this.messagesByRoom.get(room)!.add(message.id);

         // Add to parent's replies if this is a reply
         if (parentId) {
            const parent = this.messages.get(parentId)!;
            if (!parent.replies) {
               parent.replies = [];
            }
            parent.replies.push(message);
         }

         this.checkRep();
         return message;
      } finally {
         this.releaseLock();
      }
   }

   /**
    * Edit an existing message
    * Demonstrates mutability with controlled state changes
    * 
    * @param messageId - ID of message to edit
    * @param newText - New text content
    * @param username - Username attempting the edit
    * @returns Updated message or null if not authorized
    * 
    * Preconditions:
    * - messageId !== null
    * - newText !== null && newText.length > 0
    * - Message with messageId exists
    * - Message is not deleted
    * - username matches message owner
    * 
    * Postconditions:
    * - Message text is updated
    * - Original text is added to edit history
    * - edited flag is set to true
    * - checkRep() passes
    */
   public async editMessage(
      messageId: string,
      newText: string,
      username: string
   ): Promise<Message | null> {
      console.log('🔍 DEBUG editMessage - messageId:', messageId);
      console.log('🔍 DEBUG editMessage - newText:', newText);
      console.log('🔍 DEBUG editMessage - username:', username);

      // Precondition checks
      if (!messageId) {
         console.log('🔍 DEBUG editMessage - ERROR: messageId is falsy');
         throw new Error('Precondition violated: messageId cannot be null');
      }
      if (!newText || newText.length === 0) {
         console.log('🔍 DEBUG editMessage - ERROR: newText is empty');
         throw new Error('Precondition violated: newText must be non-empty');
      }

      await this.acquireLock();
      try {
         const message = this.messages.get(messageId);
         console.log('🔍 DEBUG editMessage - message found:', message ? 'YES' : 'NO');

         if (message) {
            console.log('🔍 DEBUG editMessage - message.username:', message.username);
            console.log('🔍 DEBUG editMessage - message.deleted:', message.deleted);
         }

         if (!message) {
            console.log('🔍 DEBUG editMessage - ERROR: message does not exist');
            throw new Error('Precondition violated: message does not exist');
         }
         if (message.deleted) {
            console.log('🔍 DEBUG editMessage - ERROR: message is deleted');
            throw new Error('Precondition violated: cannot edit deleted message');
         }
         if (message.username !== username) {
            console.log('🔍 DEBUG editMessage - ERROR: username mismatch');
            console.log('🔍 DEBUG editMessage - Expected:', message.username, 'Got:', username);
            // Authorization failed
            return null;
         }

         console.log('🔍 DEBUG editMessage - All checks passed, proceeding with edit');

         // Save current text to edit history
         const editRecord: MessageEdit = {
            text: message.text,
            timestamp: message.timestamp,
            time: message.time
         };
         message.editHistory!.push(editRecord);

         // Update message
         message.text = newText;
         message.edited = true;
         message.time = moment().tz('Asia/Karachi').format('h:mm a');
         message.timestamp = Date.now();

         console.log('🔍 DEBUG editMessage - Message updated successfully');
         this.checkRep();
         return message;
      } catch (error) {
         console.log('🔍 DEBUG editMessage - Exception caught:', error);
         throw error;
      } finally {
         this.releaseLock();
      }
   }

   /**
    * Delete a message (soft delete)
    * 
    * @param messageId - ID of message to delete
    * @param username - Username attempting the delete
    * @returns true if deleted, false if not authorized
    * 
    * Preconditions:
    * - messageId !== null
    * - Message with messageId exists
    * - username matches message owner or is admin
    * 
    * Postconditions:
    * - Message is marked as deleted
    * - Message remains in repository
    * - checkRep() passes
    */
   public async deleteMessage(
      messageId: string,
      username: string
   ): Promise<boolean> {
      // Precondition checks
      if (!messageId) {
         throw new Error('Precondition violated: messageId cannot be null');
      }

      await this.acquireLock();
      try {
         const message = this.messages.get(messageId);

         if (!message) {
            throw new Error('Precondition violated: message does not exist');
         }

         if (message.username !== username) {
            // Authorization failed
            return false;
         }

         message.deleted = true;
         message.text = '[Message deleted]';

         this.checkRep();
         return true;
      } finally {
         this.releaseLock();
      }
   }

   /**
    * Get message by ID
    * @param messageId - Message ID
    * @returns Message or undefined
    */
   public getMessage(messageId: string): Message | undefined {
      return this.messages.get(messageId);
   }

   /**
    * Get all messages for a room (non-deleted only)
    * @param room - Room name
    * @returns Array of messages
    */
   public getMessagesForRoom(room: string): Message[] {
      const messageIds = this.messagesByRoom.get(room);
      if (!messageIds) {
         return [];
      }

      const messages: Message[] = [];
      for (const id of messageIds) {
         const message = this.messages.get(id);
         if (message && !message.deleted) {
            messages.push(message);
         }
      }

      return messages.sort((a, b) => a.timestamp - b.timestamp);
   }

   /**
    * Get message thread (message with all nested replies)
    * @param messageId - Root message ID
    * @returns Message with populated replies tree
    */
   public getMessageThread(messageId: string): Message | undefined {
      const message = this.messages.get(messageId);
      if (!message) {
         return undefined;
      }

      // Recursive function to populate replies
      const populateReplies = (msg: Message): Message => {
         if (!msg.replies || msg.replies.length === 0) {
            return msg;
         }

         msg.replies = msg.replies
            .filter(reply => !reply.deleted)
            .map(reply => populateReplies(reply));

         return msg;
      };

      return populateReplies({ ...message });
   }

   /**
    * RECURSION: Search messages and all nested replies for keyword
    * Demonstrates recursive subproblem decomposition
    * 
    * Base case: Message with no replies - search only in message text
    * Recursive case: Message with replies - search in message text AND recurse on each reply
    * 
    * @param keyword - Search term
    * @param room - Room to search in
    * @returns Array of messages containing keyword
    */
   public searchMessages(keyword: string, room: string): Message[] {
      const results: Message[] = [];
      const lowerKeyword = keyword.toLowerCase();

      // Get all root messages (no parent) in room
      const roomMessages = this.getMessagesForRoom(room);

      /**
       * Recursive helper: Search message and all its replies
       * @param msg - Message to search
       * @returns true if this message or any reply matches
       */
      const searchRecursive = (msg: Message): boolean => {
         // Base case: Check this message
         const matchesThisMessage = msg.text.toLowerCase().includes(lowerKeyword);

         if (matchesThisMessage) {
            results.push(msg);
         }

         // Recursive case: Search all replies
         if (msg.replies && msg.replies.length > 0) {
            for (const reply of msg.replies) {
               if (!reply.deleted) {
                  searchRecursive(reply); // Recurse on each reply
               }
            }
         }

         return matchesThisMessage;
      };

      // Search all root messages
      for (const message of roomMessages) {
         searchRecursive(message);
      }

      return results;
   }

   /**
    * RECURSION: Calculate depth of message thread
    * Base case: Message with no replies - depth is 0
    * Recursive case: Message with replies - depth is 1 + max(depth of all replies)
    * 
    * @param messageId - Root message ID
    * @returns Maximum depth of thread
    */
   public getThreadDepth(messageId: string): number {
      const message = this.messages.get(messageId);
      if (!message) {
         return -1;
      }

      /**
       * Recursive helper
       * @param msg - Current message
       * @returns Depth of this message's thread
       */
      const calculateDepth = (msg: Message): number => {
         // Base case: No replies
         if (!msg.replies || msg.replies.length === 0) {
            return 0;
         }

         // Recursive case: Find maximum depth among replies
         let maxDepth = 0;
         for (const reply of msg.replies) {
            if (!reply.deleted) {
               const depth = calculateDepth(reply);
               console.log("this is depth", depth);
               maxDepth = Math.max(maxDepth, depth);
            }
         }

         return 1 + maxDepth;
      };

      return calculateDepth(message);
   }

   /**
    * CONCURRENCY: Increment read receipt counter atomically
    * Demonstrates atomic operations to prevent race conditions
    * 
    * @param messageId - Message ID
    * @returns Updated count
    */
   private readReceiptCounts: Map<string, number> = new Map();

   public async incrementReadReceipt(messageId: string): Promise<number> {
      await this.acquireLock();
      try {
         const currentCount = this.readReceiptCounts.get(messageId) || 0;
         const newCount = currentCount + 1;
         this.readReceiptCounts.set(messageId, newCount);
         return newCount;
      } finally {
         this.releaseLock();
      }
   }

   /**
    * Get read receipt count
    */
   public getReadReceiptCount(messageId: string): number {
      return this.readReceiptCounts.get(messageId) || 0;
   }

   /**
    * Clear all messages (for testing)
    */
   public clear(): void {
      this.messages.clear();
      this.messagesByRoom.clear();
      this.readReceiptCounts.clear();
      this.checkRep();
   }
}

// Export singleton instance
export const messageRepository = new MessageRepository();
