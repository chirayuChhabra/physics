// Detailed Saturn Ring Simulation (Performance Test / Visuals)

import { Vector } from "../../math/linear-algebra/vector";
import { PhysicsConstants } from "../constants";
import { Space } from "../objects/space";
import { evolve } from "../evolve";
import { evolutionEquation } from "../evolution-equations/newton-gravity.evolution";
import { Body } from "../objects/body";
import { render, BodyConfig } from "../render";
import { runCachedSimulation } from "../cache";

function makeDetailedSaturnRingSystem(numParticles: number): { space: Space; config: BodyConfig[] } {
    const G = PhysicsConstants.gravitationalConstant_MeterCubedPerKilogramSecondSquared;

    // Saturn mass and radius
    const massSaturn = 5.6834e26; // kg
    const rSaturn = 6.0268e7;     // m

    // Ring dimensions (inner and outer edge - wider and more particles)
    const ringInner = rSaturn * 1.3;
    const ringOuter = rSaturn * 3.0;

    const bodies: Body[] = [
        new Body(
            new Vector([0, 0, 0]),
            new Vector([0, 0, 0]),
            massSaturn
        )
    ];

    const config: BodyConfig[] = [
        { name: "Saturn", color: "#EAD6A6", radius: 0.8 } // Large central body
    ];

    // Generate random ring particles
    const particleMass = 1e14; // Tiny mass so they don't perturb Saturn
    for (let i = 0; i < numParticles; i++) {
        // Random distance between inner and outer ring limits
        const r = ringInner + Math.random() * (ringOuter - ringInner);

        // Random angle around Saturn
        const angle = Math.random() * Math.PI * 2;

        // Slight random tilt/wobble in the Z axis to make it a 3D ring
        const zOffset = (Math.random() - 0.5) * (rSaturn * 0.08);

        // Circular orbital speed: v = sqrt(G * M / r)
        const v = Math.sqrt((G * massSaturn) / r);

        bodies.push(
            new Body(
                new Vector([r * Math.cos(angle), r * Math.sin(angle), zOffset]),
                new Vector([-v * Math.sin(angle), v * Math.cos(angle), 0]),
                particleMass
            )
        );

        // Randomize ring colors slightly between dirty ice and dust
        const colors = ["#d1d5db", "#9ca3af", "#d6d3d1", "#a8a29e", "#e5e7eb", "#f3f4f6"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        config.push({
            name: "", // Empty name to hide labels for particles
            color: color,
            radius: 0.02 // Tiny particles
        });
    }

    return { space: new Space(bodies), config };
}

// 1000 particles + Saturn = 1001 bodies.
// A much more detailed simulation. Warning: Will be slow to compute initially.
const { space, config } = makeDetailedSaturnRingSystem(1000);

// Simulate for 14 Earth days
const dt = 60 * 60; // 1 hour per step
const totalTime = 14 * 24 * 60 * 60; // 14 days

const states = runCachedSimulation("detailed-saturn", () => {
    console.log(`Running Detailed Saturn Ring Sim (1000 particles, 14 days)…\nWarning: this is O(N^2) and may take a few minutes!`);
    const result = evolve(space, evolutionEquation, totalTime, dt);
    console.log(`Done — ${result.length} frames.`);
    return result;
});

render(states, { bodies: config });
