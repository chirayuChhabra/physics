// Detailed Saturn Simulation

import { Vector } from "../../math/linear-algebra/vector";
import { PhysicsConstants } from "../constants";
import { Space } from "../objects/space";
import { evolutionEquation } from "../evolution-equations/newton-gravity.evolution";
import { Body } from "../objects/body";
import { render, BodyConfig } from "../render";

function makeDetailedSaturnSystem(numParticles: number): { space: Space; config: BodyConfig[] } {
    const G = PhysicsConstants.gravitationalConstant_MeterCubedPerKilogramSecondSquared;

    // Saturn mass and radius
    const massSaturn = 5.6834e26; // kg
    const rSaturn = 6.0268e7;     // m (equatorial radius)

    // Setup arrays
    const bodies: Body[] = [];
    const config: BodyConfig[] = [];

    // 1. Central Body: Saturn
    bodies.push(
        new Body(
            new Vector([0, 0, 0]),
            new Vector([0, 0, 0]),
            massSaturn
        )
    );
    config.push({ name: "Saturn", color: "#EAD6A6", radius: 0.8 });

    // 2. Moons of Saturn
    // Accurate distances (semi-major axes in meters) and masses (kg)
    const moons = [
        { name: "Mimas",     r: 1.855e8,  mass: 3.75e19,  color: "#9ca3af", radius: 0.05 },
        { name: "Enceladus", r: 2.380e8,  mass: 1.08e20,  color: "#f3f4f6", radius: 0.06 },
        { name: "Tethys",    r: 2.946e8,  mass: 6.17e20,  color: "#d1d5db", radius: 0.08 },
        { name: "Dione",     r: 3.774e8,  mass: 1.10e21,  color: "#e5e7eb", radius: 0.09 },
        { name: "Rhea",      r: 5.271e8,  mass: 2.30e21,  color: "#9ca3af", radius: 0.12 },
        { name: "Titan",     r: 1.222e9,  mass: 1.345e23, color: "#f59e0b", radius: 0.25 },
        { name: "Iapetus",   r: 3.560e9,  mass: 1.80e21,  color: "#4b5563", radius: 0.11 } // Iapetus is two-toned but we'll use a darker grey
    ];

    moons.forEach(moon => {
        // We will start all moons on the X axis, but let's give them random starting phases
        // to look more realistic.
        const angle = Math.random() * Math.PI * 2;
        const v = Math.sqrt((G * massSaturn) / moon.r); // ignoring moon-moon gravity for initial velocity setup

        bodies.push(
            new Body(
                new Vector([moon.r * Math.cos(angle), moon.r * Math.sin(angle), 0]),
                new Vector([-v * Math.sin(angle), v * Math.cos(angle), 0]),
                moon.mass
            )
        );
        config.push({ name: moon.name, color: moon.color, radius: moon.radius });
    });

    // 3. Rings of Saturn
    // We will separate the rings by distance (in meters) from Saturn's center
    // C Ring: 74,500 km - 92,000 km
    // B Ring: 92,000 km - 117,580 km
    // Cassini Division: 117,580 km - 122,170 km (Gap, no particles)
    // A Ring: 122,170 km - 136,775 km
    const rings = [
        { name: "C Ring", inner: 7.450e7, outer: 9.200e7, countRatio: 0.15, colors: ["#6b7280", "#4b5563", "#374151"] }, // fainter, darker
        { name: "B Ring", inner: 9.200e7, outer: 1.1758e8, countRatio: 0.60, colors: ["#d1d5db", "#e5e7eb", "#f3f4f6"] }, // brightest, dense
        { name: "A Ring", inner: 1.2217e8, outer: 1.36775e8, countRatio: 0.25, colors: ["#9ca3af", "#d1d5db", "#a8a29e"] } // slightly darker than B
    ];

    const particleMass = 1e10; // Extremely tiny mass so they don't perturb the moons or each other significantly, but valid for evolution

    rings.forEach(ring => {
        const count = Math.floor(numParticles * ring.countRatio);
        for (let i = 0; i < count; i++) {
            // Random distance between inner and outer edge
            const r = ring.inner + Math.random() * (ring.outer - ring.inner);

            // Random angle
            const angle = Math.random() * Math.PI * 2;

            // Very slight random tilt/wobble in the Z axis to make it a 3D ring,
            // but keep it very thin as real Saturn rings are extremely thin (tens of meters).
            // We'll exaggerate it slightly for visualization, but keep it tight.
            const zOffset = (Math.random() - 0.5) * (rSaturn * 0.005);

            // Circular orbital speed: v = sqrt(G * M / r)
            // Note: technically we should consider mass of inner rings for v, but mass of rings is negligible compared to Saturn.
            const v = Math.sqrt((G * massSaturn) / r);

            bodies.push(
                new Body(
                    new Vector([r * Math.cos(angle), r * Math.sin(angle), zOffset]),
                    new Vector([-v * Math.sin(angle), v * Math.cos(angle), 0]),
                    particleMass
                )
            );

            const color = ring.colors[Math.floor(Math.random() * ring.colors.length)];

            config.push({
                name: "", // no label
                color: color,
                radius: 0.015 // Tiny visual size
            });
        }
    });

    return { space: new Space(bodies), config };
}

// 1200 ring particles + 7 moons + 1 Saturn = 1208 bodies.
// O(N^2) means 1208^2 / 2 ~ 730,000 gravity pairs PER STEP.
const { space, config } = makeDetailedSaturnSystem(1200);

// Because inner rings (C Ring) are at ~74,500 km, the orbital period is very short (around 5-6 hours).
// A step of 1 hour is too large and will cause instability for inner particles.
// A step of 5 minutes (300 seconds) is much better for stability of inner rings and Mimas.
const dt = 300; // 5 minutes per step
// Simulate for 10 Earth days
const totalTime = 10 * 24 * 60 * 60; // 10 days

// Because this will generate a huge number of frames (10 days / 5 mins = 2880 frames),
// we will record every Nth frame to keep memory usage reasonable.
const RENDER_EVERY_N_FRAMES = 12; // 1 hour per rendered frame

console.log(`Running Detailed Saturn Sim (1200 particles, 7 moons, 10 days)…`);
console.log(`Timestep: ${dt}s. Warning: this is O(N^2) and will take a minute or two to precompute!`);

// Custom evolve to support subsampling frames so frontend doesn't crash with massive JSON
function evolveSubsampled(
    workingSpace: Space,
    timePeriod: number,
    deltaTime: number,
    subsample: number
): number[][] {
    const stateVectors: number[][] = [];
    let currentSpace = workingSpace;

    // Record the initial state
    stateVectors.push(currentSpace.getStateVector().coordinates);

    let steps = 0;
    for (let t = 0; t < timePeriod; t += deltaTime) {
        currentSpace = evolutionEquation(currentSpace, deltaTime);
        steps++;
        if (steps % subsample === 0) {
            stateVectors.push(currentSpace.getStateVector().coordinates);
            if (steps % (subsample * 24) === 0) {
                console.log(`Simulated ${(t / (24*3600)).toFixed(1)} days...`);
            }
        }
    }

    return stateVectors;
}

const states = evolveSubsampled(space, totalTime, dt, RENDER_EVERY_N_FRAMES);

console.log(`Done — ${states.length} frames.`);

render(states, { bodies: config });
