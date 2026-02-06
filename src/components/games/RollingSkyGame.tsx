import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Music2, Volume2, VolumeX } from 'lucide-react';
import * as THREE from 'three';
import MusicSelector from './MusicSelector';
import { useGameSession } from '@/hooks/useGameSession';
import { useAuth } from '@/hooks/useAuth';

// Game constants
const LANE_WIDTH = 2.5;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];
const BASE_SPEED = 0.35;
const OBSTACLE_SPAWN_RATE = 40;
const COLLECTIBLE_SPAWN_RATE = 35;

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface Obstacle {
  id: number;
  position: [number, number, number];
  type: 'cube' | 'pyramid' | 'wall' | 'spike' | 'spinner' | 'tunnel' | 'ramp';
  rotation?: number;
}

interface Collectible {
  id: number;
  position: [number, number, number];
  type: 'gem' | 'star' | 'powerup';
}

// Glowing Ball component with trails
const Ball = ({ lane, isJumping, speed }: { lane: number; isJumping: boolean; speed: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Points>(null);
  const jumpProgress = useRef(0);
  const trailPositions = useRef<Float32Array>(new Float32Array(30 * 3));

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Smooth lane transition
    meshRef.current.position.x = THREE.MathUtils.lerp(
      meshRef.current.position.x,
      LANES[lane],
      0.12
    );

    // Enhanced jump animation with arc
    if (isJumping) {
      jumpProgress.current = Math.min(jumpProgress.current + 0.06, Math.PI);
      const jumpHeight = Math.sin(jumpProgress.current) * 3;
      meshRef.current.position.y = jumpHeight + 0.6;
    } else {
      jumpProgress.current = 0;
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0.6, 0.12);
    }

    // Dynamic rotation based on speed
    meshRef.current.rotation.x += speed * 0.5;
    meshRef.current.rotation.z = (LANES[lane] - meshRef.current.position.x) * 0.1;

    // Update trail
    if (trailRef.current) {
      const positions = trailRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = positions.length - 3; i >= 3; i -= 3) {
        positions[i] = positions[i - 3];
        positions[i + 1] = positions[i - 2];
        positions[i + 2] = positions[i - 1];
      }
      positions[0] = meshRef.current.position.x;
      positions[1] = meshRef.current.position.y;
      positions[2] = meshRef.current.position.z + 0.5;
      trailRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Main ball */}
      <mesh ref={meshRef} position={[0, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial 
          color="#ffd300"
          emissive="#ffd300"
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Glow effect */}
      <mesh position={[LANES[lane], isJumping ? 2 : 0.6, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial color="#ffd300" transparent opacity={0.15} />
      </mesh>

      {/* Trail effect */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={10}
            array={trailPositions.current}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.3} color="#ffd300" transparent opacity={0.4} />
      </points>
    </group>
  );
};

// Enhanced Track with neon lines
const Track = ({ speed, beatIntensity }: { speed: number; beatIntensity: number }) => {
  const linesRef = useRef<THREE.Group>(null);
  const pulseRef = useRef(0);

  useFrame(() => {
    pulseRef.current += 0.05;
    if (linesRef.current) {
      linesRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material && 'emissiveIntensity' in mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 
            0.3 + Math.sin(pulseRef.current + i * 0.5) * 0.3 * beatIntensity;
        }
      });
    }
  });

  return (
    <group>
      {/* Main track platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -75]} receiveShadow>
        <planeGeometry args={[10, 200]} />
        <meshStandardMaterial 
          color="#0a0a15"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      
      {/* Edge walls */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 4.5, 1, -75]}>
          <boxGeometry args={[0.5, 2, 200]} />
          <meshStandardMaterial 
            color="#1a1a2e"
            emissive="#ffd300"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}

      {/* Neon lane dividers */}
      <group ref={linesRef}>
        {[-1, 1].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x * LANE_WIDTH, 0.02, -75]}>
            <planeGeometry args={[0.08, 200]} />
            <meshStandardMaterial 
              color="#ffd300"
              emissive="#ffd300"
              emissiveIntensity={0.5}
            />
          </mesh>
        ))}
      </group>

      {/* Grid lines that move with speed */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -i * 4]}>
          <planeGeometry args={[10, 0.03]} />
          <meshStandardMaterial 
            color="#ffd300"
            opacity={0.15}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
};

