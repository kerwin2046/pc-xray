"use client";

import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls, ContactShadows, Environment, Grid, Lightformer } from "@react-three/drei";
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

function SchematicLights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 4]} intensity={1.3} />
      <directionalLight position={[-6, 4, -3]} intensity={0.35} color="#7dd3fc" />
      <pointLight position={[0, 2, 1]} intensity={3} distance={6} color="#38bdf8" />
    </>
  );
}

/** Reflections come from Lightformers rendered locally, so no HDR download is needed. */
function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight
        castShadow
        position={[3, 6.5, 3.5]}
        intensity={1.8}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.01}
      >
        <orthographicCamera attach="shadow-camera" args={[-3, 3, 3, -3, 0.5, 20]} />
      </directionalLight>
      <directionalLight position={[-5, 3, -4]} intensity={0.35} color="#bfdbfe" />
      <Environment resolution={256} frames={1} environmentIntensity={0.85}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 1]} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-6, 2, 2]} scale={[6, 2, 1]} color="#dbeafe" />
        <Lightformer form="rect" intensity={0.7} position={[6, 1.5, -2]} scale={[6, 2, 1]} color="#fde68a" />
        <Lightformer form="ring" intensity={1.4} position={[2.5, 3, 6]} scale={2.5} />
      </Environment>
      <ContactShadows position={[0, -0.001, 0.2]} scale={[6, 4.5]} blur={2.2} far={1.2} opacity={0.75} resolution={512} />
    </>
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
      shadows="percentage"
      dpr={[1, state.realistic ? 1.5 : 2]}
      camera={{ position: DEFAULT_VIEW.position, fov: 38, near: 0.05, far: 100 }}
      onPointerMissed={() => state.select(null)}
    >
      <SceneContext.Provider value={value}>
        <color attach="background" args={["#05070d"]} />
        <fog attach="fog" args={["#05070d", 10, 22]} />
        {state.realistic ? <StudioLights /> : <SchematicLights />}
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
