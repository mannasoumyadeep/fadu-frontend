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
  });

  const backendURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

  const updateGameState = useCallback(
    (updates) =>
      setGameState((prev) =>
        typeof updates === 'function' ? updates(prev) : { ...prev, ...updates }
      ),
    []
  );

  const getCardImageURL = useCallback((card) => {
    if (!card) return null;
    const valueMap = { 1: "ace", 11: "jack", 12: "queen", 13: "king" };
    const valueStr = valueMap[card.value] || card.value;
    return `/playing-cards/${valueStr}_of_${card.suit.toLowerCase()}.png`;
  }, []);

  useEffect(() => {
    if (!gameState.playerName || !gameState.roomCode || !gameState.gameStarted) return;

    const socket = io(backendURL, {
      transports: ['websocket'],
      query: { playerName: gameState.playerName, roomCode: gameState.roomCode },
    });

    socket.on('connect', () => {
      socket.emit('join_room', {
        room_id: gameState.roomCode,
        player_id: gameState.playerName,
        is_host: gameState.isCreatingGame,
      });
    });

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
          gameStatus: 'playing',
          isHost: data.is_host,
        }));
      },
      player_joined: (data) => {
        updateGameState((prev) => ({
          ...prev,
          players: data.players.map((pid) => ({
            id: pid,
            name: pid,
            hand:
              pid === prev.playerName
                ? prev.players.find((p) => p.id === prev.playerName)?.hand || []
                : [],
            score: 0,
            isHost: data.host_id === pid,
          })),
        }));
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
            player.id === prev.playerName ? { ...player, hand: data.hand } : player
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
      game_started: (data) => {
        updateGameState({
          gameStatus: 'playing',
          players: data.players,
          currentTurn: data.current_turn,
          deckCount: data.deck_count,
        });
      },
      error: (data) => {
        updateGameState({ connectionError: data.message });
      },
    };

    Object.entries(socketEvents).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    updateGameState({ socket });

    return () => socket.disconnect();
  }, [
    gameState.playerName,
    gameState.roomCode,
    gameState.gameStarted,
    gameState.isCreatingGame, // Added to fix ESLint warning
    backendURL,
    updateGameState,
  ]);

  const handleCardSelect = useCallback(
    (index) => {
      if (gameState.currentTurn !== gameState.playerName) return;

      setGameState((prev) => {
        const newSelected = new Set(prev.selectedCards);
        const playerHand = prev.players.find((p) => p.id === prev.playerName)?.hand || [];
        const selectedCard = playerHand[index];

        if (prev.selectedCards.size === 0) {
          newSelected.add(index);
        } else {
          const firstSelectedCard = playerHand[Array.from(prev.selectedCards)[0]];
          if (selectedCard.value === firstSelectedCard.value) {
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
    [gameState.currentTurn, gameState.playerName]
  );

  const gameActions = {
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
    startGame: () => {
      const { socket, isHost, roomCode } = gameState;
      if (socket && isHost) {
        socket.emit('start_game', { room_id: roomCode });
      }
    },
  };

  const PlayerCard = ({ player, isCurrentPlayer }) => (
    <Card className={cn("w-full", isCurrentPlayer ? "bg-primary/10" : "bg-background", "shadow-md")}>
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {player.isHost && <Crown className="h-4 w-4 text-yellow-500" />}
            <Users className="h-4 w-4" />
            <span className="font-semibold">{player.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span>{player.score || 0}</span>
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const GameBoard = () => (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Room: {gameState.roomCode}</h2>
          <span className="text-sm">Deck: {gameState.deckCount} cards</span>
        </div>
        {gameState.isHost && gameState.gameStatus === 'waiting' && (
          <Button onClick={gameActions.startGame} disabled={gameState.players.length < 2}>
            Start Game
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Players</h3>
            <span className="text-sm">{gameState.players.length}/4 Players</span>
          </div>
          <div className="grid gap-2">
            {gameState.players.map((player) => (
              <PlayerCard key={player.id} player={player} isCurrentPlayer={gameState.currentTurn === player.id} />
            ))}
          </div>
        </div>

        <Card className="h-full">
          <CardHeader className="p-4">
            <h3 className="text-lg font-semibold">Table Cards</h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {gameState.tableCards.length > 0 ? (
                gameState.tableCards.map((card, index) => (
                  <div key={index} className="playing-card">
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
            {gameState.players.find((p) => p.id === gameState.playerName)?.hand.map((card, index) => (
              <div
                key={index}
                onClick={() => handleCardSelect(index)}
                className={cn(
                  "playing-card",
                  gameState.selectedCards.has(index) && "selected",
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
              disabled={gameState.currentTurn !== gameState.playerName || gameState.deckCount === 0}
              variant="secondary"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Draw Card ({gameState.deckCount})
            </Button>

            <Button
              onClick={gameActions.playCards}
              disabled={gameState.currentTurn !== gameState.playerName || gameState.selectedCards.size === 0}
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
          <Button
            onClick={() => {
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
            Create New Room
          </Button>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter room code"
              value={gameState.roomCode}
              onChange={(e) => updateGameState({ roomCode: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 rounded border bg-background text-foreground"
            />
            <Button onClick={() => updateGameState({ gameStarted: true })} className="w-full">
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
