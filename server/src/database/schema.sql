-- Imposter Game Database Schema

-- Create database (run this manually if needed)
-- CREATE DATABASE imposter;

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    total_games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    admin_socket_id VARCHAR(255),
    game_phase VARCHAR(50) DEFAULT 'LOBBY',
    current_round INTEGER DEFAULT 0,
    timer_enabled BOOLEAN DEFAULT false,
    timer_duration INTEGER DEFAULT 60
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    socket_id VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    is_connected BOOLEAN DEFAULT true,
    is_eliminated BOOLEAN DEFAULT false,
    word VARCHAR(100),
    is_imposter BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    session_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_ended_at TIMESTAMP,
    winner_type VARCHAR(20), -- 'imposter' or 'crew'
    total_rounds INTEGER DEFAULT 0
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    voter_nickname VARCHAR(50) NOT NULL,
    target_nickname VARCHAR(50) NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Eliminations table
CREATE TABLE IF NOT EXISTS eliminations (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    eliminated_nickname VARCHAR(50) NOT NULL,
    was_imposter BOOLEAN NOT NULL,
    eliminated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Word pairs table (for storing the 1000 word pairs)
CREATE TABLE IF NOT EXISTS word_pairs (
    id SERIAL PRIMARY KEY,
    word1 VARCHAR(100) NOT NULL,
    word2 VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    difficulty VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_socket_id ON players(socket_id);
CREATE INDEX IF NOT EXISTS idx_votes_room_round ON votes(room_id, round_number);
CREATE INDEX IF NOT EXISTS idx_eliminations_room_round ON eliminations(room_id, round_number);

-- Update trigger for rooms table
CREATE OR REPLACE FUNCTION update_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_rooms_updated_at();
