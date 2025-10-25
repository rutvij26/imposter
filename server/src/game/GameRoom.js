const wordPairs = require("./wordPairs.json");

class GameRoom {
  constructor(roomCode, adminSocketId, adminNickname) {
    this.roomCode = roomCode;
    this.players = new Map();
    this.adminSocketId = adminSocketId;
    this.gameState = {
      phase: "LOBBY",
      round: 0,
      wordPair: null,
      imposter: null,
      votes: new Map(),
      eliminated: [],
      timer: { enabled: false, duration: 0, remaining: 0 },
    };

    // Add admin as first player
    this.addPlayer(adminSocketId, adminNickname);
  }

  addPlayer(socketId, nickname) {
    this.players.set(socketId, {
      nickname,
      socketId,
      isAdmin: socketId === this.adminSocketId,
      isConnected: true,
      isEliminated: false,
      word: null,
    });
  }

  hasPlayer(nickname) {
    for (let player of this.players.values()) {
      if (player.nickname === nickname) return true;
    }
    return false;
  }

  getPlayers() {
    return Array.from(this.players.values()).map((player) => ({
      nickname: player.nickname,
      isAdmin: player.isAdmin,
      isConnected: player.isConnected,
      isEliminated: player.isEliminated,
    }));
  }

  getPlayerBySocket(socketId) {
    return this.players.get(socketId);
  }

  getPlayerSocket(nickname) {
    for (let player of this.players.values()) {
      if (player.nickname === nickname) return player.socketId;
    }
    return null;
  }

  getPlayer(nickname) {
    for (let player of this.players.values()) {
      if (player.nickname === nickname) return player;
    }
    return null;
  }

  reconnectPlayer(socketId, nickname) {
    for (let [oldSocketId, player] of this.players.entries()) {
      if (player.nickname === nickname) {
        // Update socket ID
        this.players.delete(oldSocketId);
        player.socketId = socketId;
        player.isConnected = true;
        this.players.set(socketId, player);

        // If this was the admin, update admin socket
        if (player.isAdmin) {
          this.adminSocketId = socketId;
        }
        return true;
      }
    }
    return false;
  }

