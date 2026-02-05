import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import * as THREE from 'three';

// Game constants
const LANE_WIDTH = 2;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];
const SPEED = 0.3;
const OBSTACLE_SPAWN_RATE = 60;
const COLLECTIBLE_SPAWN_RATE = 45;

interface Obstacle {
  id: number;
  position: [number, number, number];
  type: 'cube' | 'pyramid' | 'wall';
}

interface Collectible {
  id: number;
  position: [number, number, number];
}

// Ball component
const Ball = ({ lane, isJumping }: { lane: number; isJumping: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const jumpProgress = useRef(0);

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Smooth lane transition
    meshRef.current.position.x = THREE.MathUtils.lerp(
      meshRef.current.position.x,
      LANES[lane],
      0.15
    );

    // Jump animation
    if (isJumping) {
      jumpProgress.current = Math.min(jumpProgress.current + 0.08, Math.PI);
      meshRef.current.position.y = Math.sin(jumpProgress.current) * 2 + 0.5;
    } else {
      jumpProgress.current = 0;
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0.5, 0.1);
    }

    // Rotation effect
    meshRef.current.rotation.x += 0.1;
  });

  return (
    <mesh ref={meshRef} position={[0, 0.5, 0]} castShadow>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial 
        color="hsl(var(--primary))"
        emissive="hsl(var(--primary))"
        emissiveIntensity={0.3}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
};

// Track component
const Track = ({ speed }: { speed: number }) => {
  const trackRef = useRef<THREE.Group>(null);
  const offsetRef = useRef(0);

  useFrame(() => {
    offsetRef.current = (offsetRef.current + speed) % 10;
  });

  return (
    <group ref={trackRef}>
      {/* Main track */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -50]} receiveShadow>
        <planeGeometry args={[8, 150]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      
      {/* Lane dividers */}
      {[-1, 1].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x * LANE_WIDTH, 0.01, -50]}>
          <planeGeometry args={[0.1, 150]} />
          <meshStandardMaterial 
            color="hsl(var(--primary))"
            emissive="hsl(var(--primary))"
            emissiveIntensity={0.5}
            opacity={0.3}
            transparent
          />
        </mesh>
      ))}

      {/* Grid lines */}
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -i * 5]}>
          <planeGeometry args={[8, 0.05]} />
          <meshStandardMaterial 
            color="hsl(var(--primary))"
            opacity={0.2}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
};

