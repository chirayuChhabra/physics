import { Vector } from "../math/linear-algebra/vector";
import { evolutionEquation } from "./evolution-equations/newton-gravity.evolution";
import { Space } from "./objects/space";

export function evolve(
    workingSpace: Space,
    evoEquation: typeof evolutionEquation,
    timePeriod: number,
    deltaTime: number = 1,
): number[][] {
    const stateVectors: number[][] = [];
    let currentSpace = workingSpace;

    // Record the initial state
    stateVectors.push(currentSpace.getStateVector().coordinates);

    // Evolve over the given time period
    for (let t = 0; t < timePeriod; t += deltaTime) {
        currentSpace = evoEquation(currentSpace, deltaTime);
        stateVectors.push(currentSpace.getStateVector().coordinates);
    }

    return stateVectors;
}
