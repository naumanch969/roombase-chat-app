# Real-Time Chat Application

A production-ready TypeScript chat application demonstrating 11 software construction concepts.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 14.0.0
- npm

### Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build

# 3. Start the server
npm start
```

**Open http://localhost:3000 in your browser**

### Development Mode

```bash
npm run dev:watch
```

### Run Tests

```bash
npm test
```

## 📁 Project Structure

```
├── src/                    # TypeScript source code
│   ├── server.ts          # Main server
│   ├── types/             # Type definitions
│   └── utils/             # Core logic (ADTs, parsers)
├── public/                # Frontend (HTML, CSS, JS)
├── tests/                 # Test files
└── logs/                  # Application logs
```

## 🎯 Features

- Real-time messaging via WebSocket
- Message editing and deletion
- Threaded conversations (nested replies)
- User roles (admin, moderator, user)
- Chat commands (`/edit`, `/delete`, `/reply`, `/mute`, `/ban`)
- Automated moderation
- Concurrent user handling
- Comprehensive testing (50+ tests)

## 📝 Chat Commands

| Command | Usage | Permission |
|---------|-------|------------|
| `/edit <id> <text>` | Edit your message | Owner |
| `/delete <id>` | Delete your message | Owner |
| `/reply <id> <text>` | Reply to a message | All users |
| `/mute <username>` | Mute a user | Moderator+ |
| `/ban <username>` | Ban a user | Admin only |

## 📚 Academic Topics (11 Concepts)

1. **Design & Modelling** - 4-layer architecture
2. **Specifications** - Preconditions/postconditions
3. **Mutability** - Immutable/mutable fields
4. **Recursion** - Nested message threads
5. **Abstraction (ADT)** - Repository ADTs with invariants
6. **Parsing** - Command parser with grammar
7. **Concurrency** - Atomic operations with locks
8. **Little Languages** - Moderation DSL
9. **Debugging** - Assertions and logging
10. **Code Review** - Best practices
11. **Testing** - Unit, integration, partition tests

**See [TECHNICAL_DOCUMENT.md](TECHNICAL_DOCUMENT.md) for 33 Q&A covering all topics.**

**See [USER_MANUAL.md](USER_MANUAL.md) for complete usage guide.**

## 🛠️ Technology Stack

- **Backend**: Node.js, TypeScript, Socket.IO
- **Frontend**: HTML5, CSS3, JavaScript
- **Testing**: Jest
- **Logging**: Winston

## ⚠️ Troubleshooting

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Dependencies error:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build error:**
```bash
rm -rf dist
npm run build
```

## 👥 Team

Muhammad Sabih Ali, Muhammad Nauman Chaudhry, Musa Riaz

**NUST School of Electrical Engineering & Computer Science**