// Obstacle component
const ObstacleMesh = ({ obstacle, speed }: { obstacle: Obstacle; speed: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.z += speed;
    }
  });

  const geometry = useMemo(() => {
    switch (obstacle.type) {
      case 'pyramid':
        return <coneGeometry args={[0.7, 1.5, 4]} />;
      case 'wall':
        return <boxGeometry args={[2, 2, 0.3]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  }, [obstacle.type]);

  return (
    <mesh ref={meshRef} position={obstacle.position} castShadow>
      {geometry}
      <meshStandardMaterial 
        color="#ff3366"
        emissive="#ff3366"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};

// Collectible component
const CollectibleMesh = ({ collectible, speed, onCollect }: { 
  collectible: Collectible; 
  speed: number;
  onCollect: (id: number) => void;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.z += speed;
      meshRef.current.rotation.y += 0.05;
      meshRef.current.rotation.z += 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={collectible.position}>
      <octahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial 
        color="#ffd700"
        emissive="#ffd700"
        emissiveIntensity={0.6}
        metalness={1}
        roughness={0.2}
      />
    </mesh>
  );
};

// Game scene component
const GameScene = ({ 
  isPlaying, 
  lane, 
  isJumping,
  onCollision,
  onCollect,
  beatIntensity
}: { 
  isPlaying: boolean; 
  lane: number; 
  isJumping: boolean;
  onCollision: () => void;
  onCollect: () => void;
  beatIntensity: number;
}) => {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const frameCount = useRef(0);
  const obstacleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const ballPosition = useRef({ x: 0, y: 0.5 });

  // Dynamic speed based on beat
  const speed = SPEED + beatIntensity * 0.1;

  useFrame(() => {
    if (!isPlaying) return;
    
    frameCount.current++;

    // Update ball position for collision
    ballPosition.current.x = LANES[lane];
    ballPosition.current.y = isJumping ? 2 : 0.5;

    // Spawn obstacles
    if (frameCount.current % Math.floor(OBSTACLE_SPAWN_RATE - beatIntensity * 20) === 0) {
      const newObstacle: Obstacle = {
        id: obstacleIdRef.current++,
        position: [
          LANES[Math.floor(Math.random() * 3)],
          0.5,
          -100
        ],
        type: ['cube', 'pyramid', 'wall'][Math.floor(Math.random() * 3)] as any
      };
      setObstacles(prev => [...prev, newObstacle]);
    }

    // Spawn collectibles
    if (frameCount.current % COLLECTIBLE_SPAWN_RATE === 0) {
      const newCollectible: Collectible = {
        id: collectibleIdRef.current++,
        position: [
          LANES[Math.floor(Math.random() * 3)],
          1,
          -80
        ]
      };
      setCollectibles(prev => [...prev, newCollectible]);
    }

    // Update and check obstacles
    setObstacles(prev => {
      const updated = prev
        .map(obs => ({
          ...obs,
          position: [obs.position[0], obs.position[1], obs.position[2] + speed] as [number, number, number]
        }))
        .filter(obs => obs.position[2] < 10);

      // Collision detection
      for (const obs of updated) {
        const dx = Math.abs(obs.position[0] - ballPosition.current.x);
        const dz = Math.abs(obs.position[2]);
        const dy = obs.position[1] - ballPosition.current.y;
        
        if (dx < 1 && dz < 1.5 && dy < 1.5 && !isJumping) {
          onCollision();
          return [];
        }
      }

      return updated;
    });

    // Update and check collectibles
    setCollectibles(prev => {
      const updated = prev
        .map(col => ({
          ...col,
          position: [col.position[0], col.position[1], col.position[2] + speed] as [number, number, number]
        }))
        .filter(col => col.position[2] < 10);

      // Collection detection
      const remaining = updated.filter(col => {
        const dx = Math.abs(col.position[0] - ballPosition.current.x);
        const dz = Math.abs(col.position[2]);
        
        if (dx < 1 && dz < 1.5) {
          onCollect();
          return false;
        }
        return true;
      });

      return remaining;
    });
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight 
        position={[0, 5, -10]} 
        intensity={beatIntensity * 2} 
        color="hsl(var(--primary))" 
      />

      {/* Fog for depth */}
      <fog attach="fog" args={['#0a0a0f', 10, 100]} />

      {/* Camera position */}
      <PerspectiveCamera />

      {/* Game elements */}
      <Track speed={speed} />
      <Ball lane={lane} isJumping={isJumping} />
      
      {obstacles.map(obs => (
        <ObstacleMesh key={obs.id} obstacle={obs} speed={0} />
      ))}
      
      {collectibles.map(col => (
        <CollectibleMesh 
          key={col.id} 
          collectible={col} 
          speed={0}
          onCollect={() => {}}
        />
      ))}

      {/* Starfield background */}
      <Stars />
    </>
  );
};

// Camera component
const PerspectiveCamera = () => {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 0, -20);
  }, [camera]);

  return null;
};

// Stars background
const Stars = () => {
  const starsRef = useRef<THREE.Points>(null);
  
  const [positions] = useState(() => {
    const positions = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = -Math.random() * 100;
    }
    return positions;
  });

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={1000}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.2} color="#ffffff" transparent opacity={0.8} />
    </points>
  );
};

