import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import formatMessage from "./utils/messages";
import { userJoin, getCurrentUser, userLeave, getRoomUsers, userRepository } from "./utils/users";
import { JoinRoomData, Message } from "./types/index";
import { messageRepository } from "./utils/messageRepository";
import CommandParser from "./utils/commandParser";
import { moderationEngine } from "./utils/moderationDSL";
import logger, { assert, perfMonitor } from "./utils/logger";

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// Initialize command parser
const commandParser = new CommandParser();

const BOT_NAME = "XeroxChat Bot";
const PORT = process.env.PORT || 3000;

// Setup default moderation rules
moderationEngine.addRule({
   id: 'spam-detection',
   name: 'Spam Detection',
   condition: 'when word_count > 100 then warn',
   action: 'warn',
   enabled: true
});

logger.info('Server initializing...');

/**
 * Command handler function
 * Processes chat commands using the command parser
 */
async function handleCommand(socket: any, msg: string, user: any): Promise<void> {
   const stopTimer = perfMonitor.start('handleCommand');

   try {
      const parsedCommand = commandParser.parse(msg);

      console.log('🔍 DEBUG: Raw message:', msg);
      console.log('🔍 DEBUG: Parsed command:', parsedCommand);

      logger.debug(`Command parsed: ${parsedCommand.type}`, {
         user: user.username,
         command: parsedCommand
      });

      if (!commandParser.validate(parsedCommand)) {
         // Provide helpful error messages based on command type
         let errorMsg = `Invalid command syntax: ${msg}`;
         switch (parsedCommand.type) {
            case 'edit':
               errorMsg = "Invalid /edit command. Usage: /edit <messageId> <newText>";
               break;
            case 'delete':
               errorMsg = "Invalid /delete command. Usage: /delete <messageId>";
               break;
            case 'mute':
               errorMsg = "Invalid /mute command. Usage: /mute <username>";
               break;
            case 'ban':
               errorMsg = "Invalid /ban command. Usage: /ban <username>";
               break;
            case 'reply':
               errorMsg = "Invalid /reply command. Usage: /reply <messageId> <text>";
               break;
         }
         socket.emit("error", errorMsg);
         return;
      }

      switch (parsedCommand.type) {
         case 'edit':
            await handleEditCommand(socket, parsedCommand.args, user);
            break;
         case 'delete':
            await handleDeleteCommand(socket, parsedCommand.args, user);
            break;
         case 'mute':
            await handleMuteCommand(socket, parsedCommand.args, user);
            break;
         case 'ban':
            await handleBanCommand(socket, parsedCommand.args, user);
            break;
         case 'reply':
            await handleReplyCommand(socket, parsedCommand.args, user);
            break;
         default:
            socket.emit("error", "Unknown command");
      }
   } catch (error) {
      console.log('teste', error)
      logger.error('Error handling command', { error, user: user.username, msg });
      socket.emit("error", "An error occurred while processing the command");
   } finally {
      stopTimer();
   }
}

/**
 * Handle /edit command
 */
async function handleEditCommand(socket: any, args: string[], user: any): Promise<void> {
   console.log('🔍 DEBUG handleEditCommand - args:', args);
   console.log('🔍 DEBUG handleEditCommand - args.length:', args.length);

   const messageId = args[0];
   const newText = args.slice(1).join(' ').trim(); // Trim whitespace

   console.log('🔍 DEBUG handleEditCommand - messageId:', messageId);
   console.log('🔍 DEBUG handleEditCommand - newText:', newText);
   console.log('🔍 DEBUG handleEditCommand - newText.length:', newText.length);
   console.log('🔍 DEBUG handleEditCommand - user.username:', user.username);

   // Validate that newText is not empty
   if (!newText || newText.length === 0) {
      socket.emit("error", "Cannot edit message with empty text. Usage: /edit <messageId> <newText>");
      logger.warn(`Edit failed: ${user.username} provided empty text for ${messageId}`);
      return;
   }

   try {
      const editedMessage = await messageRepository.editMessage(messageId, newText, user.username);

      if (!editedMessage) {
         console.log('🔍 DEBUG handleEditCommand - editedMessage is null (authorization failed)');
         socket.emit("error", "Could not edit message. You can only edit your own messages.");
         logger.warn(`Edit failed: ${user.username} tried to edit ${messageId}`);
         return;
      }

      console.log('🔍 DEBUG handleEditCommand - editedMessage:', editedMessage);

      // Broadcast the edit to all users in the room
      io.to(user.room).emit("messageEdited", {
         id: editedMessage.id,
         text: editedMessage.text,
         edited: true,
         time: editedMessage.time
      });

      logger.info(`Message edited: ${messageId} by ${user.username}`);
   } catch (error) {
      console.log('🔍 DEBUG handleEditCommand - Error caught:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
         if (error.message.includes('message does not exist')) {
            socket.emit("error", `Message with ID "${messageId}" not found.`);
         } else if (error.message.includes('deleted message')) {
            socket.emit("error", "Cannot edit a deleted message.");
         } else {
            socket.emit("error", `Failed to edit message: ${error.message}`);
         }
      } else {
         socket.emit("error", "An error occurred while editing the message");
      }

      // Log the error but don't re-throw it since we've already handled it
      logger.error('Error in handleEditCommand', { error, messageId, username: user.username });
   }
}