// Obstacle components with various types
const ObstacleMesh = ({ obstacle }: { obstacle: Obstacle }) => {
  const meshRef = useRef<THREE.Group>(null);
  const spinnerRotation = useRef(0);

  useFrame(() => {
    if (meshRef.current && obstacle.type === 'spinner') {
      spinnerRotation.current += 0.1;
      meshRef.current.rotation.y = spinnerRotation.current;
    }
  });

  const obstacleColor = useMemo(() => {
    switch (obstacle.type) {
      case 'spike': return '#ff1744';
      case 'spinner': return '#ff9100';
      case 'tunnel': return '#7c4dff';
      case 'ramp': return '#00e5ff';
      default: return '#ff3366';
    }
  }, [obstacle.type]);

  const renderObstacle = () => {
    switch (obstacle.type) {
      case 'pyramid':
        return (
          <mesh castShadow>
            <coneGeometry args={[0.8, 2, 4]} />
            <meshStandardMaterial color={obstacleColor} emissive={obstacleColor} emissiveIntensity={0.4} />
          </mesh>
        );
      case 'wall':
        return (
          <mesh castShadow>
            <boxGeometry args={[2.2, 2.5, 0.4]} />
            <meshStandardMaterial color={obstacleColor} emissive={obstacleColor} emissiveIntensity={0.3} />
          </mesh>
        );
      case 'spike':
        return (
          <group>
            {[-0.5, 0, 0.5].map((x) => (
              <mesh key={x} position={[x, 0, 0]} castShadow>
                <coneGeometry args={[0.3, 1.5, 8]} />
                <meshStandardMaterial color={obstacleColor} emissive={obstacleColor} emissiveIntensity={0.5} />
              </mesh>
            ))}
          </group>
        );
      case 'spinner':
        return (
          <group>
            <mesh castShadow>
              <boxGeometry args={[4, 0.3, 0.3]} />
              <meshStandardMaterial color={obstacleColor} emissive={obstacleColor} emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
            </mesh>
          </group>
        );
      case 'tunnel':
        return (
          <group>
            <mesh position={[-1.5, 1, 0]} castShadow>
              <boxGeometry args={[0.5, 3, 2]} />
              <meshStandardMaterial color={obstacleColor} emissive={obstacleColor} emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[1.5, 1, 0]} castShadow>
              <boxGeometry args={[0.5, 3, 2]} />
              <meshStandardMaterial color={obstacleColor} emissive={obstacleColor} emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, 2.5, 0]} castShadow>
              <boxGeometry args={[3.5, 0.5, 2]} />
              <meshStandardMaterial color={obstacleColor} emissive={obstacleColor} emissiveIntensity={0.3} />
            </mesh>
          </group>
        );
      case 'ramp':
        return (
          <mesh rotation={[-0.3, 0, 0]} castShadow>
            <boxGeometry args={[2, 0.3, 3]} />
            <meshStandardMaterial color={obstacleColor} emissive={obstacleColor} emissiveIntensity={0.4} />
          </mesh>
        );
      default:
        return (
          <mesh castShadow>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshStandardMaterial color={obstacleColor} emissive={obstacleColor} emissiveIntensity={0.3} />
          </mesh>
        );
    }
  };

  return (
    <group ref={meshRef} position={obstacle.position}>
      {renderObstacle()}
    </group>
  );
};

// Enhanced Collectible with glow
const CollectibleMesh = ({ collectible }: { collectible: Collectible }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 3;
      meshRef.current.rotation.x += delta * 1.5;
      meshRef.current.position.y = collectible.position[1] + Math.sin(Date.now() * 0.003) * 0.2;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);
    }
  });

  const getColor = () => {
    switch (collectible.type) {
      case 'star': return '#00ff88';
      case 'powerup': return '#ff00ff';
      default: return '#ffd700';
    }
  };

  const color = getColor();

  return (
    <group position={collectible.position}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0.1}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
    </group>
  );
};

// Stars/Space background
const SpaceBackground = ({ beatIntensity }: { beatIntensity: number }) => {
  const starsRef = useRef<THREE.Points>(null);
  
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(2000 * 3);
    const col = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 150;
      pos[i * 3 + 1] = Math.random() * 60;
      pos[i * 3 + 2] = -Math.random() * 150 - 10;
      
      const brightness = Math.random();
      col[i * 3] = brightness;
      col[i * 3 + 1] = brightness;
      col[i * 3 + 2] = brightness;
    }
    return [pos, col];
  }, []);

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0002;
      (starsRef.current.material as THREE.PointsMaterial).size = 0.15 + beatIntensity * 0.1;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={2000} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={2000} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.2} vertexColors transparent opacity={0.9} />
    </points>
  );
};

