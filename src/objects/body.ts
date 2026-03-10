import { Vector } from "../vector";

export class Body {
    constructor(
        public position3vector_XYZ: Vector,
        public velocity3vector_MeterPerSec: Vector,
    ) {}

    get velocityMagnitude_MeterPerSecond(): number {
        return this.velocity3vector_MeterPerSec.norm;
    }

    get bodyState_6vector(): Vector {
        return Vector.concatVectors([
            this.position3vector_XYZ,
            this.velocity3vector_MeterPerSec,
        ]);
    }
}
