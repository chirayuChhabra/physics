// Full Solar System: Sun + 8 planets

import { Vector } from "../../math/linear-algebra/vector";
import { PhysicsConstants } from "../constants";
import { Space } from "../objects/space";
import { evolve } from "../evolve";
import { evolutionEquation } from "../evolution-equations/newton-gravity.evolution";
import { Body } from "../objects/body";
import { render } from "../render";

function makeFullSolarSystem(): Space {
    const G =
        PhysicsConstants.gravitationalConstant_MeterCubedPerKilogramSecondSquared;

    const massSun = 1.98847e30;

    // [name, mass (kg), semi-major axis (m), initial angle (radians)]
    // Angles spread realistically so planets aren't in a line
    const planets: [string, number, number, number][] = [
        ["Mercury", 3.3011e23,   5.791e10,   0],
        ["Venus",   4.8675e24,   1.0821e11,  Math.PI * 0.45],
        ["Earth",   5.9722e24,   1.496e11,   Math.PI * 0.9],
        ["Mars",    6.4171e23,   2.2792e11,  Math.PI * 1.4],
        ["Jupiter", 1.8982e27,   7.7857e11,  Math.PI * 0.3],
        ["Saturn",  5.6834e26,   1.4335e12,  Math.PI * 1.1],
        ["Uranus",  8.6810e25,   2.8725e12,  Math.PI * 1.7],
        ["Neptune", 1.02413e26,  4.4951e12,  Math.PI * 0.6],
    ];

    const bodies = [
        new Body(new Vector([0, 0, 0]), new Vector([0, 0, 0]), massSun),
    ];

    for (const [, mass, r, angle] of planets) {
        const v = Math.sqrt((G * massSun) / r);
        bodies.push(
            new Body(
                new Vector([r * Math.cos(angle), r * Math.sin(angle), 0]),
                new Vector([-v * Math.sin(angle), v * Math.cos(angle), 0]),
                mass,
            ),
        );
    }

    return new Space(bodies);
}

// Simulate 12 years (Jupiter period ≈ 11.86y) with 1-day steps
const space = makeFullSolarSystem();
const dt = 24 * 60 * 60;                              // 1 day
const totalTime = 12 * 365.25 * 24 * 60 * 60;         // 12 years

console.log("Running full solar system (12 years)…");
const states = evolve(space, evolutionEquation, totalTime, dt);
console.log(`Done — ${states.length} frames.`);

render(states, {
    bodies: [
        { name: "Sun",     color: "#FDB813", radius: 0.55 },
        { name: "Mercury", color: "#8C7E6A", radius: 0.08 },
        { name: "Venus",   color: "#E8CDA0", radius: 0.11 },
        { name: "Earth",   color: "#4B7BE5", radius: 0.12 },
        { name: "Mars",    color: "#C1440E", radius: 0.09 },
        { name: "Jupiter", color: "#C88B3A", radius: 0.35 },
        { name: "Saturn",  color: "#EAD6A6", radius: 0.30 },
        { name: "Uranus",  color: "#73C2D0", radius: 0.22 },
        { name: "Neptune", color: "#3F54BA", radius: 0.20 },
    ],
});
