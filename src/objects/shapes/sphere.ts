import { Vector } from "../../vector";
import { Body } from "../body";

export class MassiveSphere extends Body {
    constructor(
        public mass_Kg: number,
        public radius_Meters: number,
        public position3vector_XYZ: Vector,
        public velocity3vector_MeterPerSec: Vector,
    ) {
        super(position3vector_XYZ, velocity3vector_MeterPerSec);
    }

    get volume_MeterCube(): number {
        return (4 / 3) * Math.PI * this.radius_Meters ** 3; // 4/3 pi r^3
    }

    get massDensity_KgPerMeterCube(): number {
        return this.mass_Kg / this.volume_MeterCube; // mass/volume
    }

    get momentum3vector_KgMeterPerSecond(): Vector {
        return Vector.scale(this.velocity3vector_MeterPerSec, this.mass_Kg);
    }

    get momentumMagnitude_KgMeterPerSecond(): number {
        return this.momentum3vector_KgMeterPerSecond.norm;
    }
}
