export class Vector {
    readonly size: number;

    constructor(public readonly coordinates: number[]) {
        this.size = coordinates.length;
    }

    private static _compatibilityCheck(vec1: Vector, vec2: Vector): void {
        if (vec1.size != vec2.size) {
            throw new Error(
                `Invalid Vector sizes , Expected both vectors to be the same size but got vec1.size: ${vec1.size} | vec2.size: ${vec2.size}`,
            );
        }
    }

    get norm(): number {
        const sumSquare = this.coordinates.reduce(
            (sum, coordinate) => sum + coordinate ** 2,
            0,
        );
        return Math.sqrt(sumSquare);
    }

    static add(v1: Vector, v2: Vector): Vector {
        this._compatibilityCheck(v1, v2);

        const coords = v1.coordinates.map((c, i) => c + v2.coordinates[i]);

        return new Vector(coords);
    }

    static subtract(v1: Vector, v2: Vector): Vector {
        this._compatibilityCheck(v1, v2);

        const coords = v1.coordinates.map((c, i) => c - v2.coordinates[i]);

        return new Vector(coords);
    }

    static scale(vector: Vector, scaler: number): Vector {
        const scaledCoordinates = vector.coordinates.map(
            (coordinate) => coordinate * scaler,
        );

        return new Vector(scaledCoordinates);
    }

    static dot(vec1: Vector, vec2: Vector): number {
        this._compatibilityCheck(vec1, vec2);
        const sum = vec1.coordinates.reduce(
            (partialSum, coord, index) =>
                partialSum + coord * vec2.coordinates[index],
            0,
        );
        return sum;
    }

    // this Generalized cross product was created using AI as I was not aware of the Generalized cross product and its nuances , though this reduces to 2d and 3d cross products that are well known to me  and are only ones that are going to be used at least for now.
    static bivector(vec1: Vector, vec2: Vector): number[][] {
        this._compatibilityCheck(vec1, vec2);
        const n = vec1.size;
        const biv = Array.from({ length: n }, () => new Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                biv[i][j] =
                    vec1.coordinates[i] * vec2.coordinates[j] -
                    vec1.coordinates[j] * vec2.coordinates[i];
                biv[j][i] = -biv[i][j];
            }
        }
        return biv;
    }

    static concatVectors(vectors: Vector[]): Vector {
        const concatCoordinates: number[] = [];
        for (let vector of vectors) {
            concatCoordinates.push(...vector.coordinates);
        }
        return new Vector(concatCoordinates);
    }

    static distanceMagnitude(vec1: Vector, vec2: Vector): number {
        this._compatibilityCheck(vec1, vec2);
        // SUM (v_i - w_i)^2 : i = [x,y,z]
        const sqDis = vec1.coordinates.reduce(
            (sqDiff, coord, index) =>
                sqDiff + (coord - vec2.coordinates[index]) ** 2,
            0,
        );

        // sqrt(SUM (v_i - w_i)^2) = distance
        return Math.sqrt(sqDis);
    }

    static distanceVector(vec1: Vector, vec2: Vector): Vector {
        this._compatibilityCheck(vec1, vec2);
        const coords = vec1.coordinates.map(
            (coord, index) => coord - vec2.coordinates[index],
        );
        return new Vector(coords);
    }
}
