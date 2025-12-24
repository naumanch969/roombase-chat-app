/**
 * Client-side chat application
 * Handles Socket.IO communication and DOM updates
 */

// Type definitions for Qs library
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
   users: Array<{ username: string }>;
}

// DOM elements
const chatForm = document.getElementById("chat-form") as HTMLFormElement;
const chatMessages = document.querySelector(".chat-messages") as HTMLDivElement;
const roomName = document.getElementById("room-name") as HTMLElement;
const userList = document.getElementById("users") as HTMLUListElement;
const userCount = document.getElementById("user-count") as HTMLElement;

// Get username and room from URL query parameters
const queryParams = Qs.parse(location.search, {
   ignoreQueryPrefix: true,
});
const username: string = queryParams.username as string;
const room: string = queryParams.room as string;

// Initialize Socket.IO connection
const socket = io();

/**
 * Handle username error (duplicate username)
 */
socket.on("usernameError", (msg: string) => {
   alert(msg);
   window.location.href = "/";
});

/**
 * Emit join room event with username and room data
 */
socket.emit("joinRoom", { username, room });

/**
 * Handle room users update
 */
socket.on("roomUsers", (data: RoomUsersData) => {
   outputRoomName(data.room);
   outputUsers(data.users);
});

/**
 * Handle incoming messages from server
 */
socket.on("message", (message: Message) => {
   outputMessage(message);

   // Auto-scroll to latest message
   chatMessages.scrollTop = chatMessages.scrollHeight;
});

/**
 * Handle message edits from server
 */
socket.on("messageEdited", (data: { id: string; text: string; edited: boolean; time: string }) => {
   const messageDiv = document.querySelector(`[data-message-id="${data.id}"]`) as HTMLDivElement;
   if (messageDiv) {
      const textElement = messageDiv.querySelector(".text") as HTMLParagraphElement;
      if (textElement) {
         textElement.textContent = data.text;
      }

      // Add or update edited badge
      const metaElement = messageDiv.querySelector(".meta") as HTMLParagraphElement;
      if (metaElement && !metaElement.querySelector(".edited-badge")) {
         const copyBtn = metaElement.querySelector(".copy-id-btn");
         const editedBadge = document.createElement("span");
         editedBadge.className = "edited-badge";
         editedBadge.textContent = "edited";
         if (copyBtn) {
            metaElement.insertBefore(editedBadge, copyBtn);
         }
      }
   }
});

/**
 * Handle message deletes from server
 */
socket.on("messageDeleted", (data: { id: string }) => {
   const messageDiv = document.querySelector(`[data-message-id="${data.id}"]`) as HTMLDivElement;
   if (messageDiv) {
      messageDiv.style.opacity = "0";
      messageDiv.style.transform = "translateX(-20px)";
      setTimeout(() => {
         messageDiv.remove();
      }, 300);
   }
});

/**
 * Handle error messages from server
 */
socket.on("error", (errorMsg: string) => {
   console.error("Server error:", errorMsg);
   showNotification(errorMsg, "error");
});

/**
 * Handle warning messages from server
 */
socket.on("warning", (warningMsg: string) => {
   console.warn("Server warning:", warningMsg);
   showNotification(warningMsg, "warning");
});

/**
 * Handle chat form submission
 */
chatForm.addEventListener("submit", (e: SubmitEvent) => {
   e.preventDefault();

   const msgInput = (e.target as HTMLFormElement).elements.namedItem(
      "msg"
   ) as HTMLInputElement;
   const msg = msgInput.value;

   // Emit message to server
   socket.emit("chatMessage", msg);

   // Clear input and refocus
   msgInput.value = "";
   msgInput.focus();
});

/**
 * Output message to the DOM
 * @param message - The message object containing username, text, and time
 */
function outputMessage(message: Message): void {
   const div = document.createElement("div");
   div.classList.add("message");
   div.setAttribute("data-message-id", message.id);

   const editedBadge = message.edited ? '<span class="edited-badge">edited</span>' : '';

   div.innerHTML = `<p class="meta">
      ${message.username} 
      <span>${message.time}</span>
      ${editedBadge}
      <button class="copy-id-btn" data-id="${message.id}" title="Copy message ID">
         <i class="fas fa-copy"></i>
      </button>
   </p>
   <p class="text">
      ${message.text}
   </p>`;

   // Add click event listener to copy button
   const copyBtn = div.querySelector(".copy-id-btn") as HTMLButtonElement;
   if (copyBtn) {
      copyBtn.addEventListener("click", () => {
         copyMessageId(message.id);
      });
   }

   chatMessages.appendChild(div);
}

/**
 * Copy message ID to clipboard
 * @param messageId - The ID of the message to copy
 */
function copyMessageId(messageId: string): void {
   navigator.clipboard.writeText(messageId).then(() => {
      showNotification(`ID copied: ${messageId}`, "success");
   }).catch((err) => {
      console.error("Failed to copy message ID:", err);
      showNotification("Failed to copy message ID", "error");
   });
}

/**
 * Show a notification to the user
 * @param message - The message to display
 * @param type - The type of notification (success, error, warning)
 */
function showNotification(message: string, type: "success" | "error" | "warning" = "success"): void {
   const notification = document.createElement("div");
   notification.classList.add("notification", `notification-${type}`);
   notification.textContent = message;
   document.body.appendChild(notification);

   setTimeout(() => {
      notification.classList.add("show");
   }, 10);

   setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
         notification.remove();
      }, 300);
   }, 3000);
}

/**
 * Update room name in the DOM
 * @param roomName - The name of the current room
 */
function outputRoomName(roomNameValue: string): void {
   roomName.innerHTML = roomNameValue;
}

/**
 * Update users list in the DOM
 * @param users - Array of users in the room
 */
function outputUsers(users: Array<{ username: string }>): void {
   userList.innerHTML = `
    ${users.map((user) => `<li>${user.username}</li>`).join("")}
  `;

   // Update user count badge
   if (userCount) {
      userCount.textContent = `(${users.length})`;
   }
}
