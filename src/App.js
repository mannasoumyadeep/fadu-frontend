import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Trophy, Users, RefreshCcw, HandMetal, Crown, Play } from 'lucide-react';
import { cn } from './lib/utils';

function App() {
  // State for setup and game
  const [gameState, setGameState] = useState({
    roomCode: '',
    playerName: '',
    totalRounds: 1,
    isJoined: false,      // true when the user has pressed Join/Create Room
    isHost: false,
    gameStarted: false,
    players: [],
    currentTurn: null,
    tableCards: [],
    deckCount: 52,
    currentRound: 1,
    callResult: null,
    finalResults: null,
    gameStatus: 'waiting',
    selectedCards: [],
    socket: null,
    connectionError: ''
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

  // Create the socket connection once after joining the room.
  useEffect(() => {
    if (!gameState.isJoined) return;
    const socket = io(backendURL, {
      transports: ['websocket'],
      query: { playerName: gameState.playerName, roomCode: gameState.roomCode }
    });

    socket.on('connect', () => {
      console.log("Socket connected");
      socket.emit('join_room', { room_id: gameState.roomCode, player_id: gameState.playerName });
    });

    const events = {
      game_state: data => {
        updateGameState({
          players: data.players,
          currentTurn: data.current_turn,
          tableCards: data.table_cards || [],
          deckCount: data.deck_count,
          gameStatus: data.game_status || 'waiting',
          currentRound: data.current_round || 1,
          isHost: data.host_id === gameState.playerName,
        });
      },
      player_joined: data => {
        updateGameState({ players: data.players });
      },
      game_started: data => {
        updateGameState({
          gameStarted: true,
          gameStatus: 'playing',
          players: data.players,
          currentTurn: data.current_turn,
          deckCount: data.deck_count,
          currentRound: data.current_round,
        });
      },
      cards_played: data => {
        updateGameState({
          tableCards: data.table_cards,
          currentTurn: data.current_turn,
          deckCount: data.deck_count,
          selectedCards: [],
        });
      },
      hand_updated: data => {
        // Update hand only for this player.
        updateGameState({
          players: gameState.players.map(p => p === gameState.playerName ? { ...p, hand: data.hand } : p),
          deckCount: data.deck_count,
        });
      },
      call_result: data => {
        updateGameState({ callResult: data, gameStatus: 'ended' });
      },
      round_won: data => {
        alert(`Player ${data.player_id} won this round (+4 points)!`);
      },
      next_round: data => {
        updateGameState({
          tableCards: [],
          currentTurn: data.current_turn,
          deckCount: data.deck_count,
          currentRound: data.current_round,
          players: data.players,
          gameStatus: 'playing',
          selectedCards: [],
          callResult: null,
        });
      },
      final_result: data => {
        updateGameState({ finalResults: data, gameStatus: 'final' });
      },
      error: data => {
        updateGameState({ connectionError: data.message });
        console.error(data.message);
      }
    };

    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    updateGameState({ socket });
    return () => socket.disconnect();
  }, [gameState.isJoined, backendURL, gameState.playerName, gameState.roomCode]);

  const handleCardSelect = useCallback(index => {
    if (gameState.currentTurn !== gameState.playerName) return;
    let newSelected = [...gameState.selectedCards];
    if (newSelected.includes(index)) {
      newSelected = newSelected.filter(i => i !== index);
    } else {
      newSelected.push(index);
    }
    updateGameState({ selectedCards: newSelected });
  }, [gameState.currentTurn, gameState.playerName, gameState.selectedCards, updateGameState]);

  const gameActions = {
    startGame: () => {
      if (gameState.socket && gameState.players.length >= 2) {
        gameState.socket.emit('start_game', { room_id: gameState.roomCode, total_rounds: gameState.totalRounds });
      }
    },
    playCards: () => {
      if (gameState.socket && gameState.currentTurn === gameState.playerName && gameState.selectedCards.length > 0) {
        gameState.socket.emit('play_cards', { player_id: gameState.playerName, card_indices: gameState.selectedCards.sort((a,b)=>b-a) });
      }
    },
    drawCard: () => {
      if (gameState.socket) {
        gameState.socket.emit('draw_card', { player_id: gameState.playerName });
      }
    },
    callGame: () => {
      if (gameState.socket) {
        gameState.socket.emit('call', { player_id: gameState.playerName });
      }
    }
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
          onChange={e => updateGameState({ totalRounds: Number(e.target.value) })}
          className="w-full px-3 py-2 rounded border bg-background text-foreground"
          min={1}
        />
        <Button onClick={() => {
          let code = gameState.roomCode;
          if (!code) {
            code = Math.random().toString(36).substring(2,8).toUpperCase();
            updateGameState({ roomCode: code });
          }
          updateGameState({ isJoined: true });
        }} className="w-full">
          Join / Create Room
        </Button>
        {gameState.connectionError && (
          <Card className="bg-destructive">
            <CardContent className="p-4 text-destructive-foreground">
              {gameState.connectionError}
            </CardContent>
          </Card>
        )}
        {gameState.roomCode && (
          <Card className="bg-accent">
            <CardContent className="p-4">
              <p className="font-mono text-center">
                Room Code: <span className="font-bold">{gameState.roomCode}</span>
              </p>
              <p className="text-sm text-center mt-2">Share this with friends!</p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );

  const GameBoard = () => {
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
                <li key={pid}>{pid}: {sc} points</li>
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
          {gameState.players.length >= 2 && gameState.players[0] === gameState.playerName && gameState.gameStatus === 'waiting' && (
            <Button onClick={gameActions.startGame}>Start Game</Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Players</h3>
              <span className="text-sm">{gameState.players.length}/4 Players</span>
            </div>
            <div className="grid gap-2">
              {gameState.players.map(pl => (
                <Card key={pl} className={cn("w-full shadow-md", gameState.currentTurn === pl ? "bg-primary/10" : "bg-background")}>
                  <CardHeader className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {pl === gameState.players[0] && <Crown className="h-4 w-4 text-yellow-500" />}
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">{pl}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span>0</span>
                    </div>
                  </CardHeader>
                </Card>
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
                  gameState.tableCards.map((card, idx) => (
                    <div key={idx} className="playing-card">
                      <img src={getCardImageURL(card)} alt={`${card.value} of ${card.suit}`} className="w-full h-full object-contain" />
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No cards played yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
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
                {(() => {
                  const me = gameState.players.find(p => p === gameState.playerName);
                  return me && me.hand
                    ? me.hand.map((card, idx) => (
                        <div key={idx} onClick={() => handleCardSelect(idx)} className={cn("playing-card", gameState.selectedCards.includes(idx) && "selected", gameState.currentTurn === gameState.playerName ? "" : "disabled")}>
                          <img src={getCardImageURL(card)} alt={`${card.value} of ${card.suit}`} className="w-full h-full object-contain" />
                        </div>
                      ))
                    : null;
                })()}
              </div>
              <div className="flex justify-center gap-4 mt-6">
                <Button onClick={gameActions.drawCard} disabled={gameState.currentTurn !== gameState.playerName || gameState.deckCount === 0} variant="secondary">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Draw Card ({gameState.deckCount})
                </Button>
                <Button onClick={gameActions.playCards} disabled={gameState.currentTurn !== gameState.playerName || gameState.selectedCards.length === 0}>
                  <Play className="mr-2 h-4 w-4" />
                  Play {gameState.selectedCards.length} Card{gameState.selectedCards.length !== 1 && 's'}
                </Button>
                <Button onClick={gameActions.callGame} disabled={gameState.currentTurn !== gameState.playerName} variant="destructive">
                  <HandMetal className="mr-2 h-4 w-4" />
                  Call
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
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
                      <li key={pid} className="text-sm">{pid}: {total} points</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Scores:</h5>
                  <ul className="space-y-1">
                    {Object.entries(gameState.callResult.scores).map(([pid, score]) => (
                      <li key={pid} className="text-sm">{pid}: {score} points</li>
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

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        {!gameState.isJoined ? <SetupScreen /> : <GameBoard />}
      </div>
    </div>
  );
}

export default App;
