const { Pool } = require("pg");
const redis = require("redis");

// Database connection with retry logic
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://imposter:imposter123@localhost:5432/imposter",
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Connect to Redis
redisClient.on("error", (err) => console.error("Redis Client Error:", err));
redisClient.on("connect", () => console.log("Connected to Redis"));
redisClient.connect();

// Database helper functions
const db = {
  // User operations
  async createUser(userId, passwordHash) {
    const result = await pool.query(
      "INSERT INTO users (user_id, password_hash) VALUES ($1, $2) RETURNING *",
      [userId, passwordHash]
    );
    return result.rows[0];
  },

  async getUserByUserId(userId) {
    const result = await pool.query(
      "SELECT * FROM users WHERE user_id = $1 AND is_active = true",
      [userId]
    );
    return result.rows[0];
  },

  async updateUserLastLogin(userId) {
    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1",
      [userId]
    );
  },

  async updateUserStats(userId, won = false) {
    if (won) {
      await pool.query(
        "UPDATE users SET total_games_played = total_games_played + 1, games_won = games_won + 1 WHERE user_id = $1",
        [userId]
      );
    } else {
      await pool.query(
        "UPDATE users SET total_games_played = total_games_played + 1, games_lost = games_lost + 1 WHERE user_id = $1",
        [userId]
      );
    }
  },

  // Room operations
  async createRoom(roomCode, adminSocketId, adminNickname, adminUserId = null) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create room
      const roomResult = await client.query(
        "INSERT INTO rooms (room_code, admin_socket_id) VALUES ($1, $2) RETURNING *",
        [roomCode, adminSocketId]
      );

      // Add admin player
      await client.query(
        "INSERT INTO players (room_id, user_id, socket_id, nickname, is_admin) VALUES ($1, $2, $3, $4, $5)",
        [roomResult.rows[0].id, adminUserId, adminSocketId, adminNickname, true]
      );

      await client.query("COMMIT");
      return roomResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async getRoom(roomCode) {
    const result = await pool.query(
      "SELECT * FROM rooms WHERE room_code = $1 AND is_active = true",
      [roomCode]
    );
    return result.rows[0];
  },

  async getRoomPlayers(roomId) {
    const result = await pool.query(
      "SELECT * FROM players WHERE room_id = $1 ORDER BY joined_at",
      [roomId]
    );
    return result.rows;
  },

  async addPlayer(roomId, socketId, nickname, userId = null) {
    const result = await pool.query(
      "INSERT INTO players (room_id, user_id, socket_id, nickname) VALUES ($1, $2, $3, $4) RETURNING *",
      [roomId, userId, socketId, nickname]
    );
    return result.rows[0];
  },

  async updatePlayerConnection(socketId, isConnected) {
    await pool.query(
      "UPDATE players SET is_connected = $1, last_seen = CURRENT_TIMESTAMP WHERE socket_id = $2",
      [isConnected, socketId]
    );
  },

  async removePlayer(socketId) {
    await pool.query("DELETE FROM players WHERE socket_id = $1", [socketId]);
  },

  async updateRoomPhase(roomId, phase, round = 0) {
    await pool.query(
      "UPDATE rooms SET game_phase = $1, current_round = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
      [phase, round, roomId]
    );
  },

  // Redis operations for real-time data
  async setRoomData(roomCode, data) {
    await redisClient.setEx(`room:${roomCode}`, 3600, JSON.stringify(data)); // 1 hour TTL
  },

  async getRoomData(roomCode) {
    const data = await redisClient.get(`room:${roomCode}`);
    return data ? JSON.parse(data) : null;
  },

  async deleteRoomData(roomCode) {
    await redisClient.del(`room:${roomCode}`);
  },

  // Session management
  async setPlayerSession(socketId, sessionData) {
    await redisClient.setEx(
      `session:${socketId}`,
      86400,
      JSON.stringify(sessionData)
    ); // 24 hours TTL
  },

  async getPlayerSession(socketId) {
    const data = await redisClient.get(`session:${socketId}`);
    return data ? JSON.parse(data) : null;
  },

  async deletePlayerSession(socketId) {
    await redisClient.del(`session:${socketId}`);
  },
};

module.exports = { pool, redisClient, db };
