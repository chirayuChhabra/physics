import { Vector } from "../../math/linear-algebra/vector";
import { Body } from "../objects/body";
import { Space } from "../objects/space";
import { getGravitationalAcceleration_meterPerSecondSquare } from "../util-formulas/newton-gravity-acc";

function evolutionEquation(workingSpace: Space, deltaTime: number): Space {
    const bodies = workingSpace.bodies;
    const N = bodies.length;
    const accelerations: Vector[] = [];

    // Compute all accels O(N^2)
    for (let i = 0; i < N; i++) {
        accelerations[i] = getGravitationalAcceleration_meterPerSecondSquare(
            bodies[i],
            bodies,
        );
    }

    // Update all bodies O(N)
    const updatedBodies: Body[] = [];
    for (let i = 0; i < N; i++) {
        const body = bodies[i];
        const acc = accelerations[i];

        // Semi-implicit: v new first
        const newVel = Vector.add(
            body.velocity3vector_MeterPerSec,
            Vector.scale(acc, deltaTime),
        );
        const newPos = Vector.add(
            body.position3vector_XYZ,
            Vector.scale(newVel, deltaTime),
        ); // Use newVel!

        updatedBodies.push(new Body(newPos, newVel, body.mass_Kg));
    }

    return new Space(updatedBodies);
}
