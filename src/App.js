import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

function App() {
  // State variables for game data and UI
  const [roomCode, setRoomCode] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [tableCards, setTableCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [socket, setSocket] = useState(null);
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  // Update the backend URL to your deployed backend on Render
  const backendURL = "https://your-backend-service.onrender.com";

  useEffect(() => {
    if (!playerName || !roomCode || !gameStarted) return;
    
    const socketIO = io(backendURL, {
      transports: ['websocket'],
      query: { playerName, roomCode }
    });

    socketIO.on('connect', () => {
      console.log('Connected to backend');
      socketIO.emit('join_room', { room_id: roomCode, player_id: playerName });
    });

    socketIO.on('game_state', (data) => {
      console.log("Game state received:", data);
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
      console.log(`${data.player_id} joined the game`);
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
      setSelectedCard(null);
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

    socketIO.on('error', (data) => {
      setConnectionError(data.message);
    });

    setSocket(socketIO);

    return () => {
      socketIO.disconnect();
    };

  }, [playerName, roomCode, gameStarted]);

  const handleCreateGame = () => {
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(newRoomCode);
    setShowRoomCode(true);
    handleStartGame();
  };

  const handleJoinGame = () => {
    handleStartGame();
  };

  const handleStartGame = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    setGameStarted(true);
  };

  const drawCard = () => {
    if (socket && currentTurn === playerName) {
      socket.emit('draw_card', { player_id: playerName });
    }
  };

  const playCard = () => {
    if (socket && currentTurn === playerName && selectedCard !== null) {
      socket.emit('play_card', { player_id: playerName, card_index: selectedCard });
    }
  };

  const resetGame = () => {
    window.location.reload();
  };

  if (!gameStarted) {
    return (
      <div className="container">
        <div className="setup-container">
          <h1 className="title">Fadu Card Game</h1>
          <input
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
            <button className="btn" onClick={handleCreateGame}>Create Room</button>
          ) : (
            <input
              type="text"
              placeholder="Enter room code"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
            />
          )}
          <button className="btn" onClick={isCreatingGame ? handleCreateGame : handleJoinGame}>
            Start Game
          </button>
          {showRoomCode && (
            <div className="room-code">
              <p>Your Room Code: <strong>{roomCode}</strong></p>
              <p>Share this code with others to join!</p>
            </div>
          )}
          {connectionError && <p className="error">{connectionError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="game-container">
        <div className="header">
          <h2>Room: {roomCode}</h2>
          <h3>Current Turn: {currentTurn}</h3>
        </div>
        <div className="table">
          <h3>Table</h3>
          <div className="table-cards">
            {tableCards && tableCards.length > 0 ? (
              tableCards.map((card, index) => (
                <div key={index} className="card">
                  <p>{card.value} of {card.suit}</p>
                </div>
              ))
            ) : (
              <p>No cards played yet.</p>
            )}
          </div>
        </div>
        <div className="player-area">
          <h3>Your Hand</h3>
          <div className="hand">
            {players.find(p => p.id === playerName)?.hand.map((card, index) => (
              <div
                key={index}
                className={`card ${selectedCard === index ? 'selected' : ''}`}
                onClick={() => { if (currentTurn === playerName) setSelectedCard(index); }}
              >
                <p>{card.value} of {card.suit}</p>
              </div>
            ))}
          </div>
          <div className="controls">
            <button className="btn" onClick={drawCard} disabled={currentTurn !== playerName}>
              Draw Card
            </button>
            <button className="btn" onClick={playCard} disabled={currentTurn !== playerName || selectedCard === null}>
              Play Card
            </button>
            <button className="btn" onClick={resetGame}>Reset Game</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
