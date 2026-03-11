import { Vector } from "../../math/linear-algebra/vector";
import { Body } from "../objects/body";
import { PhysicsConstants } from "../constants";

function getGravitationalAcceleration_meterPerSecondSquare(
    effectedBody: Body,
    effectingBodies: Body[],
): Vector {
    const effectedBodyPosition3Vector: Vector =
        effectedBody.position3vector_XYZ;

    let partialAcceleration = new Vector([0, 0, 0]);

    for (const sourceBody of effectingBodies) {
        if (sourceBody === effectedBody) continue; // Skip self

        const effectingMass: number = sourceBody.mass_Kg;
        const effectingDistance: Vector = Vector.distanceVector(
            sourceBody.position3vector_XYZ,
            effectedBody.position3vector_XYZ,
        );

        const rCubed = effectingDistance.norm ** 3;

        if (rCubed === 0) continue; // Rare, extra safety

        const scalingFactor: number = effectingMass / rCubed;

        const accTerm: Vector = Vector.scale(effectingDistance, scalingFactor);

        Vector.add(partialAcceleration, accTerm);
    }

    const acceleration = Vector.scale(
        partialAcceleration,
        PhysicsConstants.gravitationalConstant_MeterCubedPerKilogramSecondSquared,
    );

    return acceleration;
}
