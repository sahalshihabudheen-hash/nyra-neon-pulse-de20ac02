import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Play, Pause, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const GRID_SIZE = 15;
const INITIAL_SPEED = 150;

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const SnakeGame = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved) : 0;
  });
  
  const directionRef = useRef(direction);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 7, y: 7 }];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setGameOver(false);
    setScore(0);
    setIsPlaying(false);
  }, [generateFood]);

  const moveSnake = useCallback(() => {
    setSnake(currentSnake => {
      const head = { ...currentSnake[0] };
      const currentDirection = directionRef.current;

      switch (currentDirection) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        setIsPlaying(false);
        return currentSnake;
      }

      // Check self collision
      if (currentSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        setIsPlaying(false);
        return currentSnake;
      }

      const newSnake = [head, ...currentSnake];

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => {
          const newScore = prev + 10;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('snake-high-score', newScore.toString());
          }
          return newScore;
        });
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, generateFood, highScore]);

  useEffect(() => {
    if (isPlaying && !gameOver) {
      gameLoopRef.current = setInterval(moveSnake, INITIAL_SPEED);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, gameOver, moveSnake]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPlaying) return;
    
    const keyDirections: Record<string, Direction> = {
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
    };

    const newDirection = keyDirections[e.key];
    if (!newDirection) return;

    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
    };

    if (opposites[newDirection] !== directionRef.current) {
      directionRef.current = newDirection;
      setDirection(newDirection);
    }
  }, [isPlaying]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleDirectionButton = (newDirection: Direction) => {
    if (!isPlaying) return;
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
    };
    if (opposites[newDirection] !== directionRef.current) {
      directionRef.current = newDirection;
      setDirection(newDirection);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score Display */}
      <div className="flex gap-6 text-sm">
        <span className="text-muted-foreground">Score: <span className="text-primary font-bold">{score}</span></span>
        <span className="text-muted-foreground">Best: <span className="text-primary font-bold">{highScore}</span></span>
      </div>

      {/* Game Grid */}
      <div 
        className="relative border-2 border-border rounded-lg overflow-hidden bg-background/50"
        style={{ 
          width: `${GRID_SIZE * 20}px`, 
          height: `${GRID_SIZE * 20}px`,
          maxWidth: '100%',
          aspectRatio: '1/1'
        }}
      >
        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className="absolute rounded-sm transition-all duration-75"
            style={{
              width: '18px',
              height: '18px',
              left: `${segment.x * 20 + 1}px`,
              top: `${segment.y * 20 + 1}px`,
              background: index === 0 ? 'var(--theme-gradient, hsl(var(--primary)))' : 'hsl(var(--primary) / 0.7)',
              boxShadow: index === 0 ? '0 0 10px hsl(var(--primary) / 0.5)' : 'none',
            }}
          />
        ))}

        {/* Food */}
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            width: '16px',
            height: '16px',
            left: `${food.x * 20 + 2}px`,
            top: `${food.y * 20 + 2}px`,
            background: 'hsl(var(--destructive))',
            boxShadow: '0 0 10px hsl(var(--destructive) / 0.6)',
          }}
        />

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4">
            <span className="text-xl font-bold text-destructive">Game Over!</span>
            <span className="text-muted-foreground">Score: {score}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => gameOver ? resetGame() : setIsPlaying(!isPlaying)}
          className="h-12 w-12"
        >
          {gameOver ? <RotateCcw className="w-5 h-5" /> : isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        <Button variant="outline" size="icon" onClick={resetGame} className="h-12 w-12">
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile D-Pad */}
      <div className="grid grid-cols-3 gap-1 md:hidden">
        <div />
        <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => handleDirectionButton('UP')}>
          <ArrowUp className="w-5 h-5" />
        </Button>
        <div />
        <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => handleDirectionButton('LEFT')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div />
        <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => handleDirectionButton('RIGHT')}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div />
        <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => handleDirectionButton('DOWN')}>
          <ArrowDown className="w-5 h-5" />
        </Button>
        <div />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Use arrow keys or WASD to move
      </p>
    </div>
  );
};

export default SnakeGame;
