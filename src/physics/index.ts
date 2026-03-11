// test-two-body.ts

import { Vector } from "../math/linear-algebra/vector";
import { PhysicsConstants } from "./constants";
import { Space } from "./objects/space";
import { evolve } from "./evolve";
import { evolutionEquation } from "./evolution-equations/newton-gravity.evolution";
import { Body } from "./objects/body";

// Simple 2-body: massive sun at origin, small planet in (approx) circular orbit in +y.
function makeTwoBodySpace(): Space {
    const G =
        PhysicsConstants.gravitationalConstant_MeterCubedPerKilogramSecondSquared;

    const massSun = 1.98847e30; // kg
    const massPlanet = 5.9722e24; // kg (Earth-like)
    const orbitRadius = 1.496e11; // m (1 AU)

    // Orbital speed v = sqrt(G M / r)
    const orbitalSpeed = Math.sqrt((G * massSun) / orbitRadius); // m/s

    // Sun at origin, stationary
    const sun = new Body(
        new Vector([0, 0, 0]), // position
        new Vector([0, 0, 0]), // velocity
        massSun,
    );

    // Planet on +x axis, velocity along +y
    const planet = new Body(
        new Vector([orbitRadius, 0, 0]), // position
        new Vector([0, orbitalSpeed, 0]), // velocity
        massPlanet,
    );

    return new Space([sun, planet]);
}

function run() {
    const initialSpace = makeTwoBodySpace();

    // 1 day in seconds, and simulate ~10 days
    const dt = 60 * 60; // 1 hour
    const totalTime = 10 * 24 * 60 * 60; // 10 days

    const states = evolve(initialSpace, evolutionEquation, totalTime, dt);

    console.log("Number of saved states:", states.length);
    console.log("Initial state vector:", states[0]);
    console.log("Final state vector:", states[states.length - 1]);

    console.log(states.slice(0, 10));
}

run();
