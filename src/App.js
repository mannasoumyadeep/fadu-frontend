import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Trophy, Users, RefreshCcw, HandMetal } from 'lucide-react';

const App = () => {
  const [roomCode, setRoomCode] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [tableCards, setTableCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]); // array of indices
  const [playerName, setPlayerName] = useState('');
  const [socket, setSocket] = useState(null);
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [callResult, setCallResult] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, ended

  const backendURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

  // Helper function to get card image URL (assuming PNG images)
  const getCardImageURL = (card) => {
    if (!card) return null;
    const valueMap = { 1: "ace", 11: "jack", 12: "queen", 13: "king" };
    const valueStr = valueMap[card.value] || card.value;
    return `/playing-cards/${valueStr}_of_${card.suit.toLowerCase()}.png`;
  };

  useEffect(() => {
    if (!playerName || !roomCode || !gameStarted) return;
    const socketIO = io(backendURL, { transports: ['websocket'], query: { playerName, roomCode } });

    socketIO.on('connect', () => {
      socketIO.emit('join_room', { room_id: roomCode, player_id: playerName });
    });

    socketIO.on('game_state', (data) => {
      setPlayers(prev => {
        if (!prev.find(p => p.id === playerName)) {
          return [...prev, { id: playerName, name: playerName, hand: data.hand, score: 0 }];
        }
        return prev;
      });
      setCurrentTurn(data.current_turn);
      setTableCards(data.table_cards || []);
      setGameStatus('playing');
    });

    socketIO.on('player_joined', (data) => {
      setPlayers(data.players.map(pid => ({
        id: pid,
        name: pid,
        hand: pid === playerName ? players.find(p => p.id === playerName)?.hand || [] : [],
        score: 0
      })));
    });

    socketIO.on('card_played', (data) => {
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
      setCallResult(data);
      setGameStatus('ended');
    });

    socketIO.on('error', (data) => {
      setConnectionError(data.message);
    });

    setSocket(socketIO);
    return () => socketIO.disconnect();
  }, [playerName, roomCode, gameStarted]);

  // Toggle selection: if table exists, only allow cards matching the top card value
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

  const SetupScreen = () => (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <h1 className="text-2xl font-bold">Fadu Card Game</h1>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={() => setIsCreatingGame(true)} variant={isCreatingGame ? "default" : "outline"} className="flex-1">
            Create Room
          </Button>
          <Button onClick={() => setIsCreatingGame(false)} variant={!isCreatingGame ? "default" : "outline"} className="flex-1">
            Join Room
          </Button>
        </div>
        {isCreatingGame ? (
          <Button onClick={() => {
            let newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            if(newCode.length < 6) newCode = newCode.padEnd(6, 'A');
            setRoomCode(newCode);
            setShowRoomCode(true);
            setGameStarted(true);
          }} className="w-full">
            Create New Room
          </Button>
        ) : (
          <>
            <Input
              type="text"
              placeholder="Enter room code"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
            />
            <Button onClick={() => setGameStarted(true)} className="w-full">
              Join Room
            </Button>
          </>
        )}
        {showRoomCode && (
          <Alert>
            <AlertDescription>
              Room Code: <span className="font-mono font-bold">{roomCode}</span>
              <p className="text-sm mt-1">Share this with friends!</p>
            </AlertDescription>
          </Alert>
        )}
        {connectionError && (
          <Alert variant="destructive">
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const PlayerCard = ({ player, isCurrentPlayer }) => (
    <Card className={clsx("w-full", isCurrentPlayer ? "bg-primary/10" : "bg-background", "shadow-md")}>
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Players</h3>
          <div className="grid gap-2">
            {players.map(player => (
              <PlayerCard key={player.id} player={player} isCurrentPlayer={currentTurn === player.id} />
            ))}
          </div>
        </div>
        <Card className="h-full">
          <CardHeader className="p-4">
            <h3 className="text-lg font-semibold">Table Cards</h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {tableCards.length > 0 ? (
                <div className="relative w-24 h-32 border border-white rounded">
                  <img
                    src={getCardImageURL(tableCards[tableCards.length - 1])}
                    alt={`${tableCards[tableCards.length - 1].value} of ${tableCards[tableCards.length - 1].suit}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <p className="text-white">No cards played yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-8">
        <CardHeader className="p-4">
          <h3 className="text-lg font-semibold">Your Hand</h3>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {players.find(p => p.id === playerName)?.hand.map((card, index) => (
              <div
                key={index}
                onClick={() => toggleCardSelection(index)}
                className={clsx(
                  "relative w-24 h-32 transition-transform hover:scale-110 cursor-pointer border border-white rounded",
                  selectedCards.includes(index) && "ring-2 ring-primary"
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
              onClick={() => socket?.emit('draw_card', { player_id: playerName })}
              disabled={currentTurn !== playerName}
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Draw Card
            </Button>
            <Button
              onClick={() => selectedCards.length > 0 && socket?.emit('play_card', { player_id: playerName, card_indices: selectedCards })}
              disabled={currentTurn !== playerName || selectedCards.length === 0}
              variant="secondary"
            >
              Play Selected Cards
            </Button>
            <Button
              onClick={() => socket?.emit('call', { player_id: playerName })}
              disabled={currentTurn !== playerName}
              variant="destructive"
            >
              <HandMetal className="mr-2 h-4 w-4" /> Call
            </Button>
          </div>
        </CardContent>
      </Card>
      {callResult && (
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <h4 className="font-semibold">
                Call Result: {callResult.result === "win" ? "You Won!" : "You Lost"}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium">Hand Totals:</h5>
                  <ul>
                    {Object.entries(callResult.player_sums).map(([pid, total]) => (
                      <li key={pid}>{pid}: {total} points</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium">Scores:</h5>
                  <ul>
                    {Object.entries(callResult.scores).map(([pid, score]) => (
                      <li key={pid}>{pid}: {score} points</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        {!gameStarted ? <SetupScreen /> : <GameBoard />}
      </div>
    </div>
  );
};

export default App;
