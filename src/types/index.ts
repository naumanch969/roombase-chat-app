/**
 * Type definitions for chat application
 */

export interface User {
   id: string;
   username: string;
   room: string;
   role?: 'admin' | 'moderator' | 'user';
   muted?: boolean;
   banned?: boolean;
}

export interface UserJoinResult {
   error?: string;
   user?: User;
}

export interface Message {
   id: string;
   username: string;
   text: string;
   time: string;
   timestamp: number;
   room: string;
   edited?: boolean;
   editHistory?: MessageEdit[];
   deleted?: boolean;
   parentId?: string; // For threaded conversations
   replies?: Message[]; // Recursive structure for nested replies
}

export interface MessageEdit {
   text: string;
   timestamp: number;
   time: string;
}

export interface FormattedMessage {
   username: string;
   text: string;
   time: string;
}

export interface RoomUsers {
   room: string;
   users: User[];
}

export interface JoinRoomData {
   username: string;
   room: string;
}

export interface CommandResult {
   success: boolean;
   message?: string;
   error?: string;
}

export interface ParsedCommand {
   type: 'edit' | 'delete' | 'mute' | 'ban' | 'reply' | 'unknown';
   args: string[];
   raw: string;
}

// DSL Types for moderation rules
export interface ModerationRule {
   id: string;
   name: string;
   condition: string;
   action: string;
   enabled: boolean;
}
