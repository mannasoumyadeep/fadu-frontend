import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader } from "/components/ui/card";
import { Button } from "/components/ui/button";
import { Alert, AlertDescription } from "/components/ui/alert";
import { Trophy, Users, RefreshCcw, HandMetal, Crown, Play, Cards } from 'lucide-react';
import { cn } from './lib/utils';

const App = () => {
  const [gameState, setGameState] = useState({
    roomCode: '',
    playerName: '',
    totalRounds: 1,
    isJoined: false,
    isHost: false,
    gameStarted: false,
    players: [],
    currentTurn: null,
    tableCards: [],
    hand: [],
    deckCount: 52,
    currentRound: 1,
    callResult: null,
    gameStatus: 'waiting',
    selectedCards: [],
    socket: null,
    error: '',
    gamePaused: false,
    pausedPlayer: null
  });

  const backendURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

  const updateGameState = useCallback(
    (updates) => setGameState(prev => ({ ...prev, ...updates })),
    []
  );

  const getCardImageURL = useCallback(card => {
    if (!card) return '';
    const valueMap = { 1: "ace", 11: "jack", 12: "queen", 13: "king" };
    const value = valueMap[card.value] || card.value;
    return `/playing-cards/${value}_of_${card.suit.toLowerCase()}.png`;
  }, []);

  // Socket connection and event handlers
  useEffect(() => {
    if (!gameState.isJoined) return;

    const socket = io(backendURL, {
      transports: ['websocket'],
      query: { playerName: gameState.playerName, roomCode: gameState.roomCode }
    });

    socket.on('connect', () => {
      socket.emit('join_room', { 
        room_id: gameState.roomCode, 
        player_id: gameState.playerName 
      });
    });

    const eventHandlers = {
      game_state: (data) => {
        updateGameState({
          players: data.players,
          currentTurn: data.current_turn,
          tableCards: data.table_cards,
          hand: data.hand,
          deckCount: data.deck_count,
          gameStatus: data.game_status,
          currentRound: data.current_round,
          isHost: data.host_id === gameState.playerName,
          gamePaused: data.game_paused
        });
      },

      player_joined: (data) => {
        updateGameState({ 
          players: data.players,
          error: ''
        });
      },

      player_disconnected: (data) => {
        updateGameState({
          gamePaused: true,
          pausedPlayer: data.player_id,
          error: `Game paused: Waiting for ${data.player_id} to reconnect...`
        });
      },

      game_started: (data) => {
        updateGameState({
          gameStarted: true,
          gameStatus: 'playing',
          players: data.players,
          currentTurn: data.current_turn,
          deckCount: data.deck_count,
          currentRound: data.current_round,
          error: ''
        });
      },

      cards_played: (data) => {
        updateGameState({
          tableCards: data.table_cards,
          currentTurn: data.current_turn,
          deckCount: data.deck_count,
          selectedCards: [],
          players: data.players.map(p => ({
            ...p,
            cardCount: data.player_card_counts[p.id]
          }))
        });
      },

      hand_updated: (data) => {
        updateGameState({
          hand: data.hand,
          deckCount: data.deck_count,
          error: ''
        });
      },

      call_result: (data) => {
        updateGameState({
          callResult: data,
          error: ''
        });
      },

      round_started: (data) => {
        updateGameState({
          tableCards: [],
          currentTurn: data.current_turn,
          deckCount: data.deck_count,
          currentRound: data.current_round,
          players: gameState.players.map(p => ({
            ...p,
            cardCount: data.player_card_counts[p.id]
          })),
          gameStatus: 'playing',
          selectedCards: [],
          callResult: null,
          error: ''
        });
      },

      game_over: (data) => {
        const winners = data.winners.join(', ');
        updateGameState({
          gameStatus: 'finished',
          error: `Game Over! Winner(s): ${winners}`
        });
      },

      error: (data) => {
        updateGameState({ error: data.message });
      },

      game_forfeited: (data) => {
        updateGameState({
          gameStatus: 'finished',
          error: `Game forfeited: ${data.reason}`
        });
      }
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    updateGameState({ socket });
    return () => socket.disconnect();
  }, [gameState.isJoined, backendURL, gameState.playerName, gameState.roomCode]);

  const handleCardSelect = useCallback((index) => {
    if (gameState.currentTurn !== gameState.playerName || gameState.gamePaused) return;

    let newSelected = [...gameState.selectedCards];
    if (newSelected.includes(index)) {
      newSelected = newSelected.filter(i => i !== index);
    } else {
      newSelected.push(index);
    }
    updateGameState({ selectedCards: newSelected });
  }, [gameState.currentTurn, gameState.playerName, gameState.selectedCards, gameState.gamePaused]);

  const gameActions = {
    startGame: () => {
      if (gameState.socket && gameState.players.length >= 2) {
        gameState.socket.emit('start_game', {
          room_id: gameState.roomCode,
          total_rounds: gameState.totalRounds
        });
      }
    },

    playCards: () => {
      if (!gameState.gamePaused && gameState.socket && 
          gameState.currentTurn === gameState.playerName && 
          gameState.selectedCards.length > 0) {
        gameState.socket.emit('play_cards', {
          player_id: gameState.playerName,
          card_indices: gameState.selectedCards.sort((a,b) => b-a)
        });
      }
    },

    drawCard: () => {
      if (!gameState.gamePaused && gameState.socket) {
        gameState.socket.emit('draw_card', {
          player_id: gameState.playerName
        });
      }
    },

    callGame: () => {
      if (!gameState.gamePaused && gameState.socket) {
        gameState.socket.emit('call', {
          player_id: gameState.playerName
        });
      }
    }
  };

  // UI Components
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
          onChange={e => updateGameState({ playerName: e.target.value })}
          className="w-full px-3 py-2 rounded border bg-background text-foreground"
        />
        <input
          type="text"
          placeholder="Enter room code (leave blank to create new)"
          value={gameState.roomCode}
          onChange={e => updateGameState({ roomCode: e.target.value.toUpperCase() })}
          className="w-full px-3 py-2 rounded border bg-background text-foreground"
        />
        <input
          type="number"
          placeholder="Total Rounds"
          value={gameState.totalRounds}
          onChange={e => updateGameState({ totalRounds: Math.max(1, Number(e.target.value)) })}
          className="w-full px-3 py-2 rounded border bg-background text-foreground"
          min={1}
        />
        <Button 
          onClick={() => {
            let code = gameState.roomCode;
            if (!code) {
              code = Math.random().toString(36).substring(2,8).toUpperCase();
            }
            updateGameState({ roomCode: code, isJoined: true });
          }} 
          className="w-full"
          disabled={!gameState.playerName}
        >
          Join / Create Room
        </Button>

        {gameState.error && (
          <Alert variant="destructive">
            <AlertDescription>{gameState.error}</AlertDescription>
          </Alert>
        )}

        {gameState.roomCode && (
          <Alert>
            <AlertDescription>
              Room Code: <span className="font-bold">{gameState.roomCode}</span>
              <p className="text-sm mt-2">Share this with friends!</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const GameBoard = () => (
    <div className="space-y-8">
      {/* Game Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Room: {gameState.roomCode}</h2>
          <span className="text-sm">Deck: {gameState.deckCount} cards</span>
          <span className="text-sm">Round: {gameState.currentRound}</span>
        </div>
        {gameState.isHost && !gameState.gameStarted && gameState.players.length >= 2 && (
          <Button onClick={gameActions.startGame}>Start Game</Button>
        )}
      </div>

      {/* Game Status Message */}
      {gameState.error && (
        <Alert variant="destructive">
          <AlertDescription>{gameState.error}</AlertDescription>
        </Alert>
      )}

      {/* Players and Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Players List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Players</h3>
            <span className="text-sm">{gameState.players.length}/8 Players</span>
          </div>
          <div className="grid gap-2">
            {gameState.players.map(player => (
              <Card 
                key={player.id} 
                className={cn(
                  "w-full",
                  gameState.currentTurn === player.id && "bg-primary/10",
                  !player.connected && "opacity-50"
                )}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {player.id === gameState.players[0] && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">{player.id}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Cards className="h-4 w-4" />
                      <span>{player.cardCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span>{player.score || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Table Cards */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Table Cards</h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {gameState.tableCards.length > 0 ? (
                gameState.tableCards.map((card, idx) => (
                  <div key={idx} className="playing-card">
                    <img 
                      src={getCardImageURL(card)} 
                      alt={`${card.value} of ${card.suit}`} 
                      className="w-24 h-36 object-contain"
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

      {/* Player's Hand */}
      {gameState.gameStarted && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your Hand</h3>
              {gameState.currentTurn === gameState.playerName && (
                <span className="text-green-500 font-semibold">Your turn!</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 justify-center">
              {gameState.hand.map((card, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCardSelect(idx)}
                  className={cn(
                    "playing-card cursor-pointer transition-all",
                    gameState.selectedCards.includes(idx) && "transform -translate-y-4",
                    (gameState.currentTurn !== gameState.playerName || gameState.gamePaused) && "opacity-50"
                  )}
                >
                  <img
                    src={getCardImageURL(card)}
                    alt={`${card.value} of ${card.suit}`}
                    className="w-24 h-36 object-contain"
                  />
                </div>
              ))}
            </div>

            {/* Game Actions */}
            <div className="flex justify-center gap-4 mt-6">
              <Button
                onClick={gameActions.drawCard}
                disabled={
                  gameState.currentTurn !== gameState.playerName ||
                  gameState.deckCount === 0 ||
                  gameState.gamePaused
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
                  gameState.selectedCards.length === 0 ||
                  gameState.gamePaused
                }
              >
                <Play className="mr-2 h-4 w-4" />
                Play {gameState.selectedCards.length} Card{gameState.selectedCards.length !== 1 && 's'}
              </Button>
              <Button
                onClick={gameActions.callGame}
                disabled={
                  gameState.currentTurn !== gameState.playerName ||
                  gameState.gamePaused
                }
                variant="destructive"
              >
                <HandMetal className="mr-2 h-4 w-4" />
                Call
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Result Display */}
      {gameState.callResult && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <h4 className="text-lg font-semibold mb-4">
              Call Result: {gameState.callResult.result === "win" ? "Success!" : "Failed"}
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

  // Render main app
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        {!gameState.isJoined ? <SetupScreen /> : <GameBoard />}
      </div>
    </div>
  );
};

export default App;