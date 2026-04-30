import {
    calculateBearing,
    calculateShapeSegmentLength,
    createShapesMap,
    distanceSquared,
    findClosestShapeIndex,
    interpolateAlongShape,
    interpolatePosition,
    type ShapePoint,
} from './vehicle-interpolation';

describe('vehicle-interpolation', () => {
    it('interpolates a straight line position', () => {
        expect(interpolatePosition({ lat: 0, lon: 0 }, { lat: 10, lon: 20 }, 0.25)).toEqual({
            lat: 2.5,
            lon: 5,
        });
    });

    it('calculates squared distance', () => {
        expect(distanceSquared(0, 0, 3, 4)).toBe(25);
    });

    it('calculates cardinal bearings', () => {
        expect(calculateBearing({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(0);
        expect(calculateBearing({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(90);
    });

    it('finds the closest shape point', () => {
        const shape: ShapePoint[] = [[0, 0], [1, 1], [2, 2], [3, 3]];
        expect(findClosestShapeIndex(shape, 2.1, 2.1)).toBe(2);
    });

    it('calculates shape segment length', () => {
        const shape: ShapePoint[] = [[0, 0], [3, 4], [6, 8]];
        expect(calculateShapeSegmentLength(shape, 0, 2)).toBe(10);
        expect(calculateShapeSegmentLength(shape, 2, 0)).toBe(10);
    });

    it('falls back to straight-line interpolation when no shape exists', () => {
        const result = interpolateAlongShape(
            { lat: 0, lon: 0 },
            { lat: 10, lon: 0 },
            0.5,
            1,
            createShapesMap({})
        );

        expect(result.lat).toBe(5);
        expect(result.lon).toBe(0);
        expect(result.bearing).toBeCloseTo(0);
    });

    it('interpolates along the configured shape', () => {
        const shapes = createShapesMap({
            '0': [[0, 0], [0, 5], [0, 10]],
        });

        const result = interpolateAlongShape(
            { lat: 0, lon: 0 },
            { lat: 0, lon: 10 },
            0.6,
            0,
            shapes
        );

        expect(result.lat).toBeCloseTo(0);
        expect(result.lon).toBeCloseTo(6);
        expect(result.bearing).toBeCloseTo(90);
    });
});
