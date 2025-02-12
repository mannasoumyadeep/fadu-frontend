// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

function App() {
  // Game state variables
  const [roomCode, setRoomCode] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [numPlayers, setNumPlayers] = useState(2);
  const [numRounds, setNumRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [players, setPlayers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [tableCard, setTableCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showWinner, setShowWinner] = useState(false);
  const [gameWinners, setGameWinners] = useState([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [socket, setSocket] = useState(null);
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  // Backend URL – update this if your backend is deployed elsewhere
  const backendURL = "https://fadu-backend.onrender.com";

  useEffect(() => {
    if (!playerName || !roomCode || !gameStarted) return;

    setIsConnecting(true);
    setConnectionError('');
    console.log(`Connecting to room ${roomCode} as ${playerName}`);
    
    const socketIO = io(backendURL, {
      transports: ['websocket'],
      query: {
        playerName,
        roomCode
      }
    });

    socketIO.on('connect', () => {
      console.log('Connected to game server');
      setIsConnecting(false);
      socketIO.emit('join_room', {
        room_id: roomCode,
        player_id: playerName
      });
    });

    socketIO.on('game_state', (data) => {
      setPlayers(prevPlayers => {
        const newPlayer = { 
          id: playerName, 
          name: playerName, 
          hand: data.hand, 
          score: 0 
        };
        if (!prevPlayers.find(p => p.id === playerName)) {
          return [...prevPlayers, newPlayer];
        }
        return prevPlayers;
      });
      setCurrentTurn(data.current_turn);
      if (data.table_card) setTableCard(data.table_card);
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
      setTableCard(data.table_card);
      setCurrentTurn(data.current_turn);
      setSelectedCard(null);
      setHasDrawn(false);
    });

    socketIO.on('hand_updated', (data) => {
      setPlayers(prevPlayers =>
        prevPlayers.map(player =>
          player.id === playerName ? { ...player, hand: data.hand } : player
        )
      );
    });

    socketIO.on('card_drawn', (data) => {
      setPlayers(prevPlayers =>
        prevPlayers.map(player =>
          player.id === playerName ? { ...player, hand: data.hand } : player
        )
      );
      setHasDrawn(true);
    });

    socketIO.on('error', (data) => {
      setConnectionError(data.message);
    });

    setSocket(socketIO);

    return () => {
      socketIO.close();
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
      alert('Please enter your name');
      return;
    }
    setGameStarted(true);
  };

  const drawCard = () => {
    if (socket && currentTurn === playerName && !hasDrawn) {
      socket.emit('draw_card', {
        player_id: playerName
      });
    }
  };

  const playCard = () => {
    if (socket && currentTurn === playerName && selectedCard !== null) {
      socket.emit('play_card', {
        player_id: playerName,
        card_index: selectedCard
      });
    }
  };

  const handleCall = () => {
    if (socket) {
      socket.emit('call', {
        player_id: playerName,
        room_id: roomCode
      });
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setShowWinner(false);
    setGameWinners([]);
    setPlayers([]);
    setTableCard(null);
    setSelectedCard(null);
    setCurrentRound(1);
    setHasDrawn(false);
    setPlayerName('');
    setRoomCode('');
    setShowRoomCode(false);
    setIsCreatingGame(true);
    if (socket) {
      socket.close();
    }
  };

  if (!gameStarted) {
    return (
      <div className="game-container">
        <div className="setup-form">
          <h1 className="title">Fadu Card Game</h1>
          
          <div className="input-group">
            <label>Your Name:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="game-mode-selector">
            <button 
              className={`mode-button ${isCreatingGame ? 'active' : ''}`}
              onClick={() => setIsCreatingGame(true)}
            >
              Create Room
            </button>
            <button 
              className={`mode-button ${!isCreatingGame ? 'active' : ''}`}
              onClick={() => setIsCreatingGame(false)}
            >
              Join Room
            </button>
          </div>

          {isCreatingGame ? (
            <>
              <div className="input-group">
                <label>Number of Players:</label>
                <input
                  type="number"
                  min="2"
                  max="8"
                  value={numPlayers}
                  onChange={(e) => setNumPlayers(parseInt(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label>Number of Rounds:</label>
                <input
                  type="number"
                  min="1"
                  value={numRounds}
                  onChange={(e) => setNumRounds(parseInt(e.target.value))}
                />
              </div>
            </>
          ) : (
            <div className="input-group">
              <label>Room Code:</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                required
              />
            </div>
          )}

          <button 
            className="start-button"
            onClick={isCreatingGame ? handleCreateGame : handleJoinGame}
            disabled={!playerName.trim() || (!isCreatingGame && !roomCode.trim())}
          >
            {isCreatingGame ? 'Create Room' : 'Join Room'}
          </button>

          {showRoomCode && (
            <div className="room-code-display">
              <p>Your Room Code: <strong>{roomCode}</strong></p>
              <p>Share this code with other players to join!</p>
            </div>
          )}

          {connectionError && (
            <div className="error-message">
              {connectionError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-board">
        <div className="game-info">
          <div className="round-info">
            Round {currentRound} of {numRounds}
          </div>
          <div className="room-info">
            Room Code: {roomCode}
          </div>
        </div>
        
        <h1 className="title">Current Player: {currentTurn}</h1>
        
        <div className="players-list">
          {players.map(player => (
            <div key={player.id} className={`player-info ${currentTurn === player.id ? 'current-turn' : ''}`}>
              {player.name} {player.id === playerName ? '(You)' : ''} - Score: {player.score}
            </div>
          ))}
        </div>

        <div className="table-area">
          {tableCard && (
            <div className="card">
              {tableCard.value} of {tableCard.suit}
            </div>
          )}
        </div>

        <div className="player-hand">
          <h2>Your Cards:</h2>
          <div className="cards-container">
            {players.find(p => p.id === playerName)?.hand.map((card, index) => (
              <div
                key={index}
                className={`card ${selectedCard === index ? 'selected' : ''}`}
                onClick={() => currentTurn === playerName && setSelectedCard(index)}
              >
                {card.value} of {card.suit}
              </div>
            ))}
          </div>
        </div>

        <div className="controls">
          <button
            className="game-button"
            onClick={drawCard}
            disabled={currentTurn !== playerName || hasDrawn}
          >
            Draw Card
          </button>
          <button
            className="game-button"
            onClick={playCard}
            disabled={currentTurn !== playerName || selectedCard === null}
          >
            Play Card
          </button>
          <button 
            className="game-button" 
            onClick={handleCall}
            disabled={currentTurn !== playerName}
          >
            Call
          </button>
        </div>
      </div>

      {showWinner && (
        <>
          <div className="overlay"></div>
          <div className="winner-announcement">
            <h2>Game Over!</h2>
            {gameWinners.length === 1 ? (
              <p>{gameWinners[0].name} wins with {gameWinners[0].score} points!</p>
            ) : (
              <div>
                <p>It's a tie between:</p>
                {gameWinners.map(winner => (
                  <p key={winner.id}>
                    {winner.name} with {winner.score} points
                  </p>
                ))}
              </div>
            )}
            <button className="start-button" onClick={resetGame}>
              Play Again
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
