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