// Main game component
const RollingSkyGame = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gems, setGems] = useState(0);
  const [lane, setLane] = useState(1); // 0, 1, 2 for left, center, right
  const [isJumping, setIsJumping] = useState(false);
  const [beatIntensity, setBeatIntensity] = useState(0.5);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('rolling-sky-high-score');
    return saved ? parseInt(saved) : 0;
  });

  // Score increment while playing
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const interval = setInterval(() => {
      setScore(prev => prev + 1);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, gameOver]);

  // Beat simulation (would connect to actual audio analysis)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setBeatIntensity(0.3 + Math.random() * 0.7);
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameOver) return;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
        setLane(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowRight':
      case 'd':
        setLane(prev => Math.min(2, prev + 1));
        break;
      case 'ArrowUp':
      case 'w':
      case ' ':
        if (!isJumping) {
          setIsJumping(true);
          setTimeout(() => setIsJumping(false), 600);
        }
        break;
    }
  }, [gameOver, isJumping]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCollision = () => {
    setGameOver(true);
    setIsPlaying(false);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('rolling-sky-high-score', score.toString());
    }
  };

  const handleCollect = () => {
    setGems(prev => prev + 1);
    setScore(prev => prev + 50);
  };

  const resetGame = () => {
    setGameOver(false);
    setScore(0);
    setGems(0);
    setLane(1);
    setIsJumping(false);
    setIsPlaying(false);
  };

  const startGame = () => {
    resetGame();
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score Display */}
      <div className="flex gap-6 text-sm">
        <span className="text-muted-foreground">
          Score: <span className="text-primary font-bold">{score}</span>
        </span>
        <span className="text-muted-foreground">
          💎 <span className="text-yellow-400 font-bold">{gems}</span>
        </span>
        <span className="text-muted-foreground">
          Best: <span className="text-primary font-bold">{highScore}</span>
        </span>
      </div>

      {/* Game Canvas */}
      <div 
        className="relative rounded-xl overflow-hidden border-2 border-border"
        style={{ width: '320px', height: '400px' }}
      >
        <Canvas shadows>
          <GameScene 
            isPlaying={isPlaying}
            lane={lane}
            isJumping={isJumping}
            onCollision={handleCollision}
            onCollect={handleCollect}
            beatIntensity={beatIntensity}
          />
        </Canvas>

        {/* Overlays */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4">
            <span className="text-2xl font-bold theme-gradient-text">Rolling Sky</span>
            <p className="text-sm text-muted-foreground text-center px-4">
              Dodge obstacles & collect gems!
            </p>
            <Button onClick={startGame} className="gap-2">
              <Play className="w-4 h-4" /> Start Game
            </Button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4">
            <span className="text-xl font-bold text-destructive">Game Over!</span>
            <div className="text-center">
              <p className="text-muted-foreground">Score: {score}</p>
              <p className="text-muted-foreground">💎 Gems: {gems}</p>
            </div>
            <Button onClick={startGame} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </div>
        )}

        {/* Beat indicator */}
        {isPlaying && (
          <div 
            className="absolute bottom-2 left-2 right-2 h-1 bg-muted rounded-full overflow-hidden"
          >
            <div 
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${beatIntensity * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => isPlaying ? setIsPlaying(false) : startGame()}
          className="h-12 w-12"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        <Button variant="outline" size="icon" onClick={resetGame} className="h-12 w-12">
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile Controls */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        <Button 
          variant="outline" 
          className="h-14" 
          onClick={() => setLane(prev => Math.max(0, prev - 1))}
        >
          ← Left
        </Button>
        <Button 
          variant="outline" 
          className="h-14"
          onClick={() => {
            if (!isJumping) {
              setIsJumping(true);
              setTimeout(() => setIsJumping(false), 600);
            }
          }}
        >
          ↑ Jump
        </Button>
        <Button 
          variant="outline" 
          className="h-14"
          onClick={() => setLane(prev => Math.min(2, prev + 1))}
        >
          Right →
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Use ← → to switch lanes, ↑ or Space to jump. Your music affects the game speed!
      </p>
    </div>
  );
};

export default RollingSkyGame;