// Game scene component
const GameScene = ({ 
  isPlaying, 
  lane, 
  isJumping,
  onCollision,
  onCollect,
  beatIntensity,
  speed
}: { 
  isPlaying: boolean; 
  lane: number; 
  isJumping: boolean;
  onCollision: () => void;
  onCollect: (type: string) => void;
  beatIntensity: number;
  speed: number;
}) => {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const frameCount = useRef(0);
  const obstacleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const ballPositionRef = useRef({ x: 0, y: 0.6 });

  useFrame(() => {
    if (!isPlaying) return;
    
    frameCount.current++;

    // Update ball position for collision
    ballPositionRef.current.x = LANES[lane];
    ballPositionRef.current.y = isJumping ? 2.5 : 0.6;

    // Spawn obstacles with variety
    const spawnRate = Math.max(25, OBSTACLE_SPAWN_RATE - beatIntensity * 15);
    if (frameCount.current % Math.floor(spawnRate) === 0) {
      const types: Obstacle['type'][] = ['cube', 'pyramid', 'wall', 'spike', 'spinner', 'tunnel', 'ramp'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      // Some obstacles span multiple lanes
      const laneIndex = type === 'spinner' || type === 'tunnel' 
        ? 1 
        : Math.floor(Math.random() * 3);
      
      const newObstacle: Obstacle = {
        id: obstacleIdRef.current++,
        position: [LANES[laneIndex], type === 'spinner' ? 1 : 0.5, -120],
        type,
      };
      setObstacles(prev => [...prev, newObstacle]);
    }

    // Spawn collectibles
    if (frameCount.current % COLLECTIBLE_SPAWN_RATE === 0) {
      const types: Collectible['type'][] = ['gem', 'gem', 'gem', 'star', 'powerup'];
      const newCollectible: Collectible = {
        id: collectibleIdRef.current++,
        position: [LANES[Math.floor(Math.random() * 3)], 1.2, -100],
        type: types[Math.floor(Math.random() * types.length)],
      };
      setCollectibles(prev => [...prev, newCollectible]);
    }

    // Update obstacles
    setObstacles(prev => {
      const updated = prev
        .map(obs => ({
          ...obs,
          position: [obs.position[0], obs.position[1], obs.position[2] + speed] as [number, number, number]
        }))
        .filter(obs => obs.position[2] < 15);

      // Collision detection
      for (const obs of updated) {
        const dx = Math.abs(obs.position[0] - ballPositionRef.current.x);
        const dz = Math.abs(obs.position[2]);
        const dy = ballPositionRef.current.y;
        
        // Different collision boxes per type
        let collisionWidth = 1;
        let needsJump = true;
        
        if (obs.type === 'wall') collisionWidth = 1.1;
        if (obs.type === 'spinner') {
          collisionWidth = 2;
          needsJump = dy < 1.5;
        }
        if (obs.type === 'tunnel') {
          // Tunnel - only collide if in center lane and not jumping high enough
          if (lane === 1 && dy < 2) needsJump = false;
          else continue;
        }
        if (obs.type === 'ramp') needsJump = false;
        
        if (dx < collisionWidth && dz < 1.5 && needsJump && !isJumping) {
          onCollision();
          return [];
        }
      }

      return updated;
    });

    // Update collectibles
    setCollectibles(prev => {
      return prev
        .map(col => ({
          ...col,
          position: [col.position[0], col.position[1], col.position[2] + speed] as [number, number, number]
        }))
        .filter(col => {
          const dx = Math.abs(col.position[0] - ballPositionRef.current.x);
          const dz = Math.abs(col.position[2]);
          
          if (dx < 1.2 && dz < 1.5) {
            onCollect(col.type);
            return false;
          }
          return col.position[2] < 10;
        });
    });
  });

  return (
    <>
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 15, 10]} intensity={1.2} castShadow />
      <pointLight position={[0, 8, -20]} intensity={beatIntensity * 3} color="#ffd300" />
      <pointLight position={[-5, 5, -30]} intensity={1} color="#ff3366" />
      <pointLight position={[5, 5, -30]} intensity={1} color="#00ff88" />

      {/* Fog for depth */}
      <fog attach="fog" args={['#050510', 15, 120]} />

      {/* Camera setup */}
      <PerspectiveCamera />

      {/* Background */}
      <SpaceBackground beatIntensity={beatIntensity} />

      {/* Game elements */}
      <Track speed={speed} beatIntensity={beatIntensity} />
      <Ball lane={lane} isJumping={isJumping} speed={speed} />
      
      {obstacles.map(obs => (
        <ObstacleMesh key={obs.id} obstacle={obs} />
      ))}
      
      {collectibles.map(col => (
        <CollectibleMesh key={col.id} collectible={col} />
      ))}
    </>
  );
};

