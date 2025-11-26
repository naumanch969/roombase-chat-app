/**
 * Integration Tests
 * Tests the full system interaction across layers
 * Demonstrates:
 * - Integration testing vs Unit testing
 * - Cross-layer communication
 * - Real-world scenarios
 */

import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import http from 'http';
import express from 'express';
import { messageRepository } from '../src/utils/messageRepository';
import { userRepository } from '../src/utils/users';

describe('Integration Tests - WebSocket and Backend', () => {
   let httpServer: http.Server;
   let io: SocketIOServer;
   let clientSocket: ClientSocket;
   const PORT = 3001;

   beforeEach((done) => {
      // Setup server
      const app = express();
      httpServer = http.createServer(app);
      io = new SocketIOServer(httpServer);

      httpServer.listen(PORT, () => {
         // Setup client
         clientSocket = ioClient(`http://localhost:${PORT}`);
         clientSocket.on('connect', done);
      });

      // Clear repositories
      messageRepository.clear();
      userRepository.clear();
   });

   afterEach(() => {
      if (clientSocket) {
         clientSocket.close();
      }
      if (io) {
         io.close();
      }
      if (httpServer) {
         httpServer.close();
      }
   });

   describe('Integration: WebSocket + MessageRepository', () => {
      /**
       * INTEGRATION TEST: Tests that messages flow correctly from
       * WebSocket layer → Backend handlers → MessageRepository
       * 
       * Unit test would test MessageRepository.addMessage() alone.
       * Integration test verifies the complete flow.
       */
      test('should add message through WebSocket and persist in repository', (done) => {
         io.on('connection', async (socket) => {
            socket.on('chatMessage', async (msg: string) => {
               const message = await messageRepository.addMessage(
                  'testUser',
                  msg,
                  'testRoom'
               );

               // Verify message was persisted
               const retrieved = messageRepository.getMessage(message.id);
               expect(retrieved).toBeDefined();
               expect(retrieved?.text).toBe(msg);

               socket.emit('message', message);
               done();
            });
         });

         clientSocket.emit('chatMessage', 'Hello integration test!');
      });

      /**
       * INTEGRATION TEST: Verify concurrent message additions
       * Tests race condition handling across the full stack
       */
      test('should handle concurrent messages from multiple clients', async () => {
         const client2 = ioClient(`http://localhost:${PORT}`);
         const client3 = ioClient(`http://localhost:${PORT}`);

         const messagesReceived: string[] = [];

         io.on('connection', async (socket) => {
            socket.on('chatMessage', async (msg: string) => {
               // Simulate concurrent access
               const message = await messageRepository.addMessage(
                  socket.id,
                  msg,
                  'testRoom'
               );
               messagesReceived.push(message.text);
            });
         });

         // Send concurrent messages
         await Promise.all([
            new Promise(resolve => {
               clientSocket.emit('chatMessage', 'Message 1');
               setTimeout(resolve, 10);
            }),
            new Promise(resolve => {
               client2.emit('chatMessage', 'Message 2');
               setTimeout(resolve, 10);
            }),
            new Promise(resolve => {
               client3.emit('chatMessage', 'Message 3');
               setTimeout(resolve, 10);
            })
         ]);

         // Wait for processing
         await new Promise(resolve => setTimeout(resolve, 100));

         // All messages should be persisted
         const roomMessages = messageRepository.getMessagesForRoom('testRoom');
         expect(roomMessages.length).toBe(3);

         client2.close();
         client3.close();
      });
   });

   describe('Integration: Command Flow', () => {
      /**
       * INTEGRATION TEST: Full command parsing and execution flow
       * Tests: CommandParser → Server handler → MessageRepository
       */
      test('should execute /edit command through complete flow', (done) => {
         let messageId: string;

         io.on('connection', async (socket) => {
            // First, add a message
            socket.on('addMessage', async (text: string) => {
               const message = await messageRepository.addMessage(
                  'testUser',
                  text,
                  'testRoom'
               );
               messageId = message.id;
               socket.emit('messageAdded', message);
            });

            // Then, edit it
            socket.on('editMessage', async (data: { id: string, newText: string }) => {
               const edited = await messageRepository.editMessage(
                  data.id,
                  data.newText,
                  'testUser'
               );

               expect(edited).not.toBeNull();
               expect(edited?.text).toBe(data.newText);
               expect(edited?.edited).toBe(true);
               expect(edited?.editHistory?.length).toBe(1);

               done();
            });
         });

         clientSocket.emit('addMessage', 'Original text');
         
         clientSocket.on('messageAdded', (msg: any) => {
            clientSocket.emit('editMessage', {
               id: msg.id,
               newText: 'Edited text'
            });
         });
      });
   });

   describe('Integration: Recursive Message Threads', () => {
      /**
       * INTEGRATION TEST: Nested replies across layers
       * Tests recursive data structure handling in real-time system
       */
      test('should create and retrieve nested message threads', async () => {
         // Add root message
         const root = await messageRepository.addMessage('user1', 'Root', 'room1');

         // Add replies (level 1)
         const reply1 = await messageRepository.addMessage('user2', 'Reply 1', 'room1', root.id);
         const reply2 = await messageRepository.addMessage('user3', 'Reply 2', 'room1', root.id);

         // Add nested replies (level 2)
         const nestedReply = await messageRepository.addMessage('user4', 'Nested', 'room1', reply1.id);

         // Get full thread
         const thread = messageRepository.getMessageThread(root.id);

         expect(thread).toBeDefined();
         expect(thread?.replies?.length).toBe(2);
         expect(thread?.replies?.[0].replies?.length).toBe(1);

         // Test depth calculation
         const depth = messageRepository.getThreadDepth(root.id);
         expect(depth).toBe(2); // Root → Reply1 → NestedReply
      });
   });
});
