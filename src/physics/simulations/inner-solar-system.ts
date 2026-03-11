// Inner Solar System: Sun, Mercury, Venus, Earth, Mars

import { Vector } from "../../math/linear-algebra/vector";
import { PhysicsConstants } from "../constants";
import { Space } from "../objects/space";
import { evolve } from "../evolve";
import { evolutionEquation } from "../evolution-equations/newton-gravity.evolution";
import { Body } from "../objects/body";
import { render } from "../render";

function makeInnerSolarSystem(): Space {
    const G =
        PhysicsConstants.gravitationalConstant_MeterCubedPerKilogramSecondSquared;

    const massSun = 1.98847e30;

    // [name, mass (kg), semi-major axis (m), initial angle (radians)]
    // Angles spread planets around the orbit so they don't all start in a line
    const planets: [string, number, number, number][] = [
        ["Mercury", 3.3011e23,  5.791e10,   0],
        ["Venus",   4.8675e24,  1.0821e11,  Math.PI * 0.6],
        ["Earth",   5.9722e24,  1.496e11,   Math.PI * 1.2],
        ["Mars",    6.4171e23,  2.2792e11,  Math.PI * 1.7],
    ];

    const bodies = [
        new Body(new Vector([0, 0, 0]), new Vector([0, 0, 0]), massSun),
    ];

    for (const [, mass, r, angle] of planets) {
        const v = Math.sqrt((G * massSun) / r);
        // Position at angle on orbit, velocity perpendicular to position
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

// Simulate 2 years with 6-hour steps
const space = makeInnerSolarSystem();
const dt = 6 * 60 * 60;
const totalTime = 2 * 365 * 24 * 60 * 60;

console.log("Running inner solar system (2 years)…");
const states = evolve(space, evolutionEquation, totalTime, dt);
console.log(`Done — ${states.length} frames.`);

render(states, {
    bodies: [
        { name: "Sun",     color: "#FDB813", radius: 0.6  },
        { name: "Mercury", color: "#8C7E6A", radius: 0.12 },
        { name: "Venus",   color: "#E8CDA0", radius: 0.18 },
        { name: "Earth",   color: "#4B7BE5", radius: 0.20 },
        { name: "Mars",    color: "#C1440E", radius: 0.15 },
    ],
});
