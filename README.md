# 🕵️ Imposter Game

A real-time multiplayer deception game built with React, Node.js, and Socket.io. Perfect for mobile devices with a dark theme optimized for battery life.

## 🎮 How to Play

1. **Admin creates a room** and shares the 6-character room code
2. **Players join** with the room code and their nickname
3. **System assigns words** - one player gets a different word (the imposter)
4. **Statement rounds** - everyone gives verbal statements about their word
5. **Voting phase** - players vote for who they think is the imposter
6. **Elimination** - highest voted player is eliminated and revealed
7. **Win conditions**:
   - Villagers win if they eliminate the imposter
   - Imposter wins if only 2 players remain (1 imposter + 1 villager)

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- PostgreSQL (included in Docker setup)
- Redis (included in Docker setup)

### Run with Docker (Recommended)

```bash
# Clone and navigate to project
git clone <your-repo>
cd imposter

# Start the game
docker-compose up --build

# Access the game
# Client: http://localhost:5173
# Server: http://localhost:3000
```

### Development Setup

```bash
# Install dependencies
npm install

# Start server
cd server && npm install && npm run dev

# Start client (in new terminal)
cd client && npm install && npm run dev
```

## 📱 Mobile Features

- **Touch-optimized** - 48px+ tap targets for fat fingers
- **Portrait-first** - Designed for vertical phone screens
- **Dark theme** - Battery-friendly dark slate colors
- **Connection status** - Visual indicators for network state
- **Session persistence** - Reconnect if browser closes accidentally
- **Copy room codes** - Easy sharing with one tap

## 🎯 Admin Controls

- **Create/Join rooms** with shareable codes
- **Kick players** from lobby or during game
- **Start/Stop/Restart** games
- **Timer controls** - Optional countdown for phases
- **Phase management** - Move between statement/voting/reveal
- **Admin transfer** - Automatic if admin disconnects

## 🏗️ Architecture

### Backend (Node.js + Socket.io + Database)

- **Express server** with CORS for client communication
- **PostgreSQL database** - Persistent storage for rooms, players, game sessions
- **Redis cache** - Real-time session management and room data
- **GameRoom class** - Manages game state, players, voting
- **Real-time events** - Room creation, joining, voting, elimination
- **Word pairs** - 1000+ contextually similar word combinations
- **Reconnection handling** - Graceful disconnection recovery

### Frontend (React + Vite)

- **Mobile-first UI** with Tailwind CSS
- **Socket.io client** for real-time communication
- **Context providers** for game state management
- **React Router** for navigation between pages
- **localStorage** for session persistence

### Docker Setup

- **Multi-container** - Separate client/server containers
- **Hot reload** - Development with live updates
- **Port forwarding** - Ready for laptop hosting
- **Network isolation** - Secure container communication

## 🎨 UI Components

### Home Page

- Create new room or join existing
- Nickname input with validation
- Connection status indicator
- Session recovery for reconnection

### Lobby Page

- Player list with connection status
- Admin controls (kick, timer, start game)
- Room information and code sharing
- Game status display

### Game Page

- **Statement Round** - Display assigned word
- **Voting Phase** - Vote for suspected imposter
- **Reveal Phase** - Show elimination results
- **Game Over** - Winner announcement and restart

## 🔧 Configuration

### Environment Variables

```bash
# Client
VITE_SERVER_URL=http://localhost:3000

# Server
NODE_ENV=development
PORT=3000
```

### Word Pairs

Edit `server/src/game/wordPairs.json` to add your own word combinations:

```json
[
  ["Tea", "Coffee"],
  ["iPhone", "Android"],
  ["Netflix", "YouTube"]
]
```

## 🚀 Deployment

### Local Network Hosting

1. Run `docker-compose up --build`
2. Forward ports 5173 (client) and 3000 (server)
3. Share your laptop's IP address with players
4. Players access via `http://YOUR_IP:5173`

### Production Deployment

- Use production Docker images
- Configure reverse proxy (nginx)
- Set up SSL certificates
- Use environment variables for configuration

## 🎮 Game Rules

1. **Minimum 3 players** to start
2. **One imposter** per game (randomly selected)
3. **Statement rounds** - Players describe their word verbally
4. **Voting** - Each player gets one vote per round
5. **Elimination** - Highest voted player is eliminated
6. **Win conditions**:
   - Villagers: Eliminate the imposter
   - Imposter: Survive until only 2 players remain

## 🛠️ Development

### Project Structure

```
imposter/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── utils/
│   └── Dockerfile
├── server/           # Node.js backend
│   ├── src/
│   │   ├── game/
│   │   ├── socket/
│   │   └── data/
│   └── Dockerfile
└── docker-compose.yml
```

### Key Features

- ✅ Real-time multiplayer with Socket.io
- ✅ Mobile-optimized dark theme UI
- ✅ Admin controls and player management
- ✅ Session persistence and reconnection
- ✅ Docker deployment ready
- ✅ Word pair system with 1000+ combinations
- ✅ Voting and elimination mechanics
- ✅ Win condition detection

## 📝 License

MIT License - Feel free to use and modify for your own games!

---

**Ready to play?** Start the game and gather your friends for an epic deception battle! 🕵️‍♂️
