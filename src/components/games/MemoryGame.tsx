import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Music, Headphones, Mic, Radio, Speaker, Disc, Guitar, Piano } from 'lucide-react';

const ICONS = [Music, Headphones, Mic, Radio, Speaker, Disc, Guitar, Piano];

type Card = {
  id: number;
  icon: typeof Music;
  isFlipped: boolean;
  isMatched: boolean;
};

const MemoryGame = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('memory-best-score');
    return saved ? parseInt(saved) : Infinity;
  });
  const [isLocked, setIsLocked] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const initializeCards = () => {
    const shuffled = [...ICONS, ...ICONS]
      .map((icon, index) => ({
        id: index,
        icon,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setGameComplete(false);
  };

  useEffect(() => {
    initializeCards();
  }, []);

  const handleCardClick = (id: number) => {
    if (isLocked) return;
    
    const card = cards.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;

    const newCards = cards.map(c =>
      c.id === id ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsLocked(true);

      const [firstId, secondId] = newFlipped;
      const firstCard = newCards.find(c => c.id === firstId)!;
      const secondCard = newCards.find(c => c.id === secondId)!;

      if (firstCard.icon === secondCard.icon) {
        // Match found
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === firstId || c.id === secondId
                ? { ...c, isMatched: true }
                : c
            )
          );
          setMatches(prev => {
            const newMatches = prev + 1;
            if (newMatches === ICONS.length) {
              setGameComplete(true);
              const finalMoves = moves + 1;
              if (finalMoves < bestScore) {
                setBestScore(finalMoves);
                localStorage.setItem('memory-best-score', finalMoves.toString());
              }
            }
            return newMatches;
          });
          setFlippedCards([]);
          setIsLocked(false);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score Display */}
      <div className="flex gap-6 text-sm">
        <span className="text-muted-foreground">Moves: <span className="text-primary font-bold">{moves}</span></span>
        <span className="text-muted-foreground">Matches: <span className="text-primary font-bold">{matches}/{ICONS.length}</span></span>
        <span className="text-muted-foreground">Best: <span className="text-primary font-bold">{bestScore === Infinity ? '-' : bestScore}</span></span>
      </div>

      {/* Game Grid */}
      <div className="relative">
        <div className="grid grid-cols-4 gap-2" style={{ width: '280px' }}>
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`
                  aspect-square rounded-lg transition-all duration-300 transform
                  ${card.isFlipped || card.isMatched
                    ? 'bg-primary/20 border-2 border-primary rotate-0'
                    : 'bg-muted hover:bg-muted/80 border-2 border-border hover:scale-105'
                  }
                  ${card.isMatched ? 'opacity-60' : ''}
                `}
                style={{ 
                  width: '64px', 
                  height: '64px',
                  perspective: '1000px',
                }}
                disabled={card.isMatched}
              >
                {(card.isFlipped || card.isMatched) ? (
                  <Icon className="w-6 h-6 mx-auto text-primary" />
                ) : (
                  <span className="text-2xl">?</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Game Complete Overlay */}
        {gameComplete && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4 rounded-xl">
            <span className="text-xl font-bold text-primary">🎉 You Won!</span>
            <span className="text-muted-foreground">Completed in {moves} moves</span>
            <Button onClick={initializeCards} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" /> Play Again
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <Button variant="outline" onClick={initializeCards} className="gap-2">
        <RotateCcw className="w-4 h-4" /> New Game
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Match all music-themed pairs!
      </p>
    </div>
  );
};

export default MemoryGame;
