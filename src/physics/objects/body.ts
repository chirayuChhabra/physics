import { Vector } from "../../math/linear-algebra/vector";

export abstract class Body {
    constructor(
        public position3vector_XYZ: Vector,
        public velocity3vector_MeterPerSec: Vector,
        public mass_Kg: number,
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

    get momentum3vector_KgMeterPerSecond(): Vector {
        return Vector.scale(this.velocity3vector_MeterPerSec, this.mass_Kg);
    }

    get momentumMagnitude_KgMeterPerSecond(): number {
        return this.momentum3vector_KgMeterPerSecond.norm;
    }
}
