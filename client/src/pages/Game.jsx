import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";

const Game = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const {
    gameState,
    nextPhase,
    vote,
    kickPlayer,
    restartGame,
    stopGame,
    clearSession,
  } = useGame();
  const [selectedVote, setSelectedVote] = useState("");
  const [showVoteResults, setShowVoteResults] = useState(false);
  const [voteResults, setVoteResults] = useState(null);
  const [showWord, setShowWord] = useState(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem("imposter-showWord");
    return saved === "true";
  });

  // Save showWord state to localStorage
  useEffect(() => {
    localStorage.setItem("imposter-showWord", showWord.toString());
  }, [showWord]);

  // Safety check for gameState
  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading game...</p>
        </div>
      </div>
    );
  }

  // Redirect if not in a game
  useEffect(() => {
    if (!gameState.roomCode || !gameState.nickname) {
      navigate("/");
    }
  }, [gameState.roomCode, gameState.nickname, navigate]);

  // Reset vote state when phase changes
  useEffect(() => {
    if (gameState.phase === "VOTING") {
      setSelectedVote("");
    }
    // Reset showWord when game starts
    if (gameState.phase === "STATEMENT_ROUND" && gameState.round === 1) {
      setShowWord(false);
    }
  }, [gameState.phase, gameState.round]);

  const handleVote = (targetNickname) => {
    setSelectedVote(targetNickname);
    vote(targetNickname);
    // Don't set hasVoted to true - allow vote changes
  };

  const handleNextPhase = () => {
    nextPhase();
  };

  const handleRestartGame = () => {
    if (window.confirm("Are you sure you want to restart the game?")) {
      restartGame();
    }
  };

  const handleStopGame = () => {
    if (
      window.confirm(
        "Are you sure you want to stop the game and return to lobby?"
      )
    ) {
      stopGame();
    }
  };

  const handleKickPlayer = (nickname) => {
    if (window.confirm(`Are you sure you want to kick ${nickname}?`)) {
      kickPlayer(nickname);
    }
  };

  const leaveGame = () => {
    clearSession();
    navigate("/");
  };

  const alivePlayers = gameState.players?.filter((p) => !p.isEliminated) || [];
  const currentPlayer = gameState.players?.find(
    (p) => p.nickname === gameState.nickname
  );
  const isEliminated = currentPlayer?.isEliminated;

  // Statement Round Component
  const StatementRound = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">
          Statement Round {gameState.round}
        </h2>
        {gameState.starter && (
          <div className="bg-slate-700 rounded-lg p-3 mb-4">
            <p className="text-slate-300 text-sm mb-1">🎯 Statement Order</p>
            <p className="text-cyan-400 font-semibold">
              {gameState.starter} starts first
            </p>
          </div>
        )}
        <p className="text-slate-300 mb-4">
          Give your statement about your word. Be careful not to reveal too
          much!
        </p>
        {gameState.word && (
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Your word is:</p>
              <button
                onClick={() => setShowWord(!showWord)}
                className="text-slate-400 hover:text-cyan-400 transition-colors"
                title={showWord ? "Hide word" : "Show word"}
              >
                {showWord ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {showWord ? (
              <p className="text-2xl font-bold text-cyan-400">
                {gameState.word}
              </p>
            ) : (
              <div className="text-2xl font-bold text-slate-500 select-none">
                ••••••••
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-lg font-semibold mb-3 text-slate-100">
          Players ({alivePlayers.length})
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {alivePlayers.map((player, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
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
              </div>
              {gameState.isAdmin && player.nickname !== gameState.nickname && (
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

      {gameState.isAdmin && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          {gameState.starter && (
            <div className="bg-slate-700 rounded-lg p-3 mb-4">
              <p className="text-slate-300 text-sm mb-1">🎯 Statement Order</p>
              <p className="text-cyan-400 font-semibold">
                {gameState.starter} starts first
              </p>
            </div>
          )}
          <button
            onClick={handleNextPhase}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-4 rounded-lg"
          >
            Move to Voting Phase
          </button>
        </div>
      )}
    </div>
  );

  // Voting Phase Component
  const VotingPhase = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Voting Phase</h2>
        <p className="text-slate-300 mb-4">
          Vote for who you think is the imposter
        </p>
        {selectedVote && (
          <p className="text-green-400 mb-4">✓ You voted for {selectedVote}</p>
        )}
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-lg font-semibold mb-3 text-slate-100">
          Vote for Imposter
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {alivePlayers
            .filter((p) => p.nickname !== gameState.nickname)
            .map((player, index) => (
              <button
                key={index}
                onClick={() => handleVote(player.nickname)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedVote === player.nickname
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-700 hover:bg-slate-600 text-slate-100"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      player.isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span>{player.nickname}</span>
                  {player.isAdmin && (
                    <span className="bg-cyan-600 text-white px-2 py-1 rounded text-xs">
                      Admin
                    </span>
                  )}
                </div>
              </button>
            ))}
        </div>
      </div>

      {gameState.isAdmin && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          {gameState.error && (
            <div className="bg-red-900 border border-red-600 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm mb-2">{gameState.error}</p>
              {gameState.pendingVoters &&
                gameState.pendingVoters.length > 0 && (
                  <div>
                    <p className="text-red-400 text-xs mb-1">
                      Still waiting for votes from:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {gameState.pendingVoters.map((voter, index) => (
                        <span
                          key={index}
                          className="bg-red-800 text-red-200 px-2 py-1 rounded text-xs"
                        >
                          {voter}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
          <button
            onClick={handleNextPhase}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-4 rounded-lg"
          >
            Reveal Results
          </button>
        </div>
      )}
    </div>
  );

  // Reveal Phase Component
  const RevealPhase = () => {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">
            Vote Results
          </h2>
          <p className="text-slate-300 mb-4">The votes have been counted.</p>
          {gameState.voteResults && (
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-2">Individual votes:</p>
              {gameState.voteResults.individualVotes &&
                gameState.voteResults.individualVotes.map((vote, index) => (
                  <div key={index} className="flex items-center py-1">
                    <span className="text-slate-200 font-medium">
                      {vote.voter}
                    </span>
                    <span className="text-slate-400 mx-2">→</span>
                    <span className="text-cyan-400 font-semibold">
                      {vote.target}
                    </span>
                  </div>
                ))}
              <div className="mt-4 pt-4 border-t border-slate-600">
                <p className="text-slate-400 text-sm mb-2">Vote summary:</p>
                {Object.entries(gameState.voteResults.voteCounts).map(
                  ([player, votes]) => (
                    <div
                      key={player}
                      className="flex justify-between items-center py-1"
                    >
                      <span className="text-slate-200">{player}</span>
                      <span className="text-cyan-400 font-semibold">
                        {votes} vote{votes !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )
                )}
              </div>
              {gameState.voteResults.eliminated && (
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <p className="text-slate-400 text-sm mb-1">Eliminated:</p>
                  <p className="text-lg font-semibold text-red-400">
                    {gameState.voteResults.eliminated}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {gameState.voteResults.wasImposter
                      ? "🎉 Was the imposter! Villagers win!"
                      : "Was a villager. Game continues..."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {gameState.isAdmin && (
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <button
              onClick={handleNextPhase}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-4 rounded-lg"
            >
              Process Elimination & Continue
            </button>
          </div>
        )}
      </div>
    );
  };

  // Round Continuation Component - Now shows statement round directly
  const RoundContinuation = () => {
    // If it's round continuation, show the statement round
    return <StatementRound />;
  };

  // Game Over Component
  const GameOver = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
        <h2 className="text-3xl font-bold text-cyan-400 mb-4">Game Over!</h2>
        {gameState.winner === "villagers" ? (
          <div className="text-green-400 mb-4">
            <p className="text-2xl font-bold">🎉 Villagers Win! 🎉</p>
            <p className="text-slate-300 mt-2">
              The imposter was successfully eliminated!
            </p>
          </div>
        ) : (
          <div className="text-red-400 mb-4">
            <p className="text-2xl font-bold">💀 Imposter Wins! 💀</p>
            <p className="text-slate-300 mt-2">The imposter has taken over!</p>
          </div>
        )}
        {gameState.eliminatedPlayer && (
          <div className="bg-slate-700 rounded-lg p-4 mt-4">
            <p className="text-slate-400 text-sm mb-2">Last eliminated:</p>
            <p className="text-lg font-semibold text-slate-200">
              {gameState.eliminatedPlayer}
            </p>
            <p className="text-sm text-slate-400">
              {gameState.wasImposter ? "Was the imposter" : "Was a villager"}
            </p>
          </div>
        )}
      </div>

      {gameState.isAdmin && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <button
            onClick={handleRestartGame}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg mb-2"
          >
            Restart Game
          </button>
          <button
            onClick={handleStopGame}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg mb-2"
          >
            Stop Game & Return to Lobby
          </button>
          <button
            onClick={leaveGame}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg"
          >
            Leave Game
          </button>
        </div>
      )}
    </div>
  );

  // Eliminated Player View
  const EliminatedView = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">
          You've Been Eliminated
        </h2>
        <p className="text-slate-300 mb-4">
          You can still watch the game but cannot participate in voting.
        </p>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-lg font-semibold mb-3 text-slate-100">
          Remaining Players
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {alivePlayers.map((player, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGamePhase = () => {
    if (isEliminated && !gameState.isAdmin) {
      return <EliminatedView />;
    }

    switch (gameState.phase) {
      case "STATEMENT_ROUND":
        return <StatementRound />;
      case "VOTING":
        return <VotingPhase />;
      case "REVEAL":
        return <RevealPhase />;
      case "GAME_OVER":
        return <GameOver />;
      case "ROUND_CONTINUATION":
        return <RoundContinuation />;
      default:
        return <StatementRound />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-cyan-400">Imposter Game</h1>
            <p className="text-sm text-slate-400">Room: {gameState.roomCode}</p>
          </div>
          <button
            onClick={leaveGame}
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
      <div className="flex-1 p-4">{renderGamePhase()}</div>

      {/* Footer */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <p className="text-xs text-slate-500 text-center">
          {gameState.phase === "LOBBY"
            ? "Waiting to start..."
            : gameState.phase === "STATEMENT_ROUND"
            ? gameState.isAdmin
              ? "Players are giving statements. Click 'Next Phase' when ready to vote."
              : "Give your statement!"
            : gameState.phase === "VOTING"
            ? "Vote for the imposter!"
            : gameState.phase === "REVEAL"
            ? gameState.isAdmin
              ? "Click 'Process Elimination' to continue"
              : "Wait for admin to process elimination"
            : "Game over!"}
        </p>
      </div>
    </div>
  );
};

export default Game;
