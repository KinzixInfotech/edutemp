'use client';

import { Canvas } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useMemo } from 'react';

function FloatingCube({ position, size, rotation, speed }) {
    return (
        <Float
            speed={speed}
            rotationIntensity={0.5}
            floatIntensity={0.5}
            floatingRange={[-0.5, 0.5]}
        >
            <mesh position={position} rotation={rotation}>
                <boxGeometry args={[size, size, size]} />
                <meshStandardMaterial
                    color="#0469ff"
                    transparent
                    opacity={0.1}
                    wireframe
                />
            </mesh>
        </Float>
    );
}

export default function ThreeBackground() {
    const cubes = useMemo(() => [
        // { position: [-8, 3, -5], size: 2, rotation: [0.3, 0.4, 0], speed: 2 },
        { position: [8, -5, -6], size: 1.5, rotation: [0.5, 0.2, 0.3], speed: 1.5 },
        { position: [-6, -5, -6], size: 1.2, rotation: [0.2, 0.6, 0.1], speed: 2.5 },
        // { position: [6, 4, -7], size: 1.8, rotation: [0.4, 0.3, 0.5], speed: 1.8 },
        // { position: [0, 0, -10], size: 2.5, rotation: [0.1, 0.5, 0.2], speed: 1.2 },
    ], []);

    return (
        <div className="absolute inset-0 pointer-events-none">
            <Canvas
                camera={{ position: [0, 0, 10], fov: 50 }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                {cubes.map((cube, index) => (
                    <FloatingCube key={index} {...cube} />
                ))}
            </Canvas>
        </div>
    );
}
