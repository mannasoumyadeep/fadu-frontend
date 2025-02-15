import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Trophy, Users, RefreshCcw, HandMetal, Crown, Play } from 'lucide-react';
import { cn } from './lib/utils';

function App() {
  const [gameState, setGameState] = useState({
    roomCode: '',
    isCreatingGame: true,
    gameStarted: false,
    players: [],
    currentTurn: null,
    tableCards: [],
    selectedCards: new Set(),
    playerName: '',
    socket: null,
    showRoomCode: false,
    connectionError: '',
    callResult: null,
    gameStatus: 'waiting',
    isHost: false,
    deckCount: 52,
    totalRounds: 1,
    currentRound: 1,
    finalResults: null,
  });

  // Change this to your actual backend URL or set it in Netlify as REACT_APP_BACKEND_URL
  const backendURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

  const updateGameState = useCallback(
    (updates) =>
      setGameState((prev) =>
        typeof updates === 'function' ? updates(prev) : { ...prev, ...updates }
      ),
    []
  );

  // Convert a card object {suit, value} into an image path
  const getCardImageURL = useCallback((card) => {
    if (!card) return null;
    const valueMap = { 1: "ace", 11: "jack", 12: "queen", 13: "king" };
    const valueStr = valueMap[card.value] || card.value;
    return `/playing-cards/${valueStr}_of_${card.suit.toLowerCase()}.png`;
  }, []);

  // Socket setup
  useEffect(() => {
    // Only connect after we have playerName, roomCode, and gameStarted = true
    if (!gameState.playerName || !gameState.roomCode || !gameState.gameStarted) return;

    const socket = io(backendURL, {
      transports: ['websocket'],
      query: {
        playerName: gameState.playerName,
        roomCode: gameState.roomCode,
      },
    });

    socket.on('connect', () => {
      socket.emit('join_room', {
        room_id: gameState.roomCode,
        player_id: gameState.playerName,
        is_host: gameState.isCreatingGame,
      });
    });

    // Define all socket event handlers
    const socketEvents = {
      game_state: (data) => {
        updateGameState((prev) => ({
          ...prev,
          players: prev.players.find((p) => p.id === prev.playerName)
            ? prev.players
            : [
                ...prev.players,
                {
                  id: prev.playerName,
                  name: prev.playerName,
                  hand: data.hand,
                  score: 0,
                  isHost: data.is_host,
                },
              ],
          currentTurn: data.current_turn,
          tableCards: data.table_cards || [],
          deckCount: data.deck_count,
          gameStatus: data.game_status || 'waiting',
          isHost: data.is_host,
          currentRound: data.current_round || 1,
        }));
      },
      player_joined: (data) => {
        updateGameState((prev) => ({
          ...prev,
          players: data.players.map((pid) => {
            const existing = prev.players.find((p) => p.id === pid);
            return {
              id: pid,
              name: pid,
              hand: existing?.hand || [],
              score: existing?.score || 0,
              isHost: data.host_id === pid,
            };
          }),
        }));
      },
      game_started: (data) => {
        updateGameState({
          gameStatus: 'playing',
          players: data.players,
          currentTurn: data.current_turn,
          deckCount: data.deck_count,
          currentRound: data.current_round,
        });
      },
      cards_played: (data) => {
        updateGameState({
          tableCards: data.table_cards,
          currentTurn: data.current_turn,
          selectedCards: new Set(),
          deckCount: data.deck_count,
        });
      },
      hand_updated: (data) => {
        updateGameState((prev) => ({
          ...prev,
          players: prev.players.map((player) =>
            player.id === prev.playerName
              ? { ...player, hand: data.hand }
              : player
          ),
          deckCount: data.deck_count,
        }));
      },
      call_result: (data) => {
        updateGameState({
          callResult: data,
          gameStatus: 'ended',
        });
      },
      round_won: (data) => {
        alert(`Player ${data.player_id} emptied their hand and got +4 points!`);
      },
      next_round: (data) => {
        updateGameState({
          tableCards: [],
          currentTurn: data.current_turn,
          deckCount: data.deck_count,
          currentRound: data.current_round,
          players: data.players,
          gameStatus: 'playing',
          selectedCards: new Set(),
          callResult: null,
        });
      },
      final_result: (data) => {
        updateGameState({
          finalResults: data,
          gameStatus: 'final',
        });
      },
      error: (data) => {
        updateGameState({ connectionError: data.message });
      },
    };

    // Register socket events
    for (const [event, handler] of Object.entries(socketEvents)) {
      socket.on(event, handler);
    }

    updateGameState({ socket });

    // Cleanup on unmount
    return () => socket.disconnect();
  }, [
    gameState.playerName,
    gameState.roomCode,
    gameState.gameStarted,
    gameState.isCreatingGame,
    backendURL,
    updateGameState,
  ]);

  // Handle selecting cards in the hand
  const handleCardSelect = useCallback(
    (index) => {
      if (gameState.currentTurn !== gameState.playerName) return;
      setGameState((prev) => {
        const newSelected = new Set(prev.selectedCards);
        const myHand = prev.players.find((p) => p.id === prev.playerName)?.hand || [];
        const clickedCard = myHand[index];

        if (prev.selectedCards.size === 0) {
          newSelected.add(index);
        } else {
          // Only allow selecting more if same value
          const firstSelectedCard = myHand[Array.from(prev.selectedCards)[0]];
          if (clickedCard.value === firstSelectedCard.value) {
            if (newSelected.has(index)) {
              newSelected.delete(index);
            } else {
              newSelected.add(index);
            }
          }
        }
        return { ...prev, selectedCards: newSelected };
      });
    },
    [gameState.currentTurn, gameState.playerName, gameState.players]
  );

  // Actions that emit socket events
  const gameActions = {
    startGame: () => {
      const { socket, isHost, roomCode, totalRounds, players } = gameState;
      if (socket && isHost && players.length >= 2) {
        socket.emit('start_game', {
          room_id: roomCode,
          total_rounds: totalRounds,
        });
      }
    },
    playCards: () => {
      const { socket, currentTurn, playerName, selectedCards } = gameState;
      if (socket && currentTurn === playerName && selectedCards.size > 0) {
        socket.emit('play_cards', {
          player_id: playerName,
          card_indices: Array.from(selectedCards).sort((a, b) => b - a),
        });
      }
    },
    drawCard: () => {
      const { socket, playerName } = gameState;
      if (socket) {
        socket.emit('draw_card', { player_id: playerName });
      }
    },
    callGame: () => {
      const { socket, playerName } = gameState;
      if (socket) {
        socket.emit('call', { player_id: playerName });
      }
    },
  };

  // Board / UI

  const GameBoard = () => {
    // If gameStatus is "final", show final results
    if (gameState.gameStatus === 'final' && gameState.finalResults) {
      const { scores, winners } = gameState.finalResults;
      return (
        <Card className="p-4">
          <CardHeader className="p-4">
            <h2 className="text-xl font-bold">Final Results</h2>
          </CardHeader>
          <CardContent>
            <ul>
              {Object.entries(scores).map(([pid, sc]) => (
                <li key={pid}>
                  {pid}: {sc} points
                </li>
              ))}
            </ul>
            <p>Winner(s): {winners.join(', ')}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Room: {gameState.roomCode}</h2>
            <span className="text-sm">Deck: {gameState.deckCount} cards</span>
            <span className="text-sm">Round: {gameState.currentRound}</span>
          </div>
          {gameState.isHost && gameState.gameStatus === 'waiting' && (
            <Button
              onClick={gameActions.startGame}
              disabled={gameState.players.length < 2}
            >
              Start Game
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Players List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Players</h3>
              <span className="text-sm">
                {gameState.players.length}/{4} Players
              </span>
            </div>
            <div className="grid gap-2">
              {gameState.players.map((pl) => (
                <Card
                  key={pl.id}
                  className={cn(
                    "w-full shadow-md",
                    gameState.currentTurn === pl.id ? "bg-primary/10" : "bg-background"
                  )}
                >
                  <CardHeader className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {pl.isHost && <Crown className="h-4 w-4 text-yellow-500" />}
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">{pl.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span>{pl.score || 0}</span>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Table Cards */}
          <Card className="h-full">
            <CardHeader className="p-4">
              <h3 className="text-lg font-semibold">Table Cards</h3>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {gameState.tableCards.length > 0 ? (
                  gameState.tableCards.map((card, idx) => (
                    <div key={idx} className="playing-card">
                      <img
                        src={getCardImageURL(card)}
                        alt={`${card.value} of ${card.suit}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No cards played yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Hand */}
        {gameState.gameStatus !== 'waiting' && (
          <Card className="mt-8">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Hand</h3>
                {gameState.currentTurn === gameState.playerName && (
                  <span className="text-sm text-green-500">Your turn!</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {gameState.players
                  .find((p) => p.id === gameState.playerName)
                  ?.hand.map((card, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleCardSelect(idx)}
                      className={cn(
                        "playing-card",
                        gameState.selectedCards.has(idx) && "selected",
                        gameState.currentTurn === gameState.playerName ? "" : "disabled"
                      )}
                    >
                      <img
                        src={getCardImageURL(card)}
                        alt={`${card.value} of ${card.suit}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))}
              </div>

              <div className="flex justify-center gap-4 mt-6">
                <Button
                  onClick={gameActions.drawCard}
                  disabled={
                    gameState.currentTurn !== gameState.playerName ||
                    gameState.deckCount === 0
                  }
                  variant="secondary"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Draw Card ({gameState.deckCount})
                </Button>
                <Button
                  onClick={gameActions.playCards}
                  disabled={
                    gameState.currentTurn !== gameState.playerName ||
                    gameState.selectedCards.size === 0
                  }
                >
                  <Play className="mr-2 h-4 w-4" />
                  Play {gameState.selectedCards.size} Card
                  {gameState.selectedCards.size !== 1 && 's'}
                </Button>
                <Button
                  onClick={gameActions.callGame}
                  disabled={gameState.currentTurn !== gameState.playerName}
                  variant="destructive"
                >
                  <HandMetal className="mr-2 h-4 w-4" />
                  Call
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call Result (if any) */}
        {gameState.callResult && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <h4 className="text-lg font-semibold mb-4">
                Call Result: {gameState.callResult.result === "win" ? "You Won!" : "You Lost"}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium mb-2">Hand Totals:</h5>
                  <ul className="space-y-1">
                    {Object.entries(gameState.callResult.player_sums).map(([pid, total]) => (
                      <li key={pid} className="text-sm">
                        {pid}: {total} points
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Scores:</h5>
                  <ul className="space-y-1">
                    {Object.entries(gameState.callResult.scores).map(([pid, score]) => (
                      <li key={pid} className="text-sm">
                        {pid}: {score} points
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const SetupScreen = () => (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <h1 className="text-2xl font-bold">Fadu Card Game</h1>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="text"
          placeholder="Enter your name"
          value={gameState.playerName}
          onChange={(e) => updateGameState({ playerName: e.target.value })}
          className="w-full px-3 py-2 rounded border bg-background text-foreground"
        />
        <div className="flex gap-2">
          <Button
            onClick={() => updateGameState({ isCreatingGame: true })}
            variant={gameState.isCreatingGame ? "default" : "outline"}
            className="flex-1"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Create Room
          </Button>
          <Button
            onClick={() => updateGameState({ isCreatingGame: false })}
            variant={!gameState.isCreatingGame ? "default" : "outline"}
            className="flex-1"
          >
            <Users className="mr-2 h-4 w-4" />
            Join Room
          </Button>
        </div>
        {gameState.isCreatingGame ? (
          <>
            <input
              type="number"
              placeholder="Number of Rounds"
              value={gameState.totalRounds}
              onChange={(e) => updateGameState({ totalRounds: +e.target.value })}
              className="w-full px-3 py-2 rounded border bg-background text-foreground"
              min={1}
            />
            <Button
              onClick={() => {
                // Generate random 6-char code
                const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                updateGameState({
                  roomCode: newCode,
                  showRoomCode: true,
                  gameStarted: true,
                  isHost: true,
                });
              }}
              className="w-full"
            >
              Create Room
            </Button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter room code"
              value={gameState.roomCode}
              onChange={(e) => updateGameState({ roomCode: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 rounded border bg-background text-foreground"
            />
            <Button
              onClick={() => updateGameState({ gameStarted: true })}
              className="w-full"
            >
              Join Room
            </Button>
          </>
        )}
        {gameState.showRoomCode && (
          <Card className="bg-accent">
            <CardContent className="p-4">
              <p className="font-mono text-center">
                Room Code: <span className="font-bold">{gameState.roomCode}</span>
              </p>
              <p className="text-sm text-center mt-2">Share this code with friends!</p>
            </CardContent>
          </Card>
        )}
        {gameState.connectionError && (
          <Card className="bg-destructive">
            <CardContent className="p-4 text-destructive-foreground">
              {gameState.connectionError}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        {!gameState.gameStarted ? <SetupScreen /> : <GameBoard />}
      </div>
    </div>
  );
}

export default App;
