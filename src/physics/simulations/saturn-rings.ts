// Saturn Ring Simulation (Performance Test)

import { Vector } from "../../math/linear-algebra/vector";
import { PhysicsConstants } from "../constants";
import { Space } from "../objects/space";
import { evolve } from "../evolve";
import { evolutionEquation } from "../evolution-equations/newton-gravity.evolution";
import { Body } from "../objects/body";
import { render, BodyConfig } from "../render";

function makeSaturnRingSystem(numParticles: number): { space: Space; config: BodyConfig[] } {
    const G = PhysicsConstants.gravitationalConstant_MeterCubedPerKilogramSecondSquared;

    // Saturn mass and radius
    const massSaturn = 5.6834e26; // kg
    const rSaturn = 6.0268e7;     // m

    // Ring dimensions (inner and outer edge)
    const ringInner = rSaturn * 1.5;
    const ringOuter = rSaturn * 2.5;

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
    const particleMass = 1e15; // Tiny mass so they don't perturb Saturn, but enough for gravity eq
    for (let i = 0; i < numParticles; i++) {
        // Random distance between inner and outer ring limits
        const r = ringInner + Math.random() * (ringOuter - ringInner);
        
        // Random angle around Saturn
        const angle = Math.random() * Math.PI * 2;
        
        // Slight random tilt/wobble in the Z axis to make it a 3D ring
        const zOffset = (Math.random() - 0.5) * (rSaturn * 0.05);

        // Circular orbital speed: v = sqrt(G * M / r)
        const v = Math.sqrt((G * massSaturn) / r);

        bodies.push(
            new Body(
                new Vector([r * Math.cos(angle), r * Math.sin(angle), zOffset]),
                new Vector([-v * Math.sin(angle), v * Math.cos(angle), 0]),
                particleMass
            )
        );

        // Randomize ring colors to create beautiful, vibrant rings
        const colors = ["#d4af37", "#f5deb3", "#add8e6", "#d8bfd8", "#ffe4b5", "#f0e68c"]; // Pale golds, warm browns, icy blues, dusty rose
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        config.push({
            name: "", // Empty name to hide labels for particles
            color: color,
            radius: 0.03 // Tiny particles
        });
    }

    return { space: new Space(bodies), config };
}

// 250 particles + Saturn = 251 bodies. 
// This will calculate (251 * 250 / 2) = 31,375 gravity pairs PER STEP.
const { space, config } = makeSaturnRingSystem(250);

// Simulate for 14 Earth days
// A dense ring requires a fairly small timestep to keep inner particles stable
const dt = 60 * 60; // 1 hour per step
const totalTime = 14 * 24 * 60 * 60; // 14 days

console.log(`Running Saturn Ring Sim (250 particles, 14 days)…\nWarning: this is O(N^2) and may take a few seconds!`);
const states = evolve(space, evolutionEquation, totalTime, dt);
console.log(`Done — ${states.length} frames.`);

render(states, { bodies: config });
