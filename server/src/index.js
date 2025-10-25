const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const GameRoom = require("./game/GameRoom");
const gameHandlers = require("./socket/gameHandlers");
const { db } = require("./database/connection");
const { initializeDatabase } = require("./database/init");

const app = express();
const server = http.createServer(app);

// CORS configuration for client - Allow all origins
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Authentication endpoints
app.post("/api/auth/register", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      console.log("Registration failed: Missing credentials");
      return res
        .status(400)
        .json({ error: "User ID and password are required" });
    }

    if (password.length < 4) {
      console.log("Registration failed: Password too short for user", userId);
      return res
        .status(400)
        .json({ error: "Password must be at least 4 characters" });
    }

    // Check if user already exists
    const existingUser = await db.getUserByUserId(userId);
    if (existingUser) {
      console.log("Registration failed: User already exists", userId);
      return res.status(409).json({ error: "User ID already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await db.createUser(userId, passwordHash);
    console.log("User registered successfully:", userId);

    res.status(201).json({
      message: "User created successfully",
      userId: user.user_id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      console.log("Login failed: Missing credentials");
      return res
        .status(400)
        .json({ error: "User ID and password are required" });
    }

    // Get user from database
    const user = await db.getUserByUserId(userId);
    if (!user) {
      console.log("Login failed: User not found", userId);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log("Login failed: Invalid password for user", userId);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    await db.updateUserLastLogin(userId);
    console.log("User logged in successfully:", userId);

    res.json({
      message: "Login successful",
      userId: user.user_id,
      lastLogin: user.last_login,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Store active rooms
const rooms = new Map();

// Generate room code
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Handle room creation
  socket.on("create-room", async (data) => {
    const { nickname } = data;
    const roomCode = generateRoomCode();

    try {
      // Create room in database
      const roomData = await db.createRoom(roomCode, socket.id, nickname);

      // Create in-memory room for real-time operations
      const room = new GameRoom(roomCode, socket.id, nickname);
      rooms.set(roomCode, room);

      // Store room data in Redis
      await db.setRoomData(roomCode, room.getGameState());

      // Store player session
      await db.setPlayerSession(socket.id, {
        roomCode,
        nickname,
        isAdmin: true,
      });

      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.isAdmin = true;

      socket.emit("room-created", { roomCode, players: room.getPlayers() });
      console.log(`Room created: ${roomCode} by ${nickname}`);
    } catch (error) {
      console.error("Error creating room:", error);
      socket.emit("error", { message: "Failed to create room" });
    }
  });

  // Handle joining room
  socket.on("join-room", async (data) => {
    const { roomCode, nickname } = data;

    try {
      // Check if room exists in database
      const roomData = await db.getRoom(roomCode);
      if (!roomData) {
        socket.emit("error", {
          message:
            "Room not available. Please check the room code and try again.",
        });
        return;
      }

      // Check if room exists in memory, if not, recreate it
      let room = rooms.get(roomCode);
      if (!room) {
        const players = await db.getRoomPlayers(roomData.id);
        room = new GameRoom(
          roomCode,
          roomData.admin_socket_id,
          players[0]?.nickname
        );
        rooms.set(roomCode, room);
      }

      if (room.hasPlayer(nickname)) {
        socket.emit("error", { message: "Nickname already taken" });
        return;
      }

      // Add player to database
      await db.addPlayer(roomData.id, socket.id, nickname);

      // Add player to in-memory room
      room.addPlayer(socket.id, nickname);

      // Store player session
      await db.setPlayerSession(socket.id, {
        roomCode,
        nickname,
        isAdmin: false,
      });

      socket.join(roomCode);
      socket.roomCode = roomCode;

      // Update Redis with latest room data
      await db.setRoomData(roomCode, room.getGameState());

      // Notify all players in room
      console.log(
        `Emitting player-joined to room ${roomCode} for player ${nickname}`
      );
      io.to(roomCode).emit("player-joined", {
        nickname,
        players: room.getPlayers(),
      });

      console.log(`${nickname} joined room ${roomCode}`);
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  // Handle reconnection
  socket.on("reconnect-player", (data) => {
    const { roomCode, nickname } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    if (room.reconnectPlayer(socket.id, nickname)) {
      socket.join(roomCode);
      socket.roomCode = roomCode;

      const gameState = room.getGameState();
      const player = room.getPlayer(nickname);

      socket.emit("reconnected", {
        gameState: gameState,
        players: room.getPlayers(),
      });

      // If player is in a game, send their word
      if (gameState.phase !== "LOBBY" && player && player.word) {
        socket.emit("word-assigned", {
          word: player.word,
          isImposter: player.nickname === gameState.imposter,
        });
      }

      console.log(
        `Emitting player-reconnected to room ${roomCode} for player ${nickname}`
      );
      io.to(roomCode).emit("player-reconnected", {
        nickname,
        players: room.getPlayers(),
      });
    } else {
      socket.emit("error", { message: "Could not reconnect" });
    }
  });

  // Handle game actions
  socket.on("start-game", () => {
    const room = rooms.get(socket.roomCode);
    if (room && socket.isAdmin) {
      const result = room.startGame();
      if (result.success) {
        // Send game started event to all players
        io.to(socket.roomCode).emit("game-started", {
          phase: result.data.phase,
          round: result.data.round,
          players: result.data.players,
          wordPair: result.data.wordPair,
          imposter: result.data.imposter,
          starter: result.data.starter,
        });

        // Send individual word assignments to each player
        for (let [playerSocketId, player] of room.players.entries()) {
          io.to(playerSocketId).emit("word-assigned", {
            word: player.word,
            isImposter: player.nickname === result.data.imposter,
          });
        }
      } else {
        socket.emit("error", { message: result.message });
      }
    }
  });

  socket.on("next-phase", () => {
    const room = rooms.get(socket.roomCode);
    if (room && socket.isAdmin) {
      const result = room.nextPhase();

      // Handle validation errors
      if (!result.success) {
        socket.emit("error", {
          message: result.message,
          pendingVoters: result.pendingVoters,
        });
        return;
      }

      // Handle different game outcomes
      if (result.phase === "GAME_OVER") {
        // Game ended - show winner
        io.to(socket.roomCode).emit("game-ended", {
          winner: result.winner,
          eliminatedPlayer: result.eliminatedPlayer,
          wasImposter: result.wasImposter,
          players: result.players,
        });
      } else if (result.continueGame) {
        // Continue to next round
        io.to(socket.roomCode).emit("round-continued", {
          eliminatedPlayer: result.eliminatedPlayer,
          wasImposter: result.wasImposter,
          round: result.round,
          players: result.players,
        });
      } else {
        // Normal phase change
        io.to(socket.roomCode).emit("phase-changed", result);
      }
    }
  });

  socket.on("stop-game", () => {
    const room = rooms.get(socket.roomCode);
    if (room && socket.isAdmin) {
      // Reset game state to lobby
      room.gameState.phase = "LOBBY";
      room.gameState.round = 0;
      room.gameState.wordPair = null;
      room.gameState.imposter = null;
      room.gameState.votes.clear();
      room.gameState.eliminated = [];
      room.gameState.timer = { enabled: false, duration: 0, remaining: 0 };

      // Clear player game data
      for (let [socketId, player] of room.players.entries()) {
        player.word = null;
        player.isEliminated = false;
      }

      // Notify all players to return to lobby
      io.to(socket.roomCode).emit("game-stopped", {
        message: "Game stopped by admin",
        players: room.getPlayers(),
      });
    }
  });

  socket.on("vote", (data) => {
    const room = rooms.get(socket.roomCode);
    if (room) {
      const result = room.addVote(socket.id, data.targetNickname);
      if (result.success) {
        io.to(socket.roomCode).emit("vote-added", {
          voter: data.voterNickname,
          target: data.targetNickname,
        });
      }
    }
  });

  socket.on("kick-player", (data) => {
    const room = rooms.get(socket.roomCode);
    if (room && socket.isAdmin) {
      const result = room.kickPlayer(data.nickname);
      if (result.success) {
        const targetSocket = room.getPlayerSocket(data.nickname);
        if (targetSocket) {
          io.to(targetSocket).emit("kicked");
        }
        io.to(socket.roomCode).emit("player-kicked", {
          nickname: data.nickname,
          players: room.getPlayers(),
        });
      }
    }
  });

  socket.on("restart-game", () => {
    const room = rooms.get(socket.roomCode);
    if (room && socket.isAdmin) {
      room.restartGame();

      // Send game restarted event to redirect to lobby
      io.to(socket.roomCode).emit("game-restarted", {
        players: room.getPlayers(),
      });
    }
  });

  socket.on("toggle-timer", (data) => {
    const room = rooms.get(socket.roomCode);
    if (room && socket.isAdmin) {
      room.setTimer(data.enabled, data.duration);
      io.to(socket.roomCode).emit("timer-toggled", {
        enabled: data.enabled,
        duration: data.duration,
      });
    }
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    if (socket.roomCode) {
      const room = rooms.get(socket.roomCode);
      if (room) {
        const player = room.getPlayerBySocket(socket.id);
        if (player) {
          console.log("User disconnected:", player.nickname, `(${socket.id})`);
          room.markPlayerDisconnected(socket.id);

          // If admin disconnected, close room and kick everyone out
          if (socket.isAdmin) {
            console.log("Admin left, closing room and kicking all players");

            // Notify all players that admin left and room is closing
            io.to(socket.roomCode).emit("admin-left-room-closed", {
              message: "Admin left the game. Room is closing.",
              players: room.getPlayers(),
            });

            // Remove the room from the rooms map
            rooms.delete(socket.roomCode);

            // Disconnect all players from the room
            const roomSockets = await io.in(socket.roomCode).fetchSockets();
            for (const roomSocket of roomSockets) {
              roomSocket.leave(socket.roomCode);
              roomSocket.roomCode = null;
              roomSocket.isAdmin = false;
            }

            return; // Exit early since room is closed
          }

          io.to(socket.roomCode).emit("player-disconnected", {
            nickname: player.nickname,
            players: room.getPlayers(),
          });

          // Auto-kick disconnected players after 30 seconds
          setTimeout(() => {
            const room = rooms.get(socket.roomCode);
            if (room) {
              const player = room.getPlayerBySocket(socket.id);
              if (player && !player.isConnected) {
                // Remove player from room
                room.players.delete(socket.id);

                // If this was the last player, remove the room
                if (room.players.size === 0) {
                  rooms.delete(socket.roomCode);
                } else {
                  // Notify remaining players
                  io.to(socket.roomCode).emit("player-kicked", {
                    nickname: player.nickname,
                    players: room.getPlayers(),
                  });

                  // If we're in voting phase and this player was alive, mark them as eliminated
                  if (
                    room.gameState.phase === "VOTING" &&
                    !player.isEliminated
                  ) {
                    player.isEliminated = true;
                    room.gameState.eliminated.push(player.nickname);
                  }
                }
              }
            }
          }, 30000); // 30 seconds timeout
        }
      } else {
        console.log("Socket disconnected:", socket.id);
      }
    } else {
      console.log("Socket disconnected:", socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
