import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, MeshWobbleMaterial, Points, PointMaterial, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

interface VisualizerProps {
  theme: 'cyber' | 'nebula';
  className?: string;
}

const CyberGrid = ({ analyser }: { analyser: AnalyserNode }) => {
  const groupRef = useRef<THREE.Group>(null);
  const dataArray = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);

  useFrame((state) => {
    if (!groupRef.current) return;
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average for different bands
    const bass = dataArray[2] / 255;
    const mid = dataArray[10] / 255;
    const treble = dataArray[20] / 255;

    groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
    groupRef.current.position.z = Math.sin(state.clock.getElapsedTime()) * 0.5;
    
    // Reactive scaling
    groupRef.current.scale.setScalar(1 + bass * 0.1);
  });

  return (
    <group ref={groupRef}>
      <gridHelper args={[40, 40, '#ff00ff', '#00ffff']} rotation={[Math.PI / 2, 0, 0]} position={[0, -5, 0]} />
      <gridHelper args={[40, 40, '#00ffff', '#ff00ff']} rotation={[-Math.PI / 2, 0, 0]} position={[0, 5, 0]} />
      
      <Float speed={2} rotationIntensity={2} floatIntensity={2}>
        <Sphere args={[1, 64, 64]}>
          <MeshDistortMaterial
            color="#ff00ff"
            speed={5}
            distort={0.4}
            radius={1}
            emissive="#ff00ff"
            emissiveIntensity={2}
          />
        </Sphere>
      </Float>
      
      <pointLight position={[10, 10, 10]} color="#ff00ff" intensity={2} />
      <pointLight position={[-10, -10, -10]} color="#00ffff" intensity={2} />
    </group>
  );
};

const PlasmaNebula = ({ analyser }: { analyser: AnalyserNode }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const dataArray = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);

  const particles = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return positions;
  }, []);

  useFrame((state) => {
    analyser.getByteFrequencyData(dataArray);
    const bass = dataArray[2] / 255;
    const treble = dataArray[20] / 255;

    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.03;
      pointsRef.current.scale.setScalar(1 + bass * 0.5);
    }

    if (sphereRef.current) {
      const material = sphereRef.current.material as any;
      material.distort = 0.3 + bass * 0.5;
      material.speed = 1 + treble * 5;
    }
  });

  return (
    <group>
      <Points ref={pointsRef} positions={particles} stride={3}>
        <PointMaterial
          transparent
          color="#4facfe"
          size={0.05}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
      
      <Sphere ref={sphereRef} args={[2, 64, 64]}>
        <MeshWobbleMaterial
          color="#00f2fe"
          speed={1}
          factor={0.6}
          emissive="#4facfe"
          emissiveIntensity={0.5}
        />
      </Sphere>
      
      <ambientLight intensity={0.2} />
      <pointLight position={[5, 5, 5]} color="#00f2fe" intensity={5} />
      <pointLight position={[-5, -5, -5]} color="#4facfe" intensity={5} />
    </group>
  );
};

const AdvancedVisualizer = ({ theme, className }: VisualizerProps) => {
  const { analyserRef, isPlaying } = useMusicPlayer();

  if (!isPlaying || !analyserRef.current) {
    return (
      <div className={className + " flex items-center justify-center bg-black/20 rounded-3xl overflow-hidden border border-white/5"}>
        <div className="text-primary/20 font-black uppercase tracking-[0.2em] animate-pulse">Waiting for audio signal...</div>
      </div>
    );
  }

  return (
    <div className={className + " bg-black rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative"}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 5, 20]} />
        
        {theme === 'cyber' ? (
          <CyberGrid analyser={analyserRef.current} />
        ) : (
          <PlasmaNebula analyser={analyserRef.current} />
        )}
        
        <Environment preset="night" />
      </Canvas>
      
      {/* Glossy Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />
    </div>
  );
};

export default AdvancedVisualizer;
