export const canPlayCards = (selectedCards, playerHand, topCard) => {
  if (selectedCards.size === 0) return false;
  
  const selectedCardValues = Array.from(selectedCards).map(index => playerHand[index].value);
  
  // Check if all selected cards have the same value
  const allSameValue = selectedCardValues.every(value => value === selectedCardValues[0]);
  if (!allSameValue) return false;

  // If there's no top card, any matching set is valid
  if (!topCard) return true;

  // If there is a top card, selected cards must match its value
  return selectedCardValues[0] === topCard.value;
};

export const calculateHandValue = (hand) => {
  return hand.reduce((sum, card) => sum + card.value, 0);
};

export const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};