// Camera component
const PerspectiveCamera = () => {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 6, 10);
    camera.lookAt(0, 1, -30);
  }, [camera]);

  return null;
};

// Main game component
const RollingSkyGame = () => {
  const { user } = useAuth();
  const { startSession, endSession, updateScore } = useGameSession();
  
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [musicSource, setMusicSource] = useState<string>('');
  const [musicSourceName, setMusicSourceName] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gems, setGems] = useState(0);
  const [lane, setLane] = useState(1);
  const [isJumping, setIsJumping] = useState(false);
  const [beatIntensity, setBeatIntensity] = useState(0.5);
  const [gameSpeed, setGameSpeed] = useState(BASE_SPEED);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('rolling-sky-high-score');
    return saved ? parseInt(saved) : 0;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Audio URL fetcher
  const getAudioUrl = async (trackId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-audio-url?videoId=${trackId}`
      );
      const data = await response.json();
      return data.audioUrl;
    } catch (error) {
      console.error('Error fetching audio URL:', error);
      return null;
    }
  };

  // Play current track
  const playCurrentTrack = async () => {
    if (selectedTracks.length === 0 || isMuted) return;
    
    const track = selectedTracks[currentTrackIndex];
    const audioUrl = await getAudioUrl(track.id);
    
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(console.error);
      
      // Setup audio analyzer for beat detection
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    }
  };

  // Beat detection from audio
  useEffect(() => {
    if (!isPlaying || !analyserRef.current) {
      // Simulated beat when no audio
      if (isPlaying) {
        const interval = setInterval(() => {
          setBeatIntensity(0.3 + Math.random() * 0.7);
        }, 400);
        return () => clearInterval(interval);
      }
      return;
    }
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const detectBeat = () => {
      if (!analyserRef.current || !isPlaying) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setBeatIntensity(Math.min(1, average / 128));
    };
    
    const interval = setInterval(detectBeat, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Dynamic speed based on beat and score
  useEffect(() => {
    if (!isPlaying) return;
    const baseSpeed = BASE_SPEED + (score / 5000) * 0.1;
    setGameSpeed(baseSpeed + beatIntensity * 0.15);
  }, [beatIntensity, score, isPlaying]);

  // Score increment
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const interval = setInterval(() => {
      setScore(prev => prev + 1);
    }, 80);
    return () => clearInterval(interval);
  }, [isPlaying, gameOver]);

  // Handle track ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleEnded = () => {
      if (selectedTracks.length > 0) {
        setCurrentTrackIndex(prev => (prev + 1) % selectedTracks.length);
      }
    };
    
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [selectedTracks.length]);

  // Play next track when index changes
  useEffect(() => {
    if (isPlaying && selectedTracks.length > 0) {
      playCurrentTrack();
    }
  }, [currentTrackIndex]);

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
          setTimeout(() => setIsJumping(false), 700);
        }
        break;
    }
  }, [gameOver, isJumping]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCollision = async () => {
    setGameOver(true);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('rolling-sky-high-score', score.toString());
    }
    
    // End game session
    await endSession(score, gems);
  };

  const handleCollect = (type: string) => {
    setGems(prev => prev + 1);
    const bonus = type === 'star' ? 100 : type === 'powerup' ? 200 : 50;
    setScore(prev => prev + bonus);
  };

  const handleMusicSelect = (tracks: Track[], source: string, sourceName: string) => {
    setSelectedTracks(tracks);
    setMusicSource(source);
    setMusicSourceName(sourceName);
    setCurrentTrackIndex(0);
    setShowMusicSelector(false);
    startGameWithMusic(tracks, source, sourceName);
  };

  const startGameWithMusic = async (tracks: Track[], source: string, sourceName: string) => {
    setGameOver(false);
    setScore(0);
    setGems(0);
    setLane(1);
    setIsJumping(false);
    setGameSpeed(BASE_SPEED);
    setIsPlaying(true);
    
    // Start game session
    const trackName = tracks.length > 0 ? tracks[0].title : undefined;
    await startSession({
      game_name: 'Rolling Sky',
      track_playing: trackName,
      track_source: source || undefined,
    });
    
    // Start playing music
    if (tracks.length > 0 && !isMuted) {
      playCurrentTrack();
    }
  };

  const startGame = () => {
    if (user) {
      setShowMusicSelector(true);
    } else {
      // Play without music if not logged in
      startGameWithMusic([], '', '');
    }
  };

  const resetGame = () => {
    setGameOver(false);
    setScore(0);
    setGems(0);
    setLane(1);
    setIsJumping(false);
    setIsPlaying(false);
    setGameSpeed(BASE_SPEED);
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} />
      
      {/* Score Display */}
      <div className="flex gap-4 text-sm flex-wrap justify-center">
        <span className="text-muted-foreground">
          Score: <span className="text-primary font-bold">{score}</span>
        </span>
        <span className="text-muted-foreground">
          💎 <span className="text-yellow-400 font-bold">{gems}</span>
        </span>
        <span className="text-muted-foreground">
          Best: <span className="text-primary font-bold">{highScore}</span>
        </span>
        {selectedTracks.length > 0 && isPlaying && (
          <span className="text-muted-foreground flex items-center gap-1">
            <Music2 className="w-3 h-3" />
            <span className="text-primary truncate max-w-[120px]">
              {selectedTracks[currentTrackIndex]?.title}
            </span>
          </span>
        )}
      </div>

      {/* Game Canvas */}
      <div 
        className="relative rounded-xl overflow-hidden border-2 border-border"
        style={{ width: '360px', height: '480px' }}
      >
        <Canvas shadows gl={{ antialias: true }}>
          <GameScene 
            isPlaying={isPlaying}
            lane={lane}
            isJumping={isJumping}
            onCollision={handleCollision}
            onCollect={handleCollect}
            beatIntensity={beatIntensity}
            speed={gameSpeed}
          />
        </Canvas>

        {/* Music Selector Overlay */}
        {showMusicSelector && (
          <MusicSelector 
            onSelect={handleMusicSelect}
            onClose={() => {
              setShowMusicSelector(false);
              startGameWithMusic([], '', '');
            }}
          />
        )}

        {/* Start Screen */}
        {!isPlaying && !gameOver && !showMusicSelector && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <span className="text-3xl font-bold theme-gradient-text">Rolling Sky</span>
            <p className="text-sm text-muted-foreground text-center px-6">
              Dodge obstacles & collect gems while your music plays!
            </p>
            <Button onClick={startGame} className="gap-2" size="lg">
              <Play className="w-5 h-5" /> Start Game
            </Button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <span className="text-2xl font-bold text-destructive">Game Over!</span>
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-primary">Score: {score}</p>
              <p className="text-muted-foreground">💎 Gems: {gems}</p>
              {score > highScore - score && score >= highScore && (
                <p className="text-yellow-400 font-bold">🏆 New High Score!</p>
              )}
            </div>
            <Button onClick={startGame} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </div>
        )}

        {/* Beat indicator */}
        {isPlaying && (
          <div className="absolute bottom-2 left-2 right-2 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-yellow-400 transition-all duration-75"
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
        <Button variant="outline" size="icon" onClick={toggleMute} className="h-12 w-12">
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Controls */}
      <div className="grid grid-cols-3 gap-2 md:hidden w-full max-w-xs">
        <Button 
          variant="outline" 
          className="h-16 text-lg" 
          onClick={() => setLane(prev => Math.max(0, prev - 1))}
        >
          ← Left
        </Button>
        <Button 
          variant="outline" 
          className="h-16 text-lg"
          onClick={() => {
            if (!isJumping) {
              setIsJumping(true);
              setTimeout(() => setIsJumping(false), 700);
            }
          }}
        >
          ↑ Jump
        </Button>
        <Button 
          variant="outline" 
          className="h-16 text-lg"
          onClick={() => setLane(prev => Math.min(2, prev + 1))}
        >
          Right →
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Use ← → to switch lanes, ↑ or Space to jump. Music affects game speed!
      </p>
    </div>
  );
};

export default RollingSkyGame;
