import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

type Grid = (number | null)[][];

const GRID_SIZE = 4;

const getColor = (value: number | null): string => {
  const colors: Record<number, string> = {
    2: 'bg-amber-100 text-amber-900',
    4: 'bg-amber-200 text-amber-900',
    8: 'bg-orange-300 text-white',
    16: 'bg-orange-400 text-white',
    32: 'bg-orange-500 text-white',
    64: 'bg-red-400 text-white',
    128: 'bg-yellow-300 text-yellow-900',
    256: 'bg-yellow-400 text-yellow-900',
    512: 'bg-yellow-500 text-white',
    1024: 'bg-yellow-600 text-white',
    2048: 'bg-primary text-primary-foreground',
  };
  return value ? colors[value] || 'bg-primary text-primary-foreground' : 'bg-muted/30';
};

const Game2048 = () => {
  const [grid, setGrid] = useState<Grid>(() => initializeGrid());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('2048-best-score');
    return saved ? parseInt(saved) : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  function initializeGrid(): Grid {
    const newGrid: Grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    return newGrid;
  }

  function addRandomTile(grid: Grid): void {
    const emptyCells: { row: number; col: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === null) emptyCells.push({ row: r, col: c });
      }
    }
    if (emptyCells.length === 0) return;
    const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    grid[row][col] = Math.random() < 0.9 ? 2 : 4;
  }

  const slide = (row: (number | null)[]): { newRow: (number | null)[]; points: number } => {
    let arr = row.filter(val => val !== null) as number[];
    let points = 0;
    
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        points += arr[i];
        if (arr[i] === 2048) setWon(true);
        arr.splice(i + 1, 1);
      }
    }
    
    while (arr.length < GRID_SIZE) arr.push(null as any);
    return { newRow: arr, points };
  };

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;

    let newGrid = grid.map(row => [...row]);
    let totalPoints = 0;
    let moved = false;

    const rotateGrid = (g: Grid): Grid => {
      return g[0].map((_, i) => g.map(row => row[i]).reverse());
    };

    const rotationsNeeded: Record<string, number> = {
      left: 0, up: 1, right: 2, down: 3,
    };

    // Rotate to treat all directions as "left"
    for (let i = 0; i < rotationsNeeded[direction]; i++) {
      newGrid = rotateGrid(newGrid);
    }

    // Slide left
    for (let r = 0; r < GRID_SIZE; r++) {
      const { newRow, points } = slide(newGrid[r]);
      if (JSON.stringify(newRow) !== JSON.stringify(newGrid[r])) moved = true;
      newGrid[r] = newRow;
      totalPoints += points;
    }

    // Rotate back
    for (let i = 0; i < (4 - rotationsNeeded[direction]) % 4; i++) {
      newGrid = rotateGrid(newGrid);
    }

    if (moved) {
      addRandomTile(newGrid);
      setGrid(newGrid);
      setScore(prev => {
        const newScore = prev + totalPoints;
        if (newScore > bestScore) {
          setBestScore(newScore);
          localStorage.setItem('2048-best-score', newScore.toString());
        }
        return newScore;
      });

      // Check game over
      const hasEmpty = newGrid.some(row => row.some(cell => cell === null));
      if (!hasEmpty) {
        let canMove = false;
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const val = newGrid[r][c];
            if (
              (r < GRID_SIZE - 1 && newGrid[r + 1][c] === val) ||
              (c < GRID_SIZE - 1 && newGrid[r][c + 1] === val)
            ) {
              canMove = true;
            }
          }
        }
        if (!canMove) setGameOver(true);
      }
    }
  }, [grid, gameOver, bestScore]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const keyMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
    };
    if (keyMap[e.key]) {
      e.preventDefault();
      move(keyMap[e.key]);
    }
  }, [move]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resetGame = () => {
    setGrid(initializeGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score Display */}
      <div className="flex gap-6 text-sm">
        <span className="text-muted-foreground">Score: <span className="text-primary font-bold">{score}</span></span>
        <span className="text-muted-foreground">Best: <span className="text-primary font-bold">{bestScore}</span></span>
      </div>

      {/* Game Grid */}
      <div className="relative bg-muted/20 p-2 rounded-xl">
        <div className="grid grid-cols-4 gap-2" style={{ width: '280px', height: '280px' }}>
          {grid.flat().map((cell, index) => (
            <div
              key={index}
              className={`flex items-center justify-center rounded-lg font-bold text-lg transition-all ${getColor(cell)}`}
              style={{ 
                width: '64px', 
                height: '64px',
                fontSize: cell && cell >= 1000 ? '14px' : cell && cell >= 100 ? '18px' : '22px'
              }}
            >
              {cell}
            </div>
          ))}
        </div>

        {/* Game Over / Won Overlay */}
        {(gameOver || won) && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4 rounded-xl">
            <span className={`text-xl font-bold ${won ? 'text-primary' : 'text-destructive'}`}>
              {won ? '🎉 You Won!' : 'Game Over!'}
            </span>
            <span className="text-muted-foreground">Score: {score}</span>
            <Button onClick={resetGame} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" /> Play Again
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <Button variant="outline" onClick={resetGame} className="gap-2">
        <RotateCcw className="w-4 h-4" /> New Game
      </Button>

      {/* Mobile D-Pad */}
      <div className="grid grid-cols-3 gap-1 md:hidden">
        <div />
        <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => move('up')}>
          <ArrowUp className="w-5 h-5" />
        </Button>
        <div />
        <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => move('left')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div />
        <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => move('right')}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div />
        <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => move('down')}>
          <ArrowDown className="w-5 h-5" />
        </Button>
        <div />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Use arrow keys or WASD to move tiles
      </p>
    </div>
  );
};

export default Game2048;
