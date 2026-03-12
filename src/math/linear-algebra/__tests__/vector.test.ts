import { expect, test, describe } from "bun:test";
import { Vector } from "../vector";

describe("Vector.distanceVector", () => {
    test("calculates distance vector correctly for 2D vectors", () => {
        const v1 = new Vector([5, 10]);
        const v2 = new Vector([2, 4]);
        const result = Vector.distanceVector(v1, v2);
        expect(result.coordinates).toEqual([3, 6]);
    });

    test("calculates distance vector correctly for 3D vectors", () => {
        const v1 = new Vector([10, 20, 30]);
        const v2 = new Vector([1, 2, 3]);
        const result = Vector.distanceVector(v1, v2);
        expect(result.coordinates).toEqual([9, 18, 27]);
    });

    test("handles negative coordinates", () => {
        const v1 = new Vector([-1, -2]);
        const v2 = new Vector([1, 2]);
        const result = Vector.distanceVector(v1, v2);
        expect(result.coordinates).toEqual([-2, -4]);
    });

    test("handles zero vectors", () => {
        const v1 = new Vector([0, 0]);
        const v2 = new Vector([0, 0]);
        const result = Vector.distanceVector(v1, v2);
        expect(result.coordinates).toEqual([0, 0]);
    });

    test("handles distance to zero vector", () => {
        const v1 = new Vector([5, 5]);
        const v2 = new Vector([0, 0]);
        const result = Vector.distanceVector(v1, v2);
        expect(result.coordinates).toEqual([5, 5]);
    });

    test("throws error for incompatible vector sizes", () => {
        const v1 = new Vector([1, 2]);
        const v2 = new Vector([1, 2, 3]);
        expect(() => Vector.distanceVector(v1, v2)).toThrow(/Invalid Vector sizes/);
    });
});
