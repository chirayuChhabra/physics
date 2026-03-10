import { Vector } from "./vector";

export class massiveSphere {
    constructor(
        public mass_Kg: number,
        public radius_Meters: number,
        public position3vector_XYZ: Vector,
        public velocity3vector_MeterPerSec: Vector,
    ) {}

    get volume_MeterCube(): number {
        return (4 / 3) * Math.PI * this.radius_Meters ** 3; // 4/3 pi r^3
    }

    get massDensity_KgPerMeterCube(): number {
        return this.mass_Kg / this.volume_MeterCube; // mass/volume
    }

    get velocityMagnitude_MeterPerSecond(): number {
        return this.velocity3vector_MeterPerSec.norm;
    }

    get momentum3vector_KgMeterPerSecond(): Vector {
        return Vector.scale(this.velocity3vector_MeterPerSec, this.mass_Kg);
    }

    get momentumMagnitude_KgMeterPerSecond(): number {
        return this.momentum3vector_KgMeterPerSecond.norm;
    }

    get bodyState_6vector(): Vector {
        return Vector.concatVectors([
            this.position3vector_XYZ,
            this.velocity3vector_MeterPerSec,
        ]);
    }
}
