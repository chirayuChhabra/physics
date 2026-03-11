import { Body } from "./body";
import { Vector } from "../../math/linear-algebra/vector";

export class Space {
    constructor(public bodies: Body[]) {}

    public getStateVector(): Vector {
        const phaseArr: Vector[] = [];
        for (let body of this.bodies) {
            phaseArr.push(body.bodyState_6vector);
        }
        return Vector.concatVectors(phaseArr);
    }
}
