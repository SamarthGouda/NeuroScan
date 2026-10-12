import React, { useRef, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* ─── Preload the 3D Brain Model ─────────────────────────────────────────── */
useGLTF.preload("/models/brain.glb");

/* ─── Real 3D Anatomical Brain Mesh with Neural Shader Layers ─────────────── */
function AnatomicalBrainModel() {
  const groupRef = useRef<THREE.Group>(null);
  const scanRingRef = useRef<THREE.Mesh>(null);
  const tumorPulseRef = useRef<THREE.Mesh>(null);
  const tumorRingRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Load the genuine human brain GLB model
  const { scene } = useGLTF("/models/brain.glb");

  // Extract the high-resolution anatomical geometry from the GLB
  const brainGeometry = useMemo(() => {
    let foundGeo: THREE.BufferGeometry | null = null;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !foundGeo) {
        foundGeo = (child as THREE.Mesh).geometry.clone();
        foundGeo.computeVertexNormals();
        foundGeo.center(); // Center the pivot point exactly at (0, 0, 0)
      }
    });
    return foundGeo;
  }, [scene]);

  // Create subtle pulsating and rotating animation
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.22; // Smooth 360-degree rotation
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.04; // Gentle vertical float
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.04;
    }

    // Sweeping vertical MRI laser slice
    if (scanRingRef.current) {
      scanRingRef.current.position.y = Math.sin(t * 1.4) * 0.72;
      scanRingRef.current.rotation.z = t * 0.6;
    }

    // Pulsing neoplastic tumor lesion
    if (tumorPulseRef.current) {
      const pulse = 1 + 0.28 * Math.sin(t * 3.2);
      tumorPulseRef.current.scale.setScalar(pulse);
    }
    if (tumorRingRef.current) {
      tumorRingRef.current.rotation.x = t * 1.5;
      tumorRingRef.current.rotation.y = t * 0.9;
    }

    // Point cloud slight particle twitch
    if (pointsRef.current) {
      const pointsMat = pointsRef.current.material as THREE.PointsMaterial;
      if (pointsMat) {
        pointsMat.opacity = 0.72 + 0.18 * Math.sin(t * 2.0);
      }
    }
  });

  if (!brainGeometry) {
    return null;
  }

  return (
    <group ref={groupRef} scale={1.22} position={[0, 0.05, 0]}>
      {/* ── Layer 1: Semi-translucent Deep Midnight Cyan Base Mesh ── */}
      <mesh geometry={brainGeometry}>
        <meshStandardMaterial
          color={new THREE.Color("#021a2c")}
          emissive={new THREE.Color("#003852")}
          emissiveIntensity={0.65}
          roughness={0.22}
          metalness={0.88}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Layer 2: Glowing Cyan Wireframe Cortical Folds ── */}
      <mesh geometry={brainGeometry} scale={1.004}>
        <meshBasicMaterial
          color={new THREE.Color("#00e5ff")}
          wireframe
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>

      {/* ── Layer 3: Glowing Synaptic Dot-Matrix Point Cloud (Matches Ref Images) ── */}
      <points ref={pointsRef} geometry={brainGeometry} scale={1.008}>
        <pointsMaterial
          size={0.016}
          color={new THREE.Color("#38bdf8")}
          transparent
          opacity={0.82}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* ── Layer 4: Internal Neoplastic Lesion Hotspot (Red Tumor Core from Ref 4) ── */}
      <group position={[0.32, 0.14, -0.05]}>
        {/* Pulsing red tumor sphere */}
        <mesh ref={tumorPulseRef}>
          <sphereGeometry args={[0.11, 24, 24]} />
          <meshBasicMaterial
            color={new THREE.Color("#ef4444")}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* Orange halo glow */}
        <mesh scale={1.4}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshBasicMaterial
            color={new THREE.Color("#f97316")}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Targeting HUD crosshair rings */}
        <mesh ref={tumorRingRef}>
          <torusGeometry args={[0.19, 0.004, 8, 36]} />
          <meshBasicMaterial
            color={new THREE.Color("#ef4444")}
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>

        {/* Local tumor illumination */}
        <pointLight color="#ef4444" intensity={2.4} distance={0.9} />
      </group>

      {/* ── Layer 5: Vertical Laser Scanning Slice Plane ── */}
      <mesh ref={scanRingRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.95, 64]} />
        <meshBasicMaterial
          color={new THREE.Color("#00ffff")}
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* ─── Ambient Orbiting Synaptic Particle Field ────────────────────────────── */
function AmbientSynapseParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 260;

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.05 + Math.random() * 0.65;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.15;
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.9 + 0.05;
      positions[i * 3 + 2] = r * Math.cos(phi) * 1.05;

      const hue = 0.52 + Math.random() * 0.12; // Cyan to Deep Electric Blue
      const col = new THREE.Color().setHSL(hue, 1.0, 0.75);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    return { positions, colors };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.elapsedTime * 0.08;
    pointsRef.current.rotation.y = t * 0.25;
    pointsRef.current.position.y = Math.sin(t * 1.2) * 0.03;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ─── Holographic Scanner Pedestal Base (From User Ref Image 4) ──────────── */
