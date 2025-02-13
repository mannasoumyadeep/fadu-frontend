import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

export const useGameState = (backendURL) => {
  const [gameState, setGameState] = useState({
    roomCode: '',
    isCreatingGame: true,
    gameStarted: false,
    players: [],
    currentTurn: null,
    tableCards: [],
    selectedCard: null,
    playerName: '',
    socket: null,
    showRoomCode: false,
    connectionError: '',
    callResult: null,
    gameStatus: 'waiting',
  });

  const updateState = useCallback((updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  }, []);

  const initializeSocket = useCallback((playerName, roomCode) => {
    const socketIO = io(backendURL, {
      transports: ['websocket'],
      query: { playerName, roomCode },
    });

    socketIO.on('connect', () => {
      socketIO.emit('join_room', { room_id: roomCode, player_id: playerName });
    });

    socketIO.on('game_state', (data) => {
      updateState({
        players: (prev) => {
          if (!prev.find(p => p.id === playerName)) {
            return [...prev, { id: playerName, name: playerName, hand: data.hand, score: 0 }];
          }
          return prev;
        },
        currentTurn: data.current_turn,
        tableCards: data.table_cards || [],
        gameStatus: 'playing',
      });
    });

    socketIO.on('player_joined', (data) => {
      updateState({
        players: data.players.map(pid => ({
          id: pid,
          name: pid,
          hand: pid === playerName ? gameState.players.find(p => p.id === playerName)?.hand || [] : [],
          score: 0,
        })),
      });
    });

    socketIO.on('card_played', (data) => {
      updateState({
        tableCards: data.table_cards,
        currentTurn: data.current_turn,
        selectedCard: null,
      });
    });

    socketIO.on('hand_updated', (data) => {
      updateState({
        players: (prev) => prev.map(player =>
          player.id === playerName ? { ...player, hand: data.hand } : player
        ),
      });
    });

    socketIO.on('call_result', (data) => {
      updateState({
        callResult: data,
        gameStatus: 'ended',
      });
    });

    socketIO.on('error', (data) => {
      updateState({ connectionError: data.message });
    });

    return socketIO;
  }, [backendURL, gameState.players, updateState]);

  const createGame = useCallback(() => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    updateState({
      roomCode: newCode,
      showRoomCode: true,
      gameStarted: true,
    });
  }, [updateState]);

  const joinGame = useCallback(() => {
    if (!gameState.playerName.trim()) {
      updateState({ connectionError: 'Please enter your name' });
      return;
    }
    updateState({ gameStarted: true });
  }, [gameState.playerName, updateState]);

  const resetGame = useCallback(() => {
    if (gameState.socket) {
      gameState.socket.disconnect();
    }
    setGameState({
      roomCode: '',
      isCreatingGame: true,
      gameStarted: false,
      players: [],
      currentTurn: null,
      tableCards: [],
      selectedCard: null,
      playerName: '',
      socket: null,
      showRoomCode: false,
      connectionError: '',
      callResult: null,
      gameStatus: 'waiting',
    });
  }, [gameState.socket]);

  useEffect(() => {
    if (!gameState.playerName || !gameState.roomCode || !gameState.gameStarted) return;
    const socket = initializeSocket(gameState.playerName, gameState.roomCode);
    updateState({ socket });
    return () => socket.disconnect();
  }, [gameState.playerName, gameState.roomCode, gameState.gameStarted, initializeSocket, updateState]);

  return {
    ...gameState,
    updateState,
    createGame,
    joinGame,
    resetGame,
  };
};