/**
 * Handle /delete command
 */
async function handleDeleteCommand(socket: any, args: string[], user: any): Promise<void> {
   const messageId = args[0];

   try {
      const success = await messageRepository.deleteMessage(messageId, user.username);

      if (!success) {
         socket.emit("error", "Could not delete message. You can only delete your own messages.");
         logger.warn(`Delete failed: ${user.username} tried to delete ${messageId}`);
         return;
      }

      // Broadcast the deletion to all users in the room
      io.to(user.room).emit("messageDeleted", { id: messageId });

      logger.info(`Message deleted: ${messageId} by ${user.username}`);
   } catch (error) {
      console.log('🔍 DEBUG handleDeleteCommand - Error caught:', error);

      if (error instanceof Error && error.message.includes('message does not exist')) {
         socket.emit("error", `Message with ID "${messageId}" not found.`);
      } else {
         socket.emit("error", "An error occurred while deleting the message");
      }

      logger.error('Error in handleDeleteCommand', { error, messageId, username: user.username });
   }
}

/**
 * Handle /mute command (admin/moderator only)
 */
async function handleMuteCommand(socket: any, args: string[], user: any): Promise<void> {
   if (user.role !== 'admin' && user.role !== 'moderator') {
      socket.emit("error", "You don't have permission to mute users");
      return;
   }

   const targetUsername = args[0];
   const success = userRepository.muteUser(targetUsername);

   if (!success) {
      socket.emit("error", `User ${targetUsername} not found`);
      return;
   }

   io.to(user.room).emit("message", formatMessage(BOT_NAME, `${targetUsername} has been muted`));
   logger.info(`User muted: ${targetUsername} by ${user.username}`);
}

/**
 * Handle /ban command (admin only)
 */
async function handleBanCommand(socket: any, args: string[], user: any): Promise<void> {
   if (user.role !== 'admin') {
      socket.emit("error", "You don't have permission to ban users");
      return;
   }

   const targetUsername = args[0];
   const success = userRepository.banUser(targetUsername);

   if (!success) {
      socket.emit("error", `User ${targetUsername} not found`);
      return;
   }

   io.to(user.room).emit("message", formatMessage(BOT_NAME, `${targetUsername} has been banned`));
   logger.info(`User banned: ${targetUsername} by ${user.username}`);
}

/**
 * Handle /reply command (threaded conversations)
 */
async function handleReplyCommand(socket: any, args: string[], user: any): Promise<void> {
   const parentMessageId = args[0];
   const replyText = args.slice(1).join(' ');

   try {
      const replyMessage = await messageRepository.addMessage(
         user.username,
         replyText,
         user.room,
         parentMessageId
      );

      // Broadcast the reply
      io.to(user.room).emit("messageReply", {
         id: replyMessage.id,
         username: replyMessage.username,
         text: replyMessage.text,
         time: replyMessage.time,
         parentId: replyMessage.parentId
      });

      logger.info(`Reply sent: ${replyMessage.id} to ${parentMessageId} by ${user.username}`);
   } catch (error) {
      socket.emit("error", "Could not send reply. Parent message may not exist.");
      logger.error('Reply failed', { error, user: user.username, parentMessageId });
   }
}

/**
 * Socket.IO connection handler
 */
