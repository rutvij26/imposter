import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";

const Lobby = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { gameState, startGame, kickPlayer, toggleTimer, clearSession } =
    useGame();
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);

  // Redirect if not in a room
  useEffect(() => {
    if (!gameState.roomCode || !gameState.nickname) {
      navigate("/");
    }
  }, [gameState.roomCode, gameState.nickname, navigate]);

  const handleStartGame = () => {
    if (gameState.players.length < 3) {
      alert("Need at least 3 players to start the game");
      return;
    }
    startGame();
  };

  const handleKickPlayer = (nickname) => {
    if (window.confirm(`Are you sure you want to kick ${nickname}?`)) {
      kickPlayer(nickname);
    }
  };

  const handleTimerToggle = (enabled) => {
    toggleTimer(enabled, timerDuration);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(gameState.roomCode);
  };

  const leaveRoom = () => {
    clearSession();
    navigate("/");
  };

  const alivePlayers = gameState.players.filter((p) => !p.isEliminated);
  const connectedPlayers = gameState.players.filter((p) => p.isConnected);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-cyan-400">Game Lobby</h1>
            <p className="text-sm text-slate-400">Room: {gameState.roomCode}</p>
          </div>
          <button
            onClick={leaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
          >
            Leave
          </button>
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

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Room Info */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-100">
              Room Information
            </h2>
            <button
              onClick={copyRoomCode}
              className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1 rounded text-sm"
            >
              Copy Code
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Players:</span>
              <span className="text-cyan-400 ml-2">{alivePlayers.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Connected:</span>
              <span className="text-green-400 ml-2">
                {connectedPlayers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 text-slate-100">
            Players ({gameState.players.length})
          </h2>
          <div className="space-y-2">
            {gameState.players.map((player, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        player.isConnected ? "bg-green-500" : "bg-red-500"
                      }`}
                    ></div>
                    <span className="text-slate-100">{player.nickname}</span>
                    {player.isAdmin && (
                      <span className="bg-cyan-600 text-white px-2 py-1 rounded text-xs">
                        Admin
                      </span>
                    )}
                    {player.isEliminated && (
                      <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                        Eliminated
                      </span>
                    )}
                  </div>
                </div>
                {gameState.isAdmin &&
                  !player.isAdmin &&
                  !player.isEliminated && (
                    <button
                      onClick={() => handleKickPlayer(player.nickname)}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                    >
                      Kick
                    </button>
                  )}
              </div>
            ))}
          </div>
        </div>

        {/* Admin Controls */}
        {gameState.isAdmin && (
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h2 className="text-lg font-semibold mb-4 text-slate-100">
              Admin Controls
            </h2>

            {/* Timer Settings */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Timer Settings</span>
                <button
                  onClick={() => setShowTimerSettings(!showTimerSettings)}
                  className="text-cyan-400 text-sm"
                >
                  {showTimerSettings ? "Hide" : "Show"}
                </button>
              </div>

              {showTimerSettings && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      value={timerDuration}
                      onChange={(e) =>
                        setTimerDuration(parseInt(e.target.value) || 60)
                      }
                      min="30"
                      max="300"
                      className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100"
                    />
                    <span className="text-slate-400 text-sm">
                      seconds per phase
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleTimerToggle(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Enable Timer
                    </button>
                    <button
                      onClick={() => handleTimerToggle(false)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Disable Timer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Start Game Button */}
            <button
              onClick={handleStartGame}
              disabled={gameState.players.length < 3}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {gameState.players.length < 3
                ? `Need ${3 - gameState.players.length} more players`
                : "Start Game"}
            </button>
          </div>
        )}

        {/* Game Status */}
        {gameState.phase !== "LOBBY" && (
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h2 className="text-lg font-semibold mb-2 text-slate-100">
              Game Status
            </h2>
            <p className="text-slate-300">
              Phase:{" "}
              <span className="text-cyan-400 capitalize">
                {gameState.phase.replace("_", " ")}
              </span>
            </p>
            {gameState.round > 0 && (
              <p className="text-slate-300">
                Round: <span className="text-cyan-400">{gameState.round}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <p className="text-xs text-slate-500 text-center">
          Waiting for admin to start the game
        </p>
      </div>
    </div>
  );
};

export default Lobby;
