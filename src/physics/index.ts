// Sun-Earth-Moon 3-body simulation

import { Vector } from "../math/linear-algebra/vector";
import { PhysicsConstants } from "./constants";
import { Space } from "./objects/space";
import { evolve } from "./evolve";
import { evolutionEquation } from "./evolution-equations/newton-gravity.evolution";
import { Body } from "./objects/body";
import { render } from "./render";

// Simple 3-body: Sun at origin, Earth in circular orbit, Moon orbiting Earth.
function makeSunEarthMoonSpace(): Space {
    const G =
        PhysicsConstants.gravitationalConstant_MeterCubedPerKilogramSecondSquared;

    // Masses
    const massSun = 1.98847e30;   // kg
    const massEarth = 5.9722e24;  // kg
    const massMoon = 7.342e22;    // kg

    // Orbital radii
    const earthOrbitR = 1.496e11;    // m  (1 AU)
    const moonOrbitR = 3.844e8;      // m  (384,400 km from Earth)

    // Orbital speeds  v = sqrt(G * M_central / r)
    const earthSpeed = Math.sqrt((G * massSun) / earthOrbitR);
    const moonSpeedRelEarth = Math.sqrt((G * massEarth) / moonOrbitR);

    // Sun at origin, stationary
    const sun = new Body(
        new Vector([0, 0, 0]),
        new Vector([0, 0, 0]),
        massSun,
    );

    // Earth on +x axis, velocity along +y
    const earth = new Body(
        new Vector([earthOrbitR, 0, 0]),
        new Vector([0, earthSpeed, 0]),
        massEarth,
    );

    // Moon offset from Earth along +x, velocity = Earth's + lunar orbital vel along +y
    const moon = new Body(
        new Vector([earthOrbitR + moonOrbitR, 0, 0]),
        new Vector([0, earthSpeed + moonSpeedRelEarth, 0]),
        massMoon,
    );

    return new Space([sun, earth, moon]);
}

function run() {
    const initialSpace = makeSunEarthMoonSpace();

    // 1 full year with 3-hour timesteps → ~2920 frames
    const dt = 3 * 60 * 60;                   // 3 hours
    const totalTime = 365 * 24 * 60 * 60;      // 1 year

    console.log("Running Sun-Earth-Moon simulation (1 year)…");
    const states = evolve(initialSpace, evolutionEquation, totalTime, dt);
    console.log(`Done — ${states.length} frames generated.`);

    render(states);
}

run();