function HolographicPedestal() {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring1.current) ring1.current.rotation.z = t * 0.2;
    if (ring2.current) ring2.current.rotation.z = -t * 0.35;
    if (ring3.current) ring3.current.rotation.z = t * 0.12;
  });

  return (
    <group position={[0, -1.05, 0]}>
      {/* Outer rotating HUD ring */}
      <mesh ref={ring1} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.25, 1.28, 64]} />
        <meshBasicMaterial
          color={new THREE.Color("#00bcd4")}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Middle dashed tech ring */}
      <mesh ref={ring2} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 0.97, 48]} />
        <meshBasicMaterial
          color={new THREE.Color("#7c4dff")}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Inner circular emitter disc */}
      <mesh ref={ring3} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.65, 32]} />
        <meshBasicMaterial
          color={new THREE.Color("#00e5ff")}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* ─── Interactive Mouse Parallax ─────────────────────────────────────────── */
function MouseParallax() {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    camera.position.x += (target.current.x * 0.35 - camera.position.x) * 0.04;
    camera.position.y += (target.current.y * 0.22 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ─── Sleek Loading Fallback ─────────────────────────────────────────────── */
function BrainFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-2xl animate-pulse" />
        <div
          className="relative w-44 h-44 rounded-full border border-cyan-500/40 border-t-cyan-300 flex items-center justify-center animate-spin"
          style={{ animationDuration: "14s" }}
        >
          <div className="w-28 h-28 rounded-full border border-cyan-400/30 border-b-cyan-200 flex items-center justify-center animate-spin"
            style={{ animationDuration: "8s", animationDirection: "reverse" }}>
            <span className="text-cyan-400 font-mono text-[11px] font-bold tracking-wider">NEUROSCAN</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs font-mono text-cyan-500 dark:text-cyan-400 animate-pulse">
        Initializing 3D Neural Geometry...
      </p>
    </div>
  );
}

/* ─── Error Boundary Wrapper for 3D Canvas ───────────────────────────────── */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("Canvas 3D brain error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/* ─── Exported Main 3D Brain Component ───────────────────────────────────── */
export function BrainVisualization({ className = "" }: { className?: string }) {
  const canRender = typeof window !== "undefined" && (() => {
    try {
      const canvas = document.createElement("canvas");
      return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
    } catch {
      return false;
    }
  })();

  if (!canRender) return <BrainFallback />;

  return (
    <div
      className={`w-full h-full relative select-none ${className}`}
      aria-label="Interactive 3D Anatomical Brain Visualization"
      role="img"
    >
      <CanvasErrorBoundary fallback={<BrainFallback />}>
        <Canvas
          camera={{ position: [0, 0, 2.7], fov: 45, near: 0.1, far: 100 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          style={{ background: "transparent" }}
          dpr={[1, 2]}
        >
          {/* Lighting Rig tailored for Cyber-Medical Holographic Rendering */}
          <ambientLight intensity={0.25} color={0x001a2e} />
          <pointLight position={[3, 3, 3]} intensity={2.2} color={0x00e5ff} />
          <pointLight position={[-3, -1.5, -2]} intensity={1.5} color={0x7c4dff} />
          <pointLight position={[0, 4, 1]} intensity={1.1} color={0x38bdf8} />
          <directionalLight position={[0, -2, -2]} intensity={0.6} color={0x00bcd4} />

          <Suspense fallback={null}>
            <AnatomicalBrainModel />
          </Suspense>

          <AmbientSynapseParticles />
          <HolographicPedestal />
          <MouseParallax />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
export default BrainVisualization;