  markPlayerDisconnected(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      player.isConnected = false;
    }
  }

  transferAdmin() {
    // Find first connected, non-eliminated player
    for (let player of this.players.values()) {
      if (player.isConnected && !player.isEliminated && !player.isAdmin) {
        player.isAdmin = true;
        this.adminSocketId = player.socketId;
        return player;
      }
    }
    return null;
  }

  startGame() {
    if (this.players.size < 3) {
      return { success: false, message: "Need at least 3 players to start" };
    }

    // Select random word pair
    const randomIndex = Math.floor(Math.random() * wordPairs.length);
    this.gameState.wordPair = wordPairs[randomIndex];

    // Select random imposter and starter independently
    const playerArray = Array.from(this.players.values());
    console.log(
      "Players in game:",
      playerArray.map((p) => p.nickname)
    );

    // Select random imposter using independent random selection
    const imposterIndex = Math.floor(Math.random() * playerArray.length);
    this.gameState.imposter = playerArray[imposterIndex].nickname;
    console.log(
      "Selected imposter:",
      this.gameState.imposter,
      "at index:",
      imposterIndex
    );

    // Select random starter using completely independent random selection
    const starterIndex = Math.floor(Math.random() * playerArray.length);
    this.gameState.starter = playerArray[starterIndex].nickname;
    console.log(
      "Selected starter:",
      this.gameState.starter,
      "at index:",
      starterIndex
    );

    // Assign words
    for (let [socketId, player] of this.players.entries()) {
      if (player.nickname === this.gameState.imposter) {
        player.word = this.gameState.wordPair[1]; // Imposter gets second word
      } else {
        player.word = this.gameState.wordPair[0]; // Others get first word
      }
    }

    this.gameState.phase = "STATEMENT_ROUND";
    this.gameState.round = 1;
    this.gameState.votes.clear();
    this.gameState.eliminated = [];

    return {
      success: true,
      data: {
        phase: this.gameState.phase,
        round: this.gameState.round,
        players: this.getPlayers(),
        wordPair: this.gameState.wordPair,
        imposter: this.gameState.imposter,
        starter: this.gameState.starter,
      },
    };
  }

  nextPhase() {
    switch (this.gameState.phase) {
      case "STATEMENT_ROUND":
        this.gameState.phase = "VOTING";
        return {
          success: true,
          phase: this.gameState.phase,
          round: this.gameState.round,
          players: this.getPlayers(),
        };
      case "VOTING":
        // Check if all alive players have voted
        const alivePlayers = Array.from(this.players.values()).filter(
          (p) => !p.isEliminated
        );
        const votedPlayers = Array.from(this.gameState.votes.keys());
        const alivePlayerSocketIds = alivePlayers.map((p) => p.socketId);
        const allVoted = alivePlayerSocketIds.every((socketId) =>
          votedPlayers.includes(socketId)
        );

        if (!allVoted) {
          const pendingVoters = alivePlayers.filter(
            (p) => !votedPlayers.includes(p.socketId)
          );
          return {
            success: false,
            message: "Not all players have voted yet",
            pendingVoters: pendingVoters.map((p) => p.nickname),
          };
        }

        this.gameState.phase = "REVEAL";
        // Return vote results for display
        const voteResults = this.getVoteResults();
        return {
          success: true,
          phase: this.gameState.phase,
          round: this.gameState.round,
          players: this.getPlayers(),
          voteResults: {
            eliminated: voteResults.eliminated,
            voteCounts: Object.fromEntries(voteResults.voteCounts),
            individualVotes: voteResults.individualVotes,
            imposter: this.gameState.imposter,
            wasImposter: voteResults.eliminated === this.gameState.imposter,
          },
        };
      case "REVEAL":
        // Process the elimination and check win conditions
        const results = this.getVoteResults();
        if (results.eliminated) {
          const eliminatedPlayer = this.eliminatePlayer(results.eliminated);
          const wasImposter = results.eliminated === this.gameState.imposter;

          // Check win conditions after elimination
          const alivePlayers = Array.from(this.players.values()).filter(
            (p) => !p.isEliminated
          );
          const aliveImposters = alivePlayers.filter(
            (p) => p.nickname === this.gameState.imposter
          );

          if (aliveImposters.length === 0) {
            this.gameState.phase = "GAME_OVER";
            return {
              success: true,
              phase: this.gameState.phase,
              winner: "villagers",
              eliminatedPlayer: results.eliminated,
              wasImposter: wasImposter,
            };
          } else if (
            alivePlayers.length <= 2 &&
            alivePlayers.some((p) => p.nickname === this.gameState.imposter)
          ) {
            // Imposter wins only if there's 1 villager left (plus imposter = 2 total)
            this.gameState.phase = "GAME_OVER";
            return {
              success: true,
              phase: this.gameState.phase,
              winner: "imposter",
              eliminatedPlayer: results.eliminated,
              wasImposter: wasImposter,
            };
          } else {
            // Continue to next round
            this.gameState.phase = "STATEMENT_ROUND";
            this.gameState.round++;
            this.gameState.votes.clear();
            return {
              success: true,
              phase: this.gameState.phase,
              round: this.gameState.round,
              players: this.getPlayers(),
              eliminatedPlayer: results.eliminated,
              wasImposter: wasImposter,
              continueGame: true,
            };
          }
        }
        break;
    }

    return {
      success: true,
      phase: this.gameState.phase,
      round: this.gameState.round,
      players: this.getPlayers(),
    };
  }

  addVote(socketId, targetNickname) {
    if (this.gameState.phase !== "VOTING") {
      return { success: false, message: "Not in voting phase" };
    }

    const voter = this.players.get(socketId);
    if (!voter || voter.isEliminated) {
      return { success: false, message: "Cannot vote" };
    }

    // Check if target exists and is alive
    const target = Array.from(this.players.values()).find(
      (p) => p.nickname === targetNickname
    );
    if (!target || target.isEliminated) {
      return { success: false, message: "Invalid target" };
    }

    this.gameState.votes.set(socketId, targetNickname);
    return { success: true };
  }

  getVoteResults() {
    const voteCounts = new Map();
    const individualVotes = [];

    // Get individual votes
    for (let [voterSocketId, target] of this.gameState.votes.entries()) {
      const voter = this.players.get(voterSocketId);
      if (voter) {
        individualVotes.push({
          voter: voter.nickname,
          target: target,
        });
      }
    }

    // Count votes
    for (let target of this.gameState.votes.values()) {
      voteCounts.set(target, (voteCounts.get(target) || 0) + 1);
    }

    let maxVotes = 0;
    let eliminated = null;
    for (let [player, votes] of voteCounts.entries()) {
      if (votes > maxVotes) {
        maxVotes = votes;
        eliminated = player;
      }
    }

    return { eliminated, voteCounts, individualVotes };
  }

  eliminatePlayer(nickname) {
    const player = Array.from(this.players.values()).find(
      (p) => p.nickname === nickname
    );
    if (player) {
      player.isEliminated = true;
      this.gameState.eliminated.push({
        nickname,
        wasImposter: nickname === this.gameState.imposter,
        round: this.gameState.round,
      });
      return true;
    }
    return false;
  }

  kickPlayer(nickname) {
    const player = Array.from(this.players.values()).find(
      (p) => p.nickname === nickname
    );
    if (player) {
      this.players.delete(player.socketId);
      return { success: true };
    }
    return { success: false, message: "Player not found" };
  }

  restartGame() {
    this.gameState = {
      phase: "LOBBY",
      round: 0,
      wordPair: null,
      imposter: null,
      votes: new Map(),
      eliminated: [],
      timer: { enabled: false, duration: 0, remaining: 0 },
    };

    // Reset all players
    for (let player of this.players.values()) {
      player.isEliminated = false;
      player.word = null;
    }
  }

  setTimer(enabled, duration) {
    this.gameState.timer = { enabled, duration, remaining: duration };
  }

  getGameState() {
    return {
      ...this.gameState,
      players: this.getPlayers(),
    };
  }
}

module.exports = GameRoom;
