import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "./SocketContext";

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState({
    roomCode: null,
    nickname: null,
    isAdmin: false,
    players: [],
    phase: "LOBBY",
    round: 0,
    word: null,
    votes: {},
    eliminated: [],
    timer: { enabled: false, duration: 0, remaining: 0 },
    error: null,
    pendingVoters: [],
    starter: null,
  });

  // Load saved session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("imposter-session");
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setGameState((prev) => ({
          ...prev,
          roomCode: session.roomCode,
          nickname: session.nickname,
        }));
      } catch (error) {
        console.error("Failed to load saved session:", error);
        localStorage.removeItem("imposter-session");
      }
    }
  }, []);

  // Save session to localStorage
  const saveSession = (roomCode, nickname) => {
    const session = { roomCode, nickname };
    localStorage.setItem("imposter-session", JSON.stringify(session));
    setGameState((prev) => ({ ...prev, roomCode, nickname }));
  };

  // Clear session
  const clearSession = () => {
    localStorage.removeItem("imposter-session");
    localStorage.removeItem("imposter-showWord");
    setGameState((prev) => ({
      ...prev,
      roomCode: null,
      nickname: null,
      isAdmin: false,
      players: [],
      phase: "LOBBY",
      round: 0,
      word: null,
      votes: {},
      eliminated: [],
      timer: { enabled: false, duration: 0, remaining: 0 },
      error: null,
      pendingVoters: [],
      starter: null,
    }));
  };

  // Socket connection is now handled by AuthContext after login
  const connectSocket = () => {
    if (socket && !socket.connected) {
      console.log("Connecting socket from GameContext");
      socket.connect();
    }
  };

  // Connect socket when user navigates to game pages
  useEffect(() => {
    const currentPath = window.location.pathname;
    const isGamePage =
      currentPath === "/" ||
      currentPath === "/lobby" ||
      currentPath === "/game";
    const savedUser = localStorage.getItem("imposter-user");

    if (savedUser && isGamePage && socket && !socket.connected) {
      console.log("Auto-connecting socket for authenticated user on game page");
      socket.connect();
    }
  }, [socket, navigate]);

  // Also connect socket when user state changes (after login)
  useEffect(() => {
    const savedUser = localStorage.getItem("imposter-user");
    const currentPath = window.location.pathname;
    const isGamePage =
      currentPath === "/" ||
      currentPath === "/lobby" ||
      currentPath === "/game";

    if (savedUser && isGamePage && socket && !socket.connected) {
      console.log("Connecting socket after authentication");
      socket.connect();
    }
  }, [socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data) => {
      setGameState((prev) => ({
        ...prev,
        roomCode: data.roomCode,
        players: data.players,
        isAdmin: true,
      }));
      // Navigate to lobby
      navigate("/lobby");
    };

    const handlePlayerJoined = (data) => {
      console.log("Player joined event received:", data);
      // Only update if we're in a room and this event is for our room
      setGameState((prev) => {
        if (!prev.roomCode) return prev;
        return {
          ...prev,
          players: data.players,
        };
      });
      // Navigate to lobby if not already there
      if (window.location.pathname === "/") {
        navigate("/lobby");
      }
    };

    const handlePlayerReconnected = (data) => {
      console.log("Player reconnected event received:", data);
      // Only update if we're in a room and this event is for our room
      setGameState((prev) => {
        if (!prev.roomCode) return prev;
        return {
          ...prev,
          players: data.players,
        };
      });
    };

    const handleGameStarted = (data) => {
      setGameState((prev) => ({
        ...prev,
        phase: data.phase,
        round: data.round,
        players: data.players,
        wordPair: data.wordPair,
        imposter: data.imposter,
        starter: data.starter,
      }));
      // Navigate to game page
      navigate("/game");
    };

    const handleWordAssigned = (data) => {
      setGameState((prev) => ({
        ...prev,
        word: data.word,
        isImposter: data.isImposter,
      }));
    };

    const handleGameStopped = (data) => {
      setGameState((prev) => ({
        ...prev,
        phase: "LOBBY",
        round: 0,
        word: null,
        isImposter: false,
        players: data.players,
        wordPair: null,
        imposter: null,
        votes: [],
        eliminated: [],
      }));
      // Navigate back to lobby
      navigate("/lobby");
    };

    const handlePhaseChanged = (data) => {
      setGameState((prev) => ({
        ...prev,
        phase: data.phase,
        round: data.round,
        players: data.players,
        voteResults: data.voteResults || null,
      }));
    };

    const handleVoteAdded = (data) => {
      setGameState((prev) => ({
        ...prev,
        votes: { ...prev.votes, [data.voter]: data.target },
      }));
    };

    const handlePlayerKicked = (data) => {
      setGameState((prev) => ({
        ...prev,
        players: data.players,
      }));
    };

    const handleGameRestarted = (data) => {
      setGameState((prev) => ({
        ...prev,
        phase: "LOBBY",
        round: 0,
        players: data.players,
        word: null,
        votes: {},
        eliminated: [],
        timer: { enabled: false, duration: 0, remaining: 0 },
        error: null,
        pendingVoters: [],
      }));
      navigate("/lobby");
    };

    const handleTimerToggled = (data) => {
      setGameState((prev) => ({
        ...prev,
        timer: {
          enabled: data.enabled,
          duration: data.duration,
          remaining: data.duration,
        },
      }));
    };

    const handleError = (data) => {
      console.error("Game error:", data?.message);
      // Set error in game state to show in UI
      setGameState((prev) => ({
        ...prev,
        error: data?.message || "Unknown error occurred",
        pendingVoters: data?.pendingVoters || [],
      }));
    };

    const handleKicked = () => {
      clearSession();
      // Redirect to home or show kicked message
    };

    const handleAdminTransferred = () => {
      setGameState((prev) => ({ ...prev, isAdmin: true }));
    };

    const handleReconnected = (data) => {
      setGameState((prev) => ({
        ...prev,
        ...data.gameState,
        players: data.players,
      }));

      // Navigate to appropriate page based on game state
      if (data.gameState.phase === "LOBBY") {
        navigate("/lobby");
      } else if (
        data.gameState.phase === "STATEMENT_ROUND" ||
        data.gameState.phase === "VOTING" ||
        data.gameState.phase === "REVEAL"
      ) {
        navigate("/game");
      }
    };

    const handlePlayerEliminated = (data) => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.nickname === data.nickname ? { ...p, isEliminated: true } : p
        ),
        eliminated: [
          ...prev.eliminated,
          {
            nickname: data.nickname,
            wasImposter: data.wasImposter,
            round: prev.round,
          },
        ],
      }));
    };

    const handleGameEnded = (data) => {
      setGameState((prev) => ({
        ...prev,
        phase: "GAME_OVER",
        winner: data.winner,
        eliminatedPlayer: data.eliminatedPlayer,
        wasImposter: data.wasImposter,
        players: data.players,
      }));
    };

    const handleRoundContinued = (data) => {
      setGameState((prev) => ({
        ...prev,
        phase: "STATEMENT_ROUND",
        round: data.round || prev.round,
        players: data.players || prev.players,
        eliminatedPlayer: data.eliminatedPlayer,
        wasImposter: data.wasImposter,
        votes: [],
      }));
    };

    const handleAdminLeftRoomClosed = (data) => {
      // Clear the session and redirect to home
      clearSession();
      navigate("/");

      // Show a message to the user
      alert(data.message || "Admin left the game. Room is closing.");
    };

    // Register event listeners
    socket.on("room-created", handleRoomCreated);
    socket.on("player-joined", handlePlayerJoined);
    socket.on("player-reconnected", handlePlayerReconnected);
    socket.on("game-started", handleGameStarted);
    socket.on("word-assigned", handleWordAssigned);
    socket.on("game-stopped", handleGameStopped);
    socket.on("phase-changed", handlePhaseChanged);
    socket.on("vote-added", handleVoteAdded);
    socket.on("player-kicked", handlePlayerKicked);
    socket.on("game-restarted", handleGameRestarted);
    socket.on("timer-toggled", handleTimerToggled);
    socket.on("error", handleError);
    socket.on("kicked", handleKicked);
    socket.on("admin-transferred", handleAdminTransferred);
    socket.on("reconnected", handleReconnected);
    socket.on("player-eliminated", handlePlayerEliminated);
    socket.on("game-ended", handleGameEnded);
    socket.on("round-continued", handleRoundContinued);
    socket.on("admin-left-room-closed", handleAdminLeftRoomClosed);

    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("player-joined", handlePlayerJoined);
      socket.off("player-reconnected", handlePlayerReconnected);
      socket.off("game-started", handleGameStarted);
      socket.off("word-assigned", handleWordAssigned);
      socket.off("game-stopped", handleGameStopped);
      socket.off("phase-changed", handlePhaseChanged);
      socket.off("vote-added", handleVoteAdded);
      socket.off("player-kicked", handlePlayerKicked);
      socket.off("game-restarted", handleGameRestarted);
      socket.off("timer-toggled", handleTimerToggled);
      socket.off("error", handleError);
      socket.off("kicked", handleKicked);
      socket.off("admin-transferred", handleAdminTransferred);
      socket.off("reconnected", handleReconnected);
      socket.off("player-eliminated", handlePlayerEliminated);
      socket.off("game-ended", handleGameEnded);
      socket.off("round-continued", handleRoundContinued);
      socket.off("admin-left-room-closed", handleAdminLeftRoomClosed);
    };
  }, [socket]);

  const createRoom = (nickname) => {
    if (socket && socket.connected) {
      socket.emit("create-room", { nickname });
      saveSession(null, nickname); // Will be updated when room is created
    } else {
      console.error("Socket not connected");
    }
  };

  const joinRoom = (roomCode, nickname) => {
    if (socket && socket.connected) {
      socket.emit("join-room", { roomCode, nickname });
      saveSession(roomCode, nickname);
    } else {
      console.error("Socket not connected");
    }
  };

  const reconnectPlayer = (roomCode, nickname) => {
    if (socket) {
      socket.emit("reconnect-player", { roomCode, nickname });
    }
  };

  const startGame = () => {
    if (socket && gameState.isAdmin) {
      socket.emit("start-game");
    }
  };

  const nextPhase = () => {
    if (socket && gameState.isAdmin) {
      socket.emit("next-phase");
    }
  };

  const vote = (targetNickname) => {
    if (socket) {
      socket.emit("vote", {
        targetNickname,
        voterNickname: gameState.nickname,
      });
    }
  };

  const kickPlayer = (nickname) => {
    if (socket && gameState.isAdmin) {
      socket.emit("kick-player", { nickname });
    }
  };

  const restartGame = () => {
    if (socket && gameState.isAdmin) {
      socket.emit("restart-game");
    }
  };

  const stopGame = () => {
    if (socket && gameState.isAdmin) {
      socket.emit("stop-game");
    }
  };

  const toggleTimer = (enabled, duration) => {
    if (socket && gameState.isAdmin) {
      socket.emit("toggle-timer", { enabled, duration });
    }
  };

  const value = {
    gameState,
    createRoom,
    joinRoom,
    reconnectPlayer,
    startGame,
    nextPhase,
    vote,
    kickPlayer,
    restartGame,
    stopGame,
    toggleTimer,
    clearSession,
    connectSocket,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
