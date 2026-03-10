import { Body } from "./objects/body";
import { Vector } from "./vector";

class Space {
    constructor(public bodies: Body[]) {}

    // this function was created using help of ai , the idea was understood and asked by me for implementing the upper-triangle matrix datatype , and affirmed by ai that this is the best we can do O(n^2)
    public getDistanceMatrix(): (number | null)[][] {
        const matrix: (number | null)[][] = Array.from(
            { length: this.bodies.length },
            () => Array(this.bodies.length).fill(null),
        );

        for (let i = 0; i < this.bodies.length; i++) {
            matrix[i][i] = 0;

            for (let j = i + 1; j < this.bodies.length; j++) {
                matrix[i][j] = Vector.distanceMagnitude(
                    this.bodies[i].position3vector_XYZ,
                    this.bodies[j].position3vector_XYZ,
                );
            }
        }
        return matrix;
    }

    // continuing to making my performance worse! LOL
    // key point ! Normal phase space is with position and momentum , but here we are using position and velocity as mass is const and not needed for now
    public getStateVector(): Vector {
        const phaseArr: Vector[] = [];
        for (let body of this.bodies) {
            phaseArr.push(body.bodyState_6vector);
        }
        return Vector.concatVectors(phaseArr);
    }
}