io.on("connection", (socket) => {
   logger.info(`New socket connection: ${socket.id}`);

   /**
    * Handle user joining a room
    */
   socket.on("joinRoom", async (data: JoinRoomData) => {
      const stopTimer = perfMonitor.start('joinRoom');

      try {
         const { username, room } = data;

         // Precondition assertions
         assert(username !== null && username.length > 0, 'Username must be non-empty');
         assert(room !== null && room.length > 0, 'Room must be non-empty');

         const { error, user } = userJoin(socket.id, username, room);

         if (error) {
            logger.warn(`User join failed: ${error}`, { username, room });
            socket.emit("usernameError", error);
            return;
         }

         if (!user) {
            return;
         }

         socket.join(user.room);
         logger.info(`User joined: ${user.username} in room ${user.room}`);

         // Welcome the current user
         socket.emit("message", formatMessage(BOT_NAME, "Welcome to XeroxChat!"));

         // Broadcast when a user joins
         socket.broadcast
            .to(user.room)
            .emit(
               "message",
               formatMessage(BOT_NAME, `${user.username} has joined the chat!`)
            );

         // Send room users info to all users in room
         io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room),
         });
      } catch (error) {
         logger.error('Error in joinRoom handler', { error });
         socket.emit("error", "An error occurred while joining the room");
      } finally {
         stopTimer();
      }
   });

   /**
    * Handle chat message from user
    */
   socket.on("chatMessage", async (msg: string) => {
      const stopTimer = perfMonitor.start('chatMessage');

      try {
         const user = getCurrentUser(socket.id);

         if (!user) {
            logger.warn(`Chat message from unknown user: ${socket.id}`);
            return;
         }

         // Check if user is muted or banned
         if (user.muted) {
            socket.emit("error", "You are muted and cannot send messages");
            logger.info(`Muted user attempted to send message: ${user.username}`);
            return;
         }

         if (user.banned) {
            socket.emit("error", "You are banned from this chat");
            logger.info(`Banned user attempted to send message: ${user.username}`);
            return;
         }

         // Check if this is a command
         if (msg.startsWith('/')) {
            await handleCommand(socket, msg, user);
            return;
         }

         // Apply moderation rules
         const actions = moderationEngine.evaluate(msg, user.username);
         if (actions.includes('delete')) {
            socket.emit("error", "Your message was blocked by moderation rules");
            logger.info(`Message blocked by moderation: ${user.username} - ${msg}`);
            return;
         }

         // Add message to repository
         const message = await messageRepository.addMessage(
            user.username,
            msg,
            user.room
         );

         logger.debug(`Message sent: ${user.username} in ${user.room}`, { messageId: message.id });

         // Broadcast message to room
         io.to(user.room).emit("message", {
            id: message.id,
            username: message.username,
            text: message.text,
            time: message.time,
            edited: message.edited
         });

         // Apply moderation warnings
         if (actions.includes('warn')) {
            socket.emit("warning", "Your message triggered a moderation warning");
         }
      } catch (error) {
         logger.error('Error in chatMessage handler', { error });
         socket.emit("error", "An error occurred while sending the message");
      } finally {
         stopTimer();
      }
   });

   /**
    * Handle user disconnect
    */
   socket.on("disconnect", () => {
      const stopTimer = perfMonitor.start('disconnect');

      try {
         const user = userLeave(socket.id);

         if (user) {
            logger.info(`User disconnected: ${user.username} from room ${user.room}`);

            io.to(user.room).emit(
               "message",
               formatMessage(BOT_NAME, `${user.username} has left the chat!`)
            );

            // Send updated room users info
            io.to(user.room).emit("roomUsers", {
               room: user.room,
               users: getRoomUsers(user.room),
            });
         }
      } catch (error) {
         logger.error('Error in disconnect handler', { error });
      } finally {
         stopTimer();
      }
   });
});

/**
 * Start the server
 */
server.listen(PORT, () => {
   console.log(`🎯 Server is running on PORT: ${PORT}`);
   logger.info(`Server started successfully on port ${PORT}`);

   // Log performance stats every 5 minutes
   setInterval(() => {
      perfMonitor.report();
   }, 5 * 60 * 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
   logger.info('SIGTERM signal received: closing HTTP server');
   server.close(() => {
      logger.info('HTTP server closed');
      perfMonitor.report();
   });
});
