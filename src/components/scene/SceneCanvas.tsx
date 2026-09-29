"use client";

import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls, Grid } from "@react-three/drei";
import { Vector3 } from "three";
import { DEFAULT_VIEW, EXPLODED_VIEW, getFocus, Laptop } from "./Laptop";
import { SceneContext, useScene, type SceneState } from "./SceneContext";

const SCENE_OFFSET_Z = 0.2;

function Controls({ autoRotate, resetKey }: { autoRotate: boolean; resetKey: number }) {
  const ref = useRef<ComponentRef<typeof CameraControls>>(null);
  const { selected, exploded } = useScene();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (!selected) {
      const view = exploded ? EXPLODED_VIEW : DEFAULT_VIEW;
      c.setLookAt(...view.position, ...view.target, true);
      return;
    }
    const { target, distance } = getFocus(selected, exploded);
    const t = new Vector3(target[0], target[1], target[2] + SCENE_OFFSET_Z);
    const pos = c.getPosition(new Vector3());
    const dir = pos.sub(c.getTarget(new Vector3())).normalize();
    if (dir.y < 0.35) dir.setY(0.35).normalize();
    const p = t.clone().addScaledVector(dir, distance);
    c.setLookAt(p.x, p.y, p.z, t.x, t.y, t.z, true);
  }, [selected, exploded, resetKey]);

  useFrame((_, dt) => {
    if (autoRotate && ref.current) ref.current.azimuthAngle += dt * 0.15;
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={0.6}
      maxDistance={12}
      maxPolarAngle={Math.PI * 0.49}
      smoothTime={0.45}
    />
  );
}

interface SceneCanvasProps {
  state: SceneState;
  autoRotate: boolean;
  resetKey: number;
}

export function SceneCanvas({ state, autoRotate, resetKey }: SceneCanvasProps) {
  const [labelLayer, setLabelLayer] = useState<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ ...state, labelLayer }), [state, labelLayer]);

  return (
    <div className="relative h-full w-full">
    <Canvas
      dpr={[1, 2]}
      camera={{ position: DEFAULT_VIEW.position, fov: 38, near: 0.05, far: 100 }}
      onPointerMissed={() => state.select(null)}
    >
      <SceneContext.Provider value={value}>
        <color attach="background" args={["#05070d"]} />
        <fog attach="fog" args={["#05070d", 10, 22]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 8, 4]} intensity={1.3} />
        <directionalLight position={[-6, 4, -3]} intensity={0.35} color="#7dd3fc" />
        <pointLight position={[0, 2, 1]} intensity={3} distance={6} color="#38bdf8" />
        <Laptop machine={state.machine} />
        <Grid
          position={[0, -0.002, 0]}
          infiniteGrid
          cellSize={0.25}
          cellThickness={0.5}
          cellColor="#172033"
          sectionSize={1}
          sectionThickness={0.9}
          sectionColor="#1e3a5f"
          fadeDistance={16}
          fadeStrength={1.5}
        />
        <Controls autoRotate={autoRotate} resetKey={resetKey} />
      </SceneContext.Provider>
    </Canvas>
    <div ref={setLabelLayer} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}
