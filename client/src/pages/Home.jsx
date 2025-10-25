import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import { useAuth } from "../contexts/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { gameState, createRoom, joinRoom, reconnectPlayer, clearSession } =
    useGame();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Clear error when component mounts
  useEffect(() => {
    if (gameState.error) {
      setError(gameState.error);
      // Clear the error from game state
      clearSession();
    }
  }, [gameState.error, clearSession]);

  // Check for existing session on mount
  useEffect(() => {
    if (gameState.roomCode && gameState.nickname) {
      // Try to reconnect to existing session
      reconnectPlayer(gameState.roomCode, gameState.nickname);
      navigate("/lobby");
    }
  }, [gameState.roomCode, gameState.nickname, navigate, reconnectPlayer]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const handleCreateRoom = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      setError("Not connected to server. Please check your connection.");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      createRoom(user.userId);
      // Navigation will happen via socket event
    } catch (err) {
      setError("Failed to create room");
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError("Please enter room code");
      return;
    }

    if (!isConnected) {
      setError("Not connected to server. Please check your connection.");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      joinRoom(roomCode.trim().toUpperCase(), user.userId);
      // Navigation will happen via socket event
    } catch (err) {
      setError("Failed to join room");
      setIsJoining(false);
    }
  };

  const copyRoomCode = () => {
    if (gameState.roomCode) {
      navigator.clipboard.writeText(gameState.roomCode);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-center text-cyan-400">
              🕵️ Imposter Game
            </h1>
            <p className="text-sm text-slate-400 text-center mt-1">
              Real-time multiplayer deception game
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-300 text-sm">
              Welcome, {user?.userId}
            </span>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2">
        <div className="flex items-center justify-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-xs text-slate-400">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Rejoin Game Message */}
      {gameState.roomCode && gameState.nickname && (
        <div className="bg-cyan-900/20 border border-cyan-600 mx-4 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-cyan-400 font-semibold mb-1">
                Active Game Session
              </h3>
              <p className="text-slate-300 text-sm mb-2">
                You have an active game in room{" "}
                <span className="text-cyan-400 font-mono">
                  {gameState.roomCode}
                </span>
                {gameState.phase && gameState.phase !== "LOBBY" && (
                  <span className="ml-2 text-slate-400">
                    •{" "}
                    {gameState.phase === "STATEMENT_ROUND" && "Statement Round"}
                    {gameState.phase === "VOTING" && "Voting Phase"}
                    {gameState.phase === "REVEAL" && "Results Phase"}
                    {gameState.phase === "GAME_OVER" && "Game Over"}
                  </span>
                )}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    reconnectPlayer(gameState.roomCode, gameState.nickname);
                    // Navigate to appropriate page based on game phase
                    if (gameState.phase === "LOBBY") {
                      navigate("/lobby");
                    } else {
                      navigate("/game");
                    }
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Rejoin Game
                </button>
                <button
                  onClick={() => {
                    clearSession();
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Leave Game
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Create Room Section */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-slate-100">
            Create New Room
          </h2>
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div className="bg-slate-700 rounded-lg p-3 mb-4">
              <p className="text-slate-300 text-sm mb-1">Playing as:</p>
              <p className="text-cyan-400 font-semibold">{user?.userId}</p>
            </div>
            <button
              type="submit"
              disabled={isCreating || !isConnected}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isCreating ? "Creating..." : "Create Room"}
            </button>
          </form>
        </div>

        {/* Join Room Section */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-slate-100">
            Join Existing Room
          </h2>
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div className="bg-slate-700 rounded-lg p-3 mb-4">
              <p className="text-slate-300 text-sm mb-1">Playing as:</p>
              <p className="text-cyan-400 font-semibold">{user?.userId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                maxLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isJoining || !isConnected}
              className="w-full bg-slate-600 hover:bg-slate-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isJoining ? "Joining..." : "Join Room"}
            </button>
          </form>
        </div>

        {/* Current Room Info */}
        {gameState.roomCode && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-2 text-slate-100">
              Current Room
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300">
                  Room Code:{" "}
                  <span className="font-mono text-cyan-400">
                    {gameState.roomCode}
                  </span>
                </p>
                <p className="text-slate-300">
                  Nickname:{" "}
                  <span className="text-cyan-400">{gameState.nickname}</span>
                </p>
              </div>
              <button
                onClick={copyRoomCode}
                className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded text-sm"
              >
                Copy Code
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
            <p className="text-red-300 text-center">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <p className="text-xs text-slate-500 text-center">
          Mobile-optimized • Real-time multiplayer • Dark theme
        </p>
      </div>
    </div>
  );
};

export default Home;
