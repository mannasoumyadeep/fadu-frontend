import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

function App() {
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
  const [callResult, setCallResult] = useState(null);

  // Replace with your deployed backend URL from Render
  const backendURL = "https://your-backend-service.onrender.com";

  // Map card values to friendly names for image file names
  const getCardImageURL = (card) => {
    const valueMap = {
      1: "ace",
      11: "jack",
      12: "queen",
      13: "king"
    };
    const valueStr = valueMap[card.value] || card.value;
    // Ensure your card images are in public/cards folder
    return `/cards/${valueStr}_of_${card.suit.toLowerCase()}.png`;
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

    socketIO.on('call_result', (data) => {
      console.log("Call result:", data);
      setCallResult(data);
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
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(newCode);
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

  const handleCall = () => {
    if (socket && currentTurn === playerName) {
      socket.emit('call', { player_id: playerName });
    }
  };

  const resetGame = () => {
    window.location.reload();
  };

  if (!gameStarted) {
    return (
      <div className="container setup-container">
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
            <p>Share this with friends!</p>
          </div>
        )}
        {connectionError && <p className="error">{connectionError}</p>}
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
                  <img src={getCardImageURL(card)} alt={`${card.value} of ${card.suit}`} className="card-image" />
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
                onClick={() => currentTurn === playerName && setSelectedCard(index)}
              >
                <img src={getCardImageURL(card)} alt={`${card.value} of ${card.suit}`} className="card-image" />
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
            <button className="btn" onClick={handleCall} disabled={currentTurn !== playerName}>
              Call
            </button>
            <button className="btn" onClick={resetGame}>
              Reset Game
            </button>
          </div>
          {callResult && (
            <div className="call-result">
              <h4>Call Result: {callResult.result === "win" ? "You Win!" : "You Lose!"}</h4>
              <p>Hand Totals:</p>
              <ul>
                {Object.entries(callResult.player_sums).map(([pid, total]) => (
                  <li key={pid}>{pid}: {total} points</li>
                ))}
              </ul>
              <p>Scores:</p>
              <ul>
                {Object.entries(callResult.scores).map(([pid, score]) => (
                  <li key={pid}>{pid}: {score} points</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
