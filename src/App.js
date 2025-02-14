<<<<<<< HEAD
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
    deckCount: 52
  });

  const backendURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

  const updateGameState = useCallback((updates) => {
    setGameState(prev => (typeof updates === 'function' ? updates(prev) : { ...prev, ...updates }));
  }, []);

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
      query: { playerName: gameState.playerName, roomCode: gameState.roomCode }
    });

    socket.on('connect', () => {
      socket.emit('join_room', {
        room_id: gameState.roomCode,
        player_id: gameState.playerName,
        is_host: gameState.isCreatingGame
      });
    });

    const socketEvents = {
      'game_state': (data) => {
        updateGameState(prev => ({
          ...prev,
          players: prev.players.find(p => p.id === prev.playerName)
            ? prev.players
            : [...prev.players, {
                id: prev.playerName,
                name: prev.playerName,
                hand: data.hand,
                score: 0,
                isHost: data.is_host
              }],
          currentTurn: data.current_turn,
          tableCards: data.table_cards || [],
          deckCount: data.deck_count,
          gameStatus: 'playing',
          isHost: data.is_host
        }));
      },

      'player_joined': (data) => {
        updateGameState(prev => ({
          ...prev,
          players: data.players.map(pid => ({
            id: pid,
            name: pid,
            hand: pid === prev.playerName ? prev.players.find(p => p.id === prev.playerName)?.hand || [] : [],
            score: 0,
            isHost: data.host_id === pid
          }))
        }));
      },

      'cards_played': (data) => {
        updateGameState({
          tableCards: data.table_cards,
          currentTurn: data.current_turn,
          selectedCards: new Set(),
          deckCount: data.deck_count
        });
      },

      'hand_updated': (data) => {
        updateGameState(prev => ({
          ...prev,
          players: prev.players.map(player =>
            player.id === prev.playerName
              ? { ...player, hand: data.hand }
              : player
          ),
          deckCount: data.deck_count
        }));
      },

      'call_result': (data) => {
        updateGameState({
          callResult: data,
          gameStatus: 'ended'
        });
      },

      'game_started': (data) => {
        updateGameState({
          gameStatus: 'playing',
          players: data.players,
          currentTurn: data.current_turn,
          deckCount: data.deck_count
        });
      },

      'error': (data) => {
        updateGameState({ connectionError: data.message });
      }
    };

    Object.entries(socketEvents).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    updateGameState({ socket });
    return () => socket.disconnect();
  }, [gameState.playerName, gameState.roomCode, gameState.gameStarted, backendURL, updateGameState]);

  const handleCardSelect = useCallback((index) => {
    if (gameState.currentTurn !== gameState.playerName) return;

    setGameState(prev => {
      const newSelected = new Set(prev.selectedCards);
      const playerHand = prev.players.find(p => p.id === prev.playerName)?.hand || [];
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
  }, [gameState.currentTurn, gameState.playerName]);

  const gameActions = {
    playCards: () => {
      const { socket, currentTurn, playerName, selectedCards } = gameState;
      if (socket && currentTurn === playerName && selectedCards.size > 0) {
        socket.emit('play_cards', {
          player_id: playerName,
          card_indices: Array.from(selectedCards).sort((a, b) => b - a)
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
    }
  };

  const PlayerCard = ({ player, isCurrentPlayer }) => (
    <Card className={cn(
      "w-full",
      isCurrentPlayer ? "bg-primary/10" : "bg-background",
      "shadow-md"
    )}>
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
            {gameState.players.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                isCurrentPlayer={gameState.currentTurn === player.id}
              />
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
            {gameState.players.find(p => p.id === gameState.playerName)?.hand.map((card, index) => (
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
              disabled={
                gameState.currentTurn !== gameState.playerName ||
                gameState.selectedCards.size === 0
              }
            >
              <Play className="mr-2 h-4 w-4" />
              Play {gameState.selectedCards.size} Card{gameState.selectedCards.size !== 1 ? 's' : ''}
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
          onChange={e => updateGameState({ playerName: e.target.value })}
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
                isHost: true
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
              onChange={e => updateGameState({ roomCode: e.target.value.toUpperCase() })}
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
=======
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

const App = () => {
  const [roomCode, setRoomCode] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [tableCards, setTableCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]); // indices for multi-card selection
  const [playerName, setPlayerName] = useState('');
  const [socket, setSocket] = useState(null);
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [callResult, setCallResult] = useState(null);

  // Replace with your deployed backend URL or default to localhost for testing
  const backendURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

  // Get card image URL from public/playing-cards (SVG images)
  const getCardImageURL = (card) => {
    if (!card) return null;
    const valueMap = { 1: "ace", 11: "jack", 12: "queen", 13: "king" };
    const valueStr = valueMap[card.value] || card.value;
    return `/playing-cards/${valueStr}_of_${card.suit.toLowerCase()}.svg`;
  };

  useEffect(() => {
    if (!playerName || !roomCode || !gameStarted) return;
    const socketIO = io(backendURL, { transports: ['websocket'], query: { playerName, roomCode } });
    socketIO.on('connect', () => {
      console.log('Connected to backend');
      socketIO.emit('join_room', { room_id: roomCode, player_id: playerName });
    });
    socketIO.on('game_state', (data) => {
      console.log("Game state:", data);
      setPlayers(prev => {
        if (!prev.find(p => p.id === playerName)) {
          return [...prev, { id: playerName, name: playerName, hand: data.hand, score: 0 }];
        }
        return prev;
      });
      setCurrentTurn(data.current_turn);
      setTableCards(data.table_cards || []);
    });
    socketIO.on('player_joined', (data) => {
      console.log(`${data.player_id} joined`);
      setPlayers(data.players.map(pid => ({
        id: pid,
        name: pid,
        hand: pid === playerName ? players.find(p => p.id === playerName)?.hand || [] : [],
        score: 0
      })));
    });
    socketIO.on('card_played', (data) => {
      console.log("Card played:", data);
      setTableCards(data.table_cards);
      setCurrentTurn(data.current_turn);
      setSelectedCards([]);
    });
    socketIO.on('hand_updated', (data) => {
      setPlayers(prev =>
        prev.map(player =>
          player.id === playerName ? { ...player, hand: data.hand } : player
        )
      );
    });
    socketIO.on('card_drawn', (data) => {
      setPlayers(prev =>
        prev.map(player =>
          player.id === playerName ? { ...player, hand: data.hand } : player
        )
      );
    });
    socketIO.on('call_result', (data) => {
      console.log("Call result:", data);
      setCallResult(data);
    });
    socketIO.on('error', (data) => {
      setConnectionError(data.message);
    });
    setSocket(socketIO);
    return () => socketIO.disconnect();
  }, [playerName, roomCode, gameStarted]);

  // Toggle selection: allow multi-card selection if matching the top card (if any)
  const toggleCardSelection = (index) => {
    if (currentTurn !== playerName) return;
    const myHand = players.find(p => p.id === playerName)?.hand;
    if (!myHand) return;
    if (tableCards.length > 0) {
      const topValue = tableCards[tableCards.length - 1].value;
      if (myHand[index].value !== topValue) return;
    }
    setSelectedCards(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleCreateGame = () => {
    let newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    if(newCode.length < 6) newCode = newCode.padEnd(6, 'A');
    setRoomCode(newCode);
    setShowRoomCode(true);
    setGameStarted(true);
  };

  const handleJoinGame = () => {
    setGameStarted(true);
  };

  const drawCard = () => {
    if (socket && currentTurn === playerName) {
      socket.emit('draw_card', { player_id: playerName });
    }
  };

  const playCards = () => {
    if (socket && currentTurn === playerName && selectedCards.length > 0) {
      socket.emit('play_card', { player_id: playerName, card_indices: selectedCards });
    }
  };

  const handleCall = () => {
    if (socket && currentTurn === playerName) {
      socket.emit('call', { player_id: playerName });
    }
  };

  const resetGame = () => {
    window.location.reload();
  };

  const SetupScreen = () => (
    <div className="setup-container">
      <h1 className="title">Fadu Card Game</h1>
      <Input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={e => setPlayerName(e.target.value)}
      />
      <div className="mode-selector">
        <button onClick={() => setIsCreatingGame(true)}>Create Room</button>
        <button onClick={() => setIsCreatingGame(false)}>Join Room</button>
      </div>
      {isCreatingGame ? (
        <button className="btn" onClick={handleCreateGame}>Create New Room</button>
      ) : (
        <>
          <Input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
          />
          <button className="btn" onClick={handleJoinGame}>Join Room</button>
        </>
      )}
      {showRoomCode && (
        <div className="room-code">
          <p>Your Room Code: <strong>{roomCode}</strong></p>
          <p>Share this with friends!</p>
        </div>
      )}
      {connectionError && <p className="error">{connectionError}</p>}
    </div>
  );

  const PlayerCard = ({ player, isCurrentPlayer }) => (
    <div className="player-card">
      <div className="player-header">
        <div className="player-info">
          <Users className="icon" />
          <span>{player.name}</span>
        </div>
        <div className="player-score">
          <Trophy className="icon" />
          <span>{player.score || 0}</span>
        </div>
      </div>
    </div>
  );

  const GameBoard = () => (
    <div className="game-board">
      <div className="header">
        <h2>Room: {roomCode}</h2>
        <h3>Current Turn: {currentTurn}</h3>
      </div>
      <div className="players-section">
        <h3>Players</h3>
        <div className="players-list">
          {players.map(player => (
            <PlayerCard key={player.id} player={player} isCurrentPlayer={currentTurn === player.id} />
          ))}
        </div>
      </div>
      <div className="table-section">
        <h3>Table Cards</h3>
        <div className="table-cards">
          {tableCards.length > 0 ? (
            <div className="card">
              <img src={getCardImageURL(tableCards[tableCards.length - 1])}
                alt={`${tableCards[tableCards.length - 1].value} of ${tableCards[tableCards.length - 1].suit}`}
                className="card-image" />
            </div>
          ) : (
            <p className="no-cards">No cards played yet.</p>
          )}
        </div>
      </div>
      <div className="hand-section">
        <h3>Your Hand</h3>
        <div className="hand">
          {players.find(p => p.id === playerName)?.hand.map((card, index) => (
            <div key={index}
              onClick={() => currentTurn === playerName && toggleCardSelection(index)}
              className={`card ${selectedCards.includes(index) ? "selected" : ""}`}
            >
              <img src={getCardImageURL(card)}
                alt={`${card.value} of ${card.suit}`}
                className="card-image" />
            </div>
          ))}
        </div>
        <div className="controls">
          <button className="btn" onClick={drawCard} disabled={currentTurn !== playerName}>
            <RefreshCcw className="icon" /> Draw Card
          </button>
          <button className="btn" onClick={playCards} disabled={currentTurn !== playerName || selectedCards.length === 0}>
            Play Selected Cards
          </button>
          <button className="btn" onClick={handleCall} disabled={currentTurn !== playerName}>
            <HandMetal className="icon" /> Call
          </button>
          <button className="btn" onClick={resetGame}>Reset Game</button>
        </div>
        {callResult && (
          <div className="call-result">
            <h4>Call Result: {callResult.result === "win" ? "You Won!" : "You Lost"}</h4>
            <div className="result-details">
              <div>
                <h5>Hand Totals:</h5>
                <ul>
                  {Object.entries(callResult.player_sums).map(([pid, total]) => (
                    <li key={pid}>{pid}: {total} points</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>Scores:</h5>
                <ul>
                  {Object.entries(callResult.scores).map(([pid, score]) => (
                    <li key={pid}>{pid}: {score} points</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {!gameStarted ? <SetupScreen /> : <GameBoard />}
    </div>
  );
};

export default App;
>>>>>>> 126311a226d8285876475ba0d14da72eb156fb72
