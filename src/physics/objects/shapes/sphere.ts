import { Vector } from "../../../math/linear-algebra/vector";
import { Body } from "../body";

export class Sphere extends Body {
    constructor(
        public radius_Meters: number,
        position3vector_XYZ: Vector,
        velocity3vector_MeterPerSec: Vector,
        mass_Kg: number,
    ) {
        super(position3vector_XYZ, velocity3vector_MeterPerSec, mass_Kg);
    }

    get volume_MeterCube(): number {
        return (4 / 3) * Math.PI * this.radius_Meters ** 3; // 4/3 pi r^3
    }

    get massDensity_KgPerMeterCube(): number {
        return this.mass_Kg / this.volume_MeterCube; // mass/volume
    }
}
