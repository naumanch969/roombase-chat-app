/**
 * Client-side chat application
 * Handles Socket.IO communication and DOM updates
 */
interface QsParseOptions {
    ignoreQueryPrefix?: boolean;
}
declare const Qs: {
    parse: (str: string, options?: QsParseOptions) => Record<string, string>;
};
interface Message {
    id: string;
    username: string;
    text: string;
    time: string;
    edited?: boolean;
    parentId?: string;
}
interface RoomUsersData {
    room: string;
    users: Array<{
        username: string;
    }>;
}
declare const chatForm: HTMLFormElement;
declare const chatMessages: HTMLDivElement;
declare const roomName: HTMLElement;
declare const userList: HTMLUListElement;
declare const userCount: HTMLElement;
declare const queryParams: Record<string, string>;
declare const username: string;
declare const room: string;
declare const socket: SocketIOClient.Socket;
/**
 * Output message to the DOM
 * @param message - The message object containing username, text, and time
 */
declare function outputMessage(message: Message): void;
/**
 * Copy message ID to clipboard
 * @param messageId - The ID of the message to copy
 */
declare function copyMessageId(messageId: string): void;
/**
 * Show a notification to the user
 * @param message - The message to display
 * @param type - The type of notification (success, error, warning)
 */
declare function showNotification(message: string, type?: "success" | "error" | "warning"): void;
/**
 * Update room name in the DOM
 * @param roomName - The name of the current room
 */
declare function outputRoomName(roomNameValue: string): void;
/**
 * Update users list in the DOM
 * @param users - Array of users in the room
 */
declare function outputUsers(users: Array<{
    username: string;
}>): void;
