export interface GeoPoint {
    lat: number;
    lon: number;
}

export type ShapePoint = readonly [number, number];

export function createShapesMap(shapesData: Record<string, ShapePoint[]>): Map<string, ShapePoint[]> {
    return new Map(Object.entries(shapesData));
}

function shapePointToGeo(point: ShapePoint): GeoPoint {
    const [lat, lon] = point;
    return { lat, lon };
}

function getShapePoint(shape: ShapePoint[], index: number): ShapePoint | undefined {
    return shape.at(index);
}

/**
 * Interpolate position between two stops based on progress (fallback - straight line)
 */
export function interpolatePosition(prevStop: GeoPoint, nextStop: GeoPoint, progress: number): GeoPoint {
    return {
        lat: prevStop.lat + (nextStop.lat - prevStop.lat) * progress,
        lon: prevStop.lon + (nextStop.lon - prevStop.lon) * progress,
    };
}

/**
 * Calculate squared distance between two points (faster than actual distance for comparisons)
 */
export function distanceSquared(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    return dLat * dLat + dLon * dLon;
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(from: GeoPoint, to: GeoPoint): number {
    const toRad = Math.PI / 180;
    const dLon = (to.lon - from.lon) * toRad;
    const lat1 = from.lat * toRad;
    const lat2 = to.lat * toRad;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

/**
 * Find the index of the closest point on the shape to a given stop.
 * Uses sampling for performance (check every Nth point, then refine).
 */
export function findClosestShapeIndex(shape: ShapePoint[], lat: number, lon: number): number {
    if (shape.length === 0) return 0;

    let bestIdx = 0;
    let bestDist = Infinity;
    const step = 20;

    for (let i = 0; i < shape.length; i += step) {
        const point = getShapePoint(shape, i);
        if (!point) continue;
        const [pointLat, pointLon] = point;
        const dist = distanceSquared(lat, lon, pointLat, pointLon);
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
        }
    }

    const searchStart = Math.max(0, bestIdx - step);
    const searchEnd = Math.min(shape.length - 1, bestIdx + step);

    for (let i = searchStart; i <= searchEnd; i++) {
        const point = getShapePoint(shape, i);
        if (!point) continue;
        const [pointLat, pointLon] = point;
        const dist = distanceSquared(lat, lon, pointLat, pointLon);
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
        }
    }

    return bestIdx;
}

/**
 * Calculate cumulative distances along shape segment
 */
export function calculateShapeSegmentLength(shape: ShapePoint[], startIdx: number, endIdx: number): number {
    let length = 0;
    const start = Math.min(startIdx, endIdx);
    const end = Math.max(startIdx, endIdx);

    for (let i = start; i < end; i++) {
        const currentPoint = getShapePoint(shape, i);
        const nextPoint = getShapePoint(shape, i + 1);
        if (!currentPoint || !nextPoint) continue;

        const [currentLat, currentLon] = currentPoint;
        const [nextLat, nextLon] = nextPoint;
        length += Math.sqrt(distanceSquared(currentLat, currentLon, nextLat, nextLon));
    }

    return length;
}

/**
 * Interpolate position along the shape path between two stops.
 * This ensures the bus follows the actual route instead of cutting corners.
 */
export function interpolateAlongShape(
    prevStop: GeoPoint,
    nextStop: GeoPoint,
    progress: number,
    direction: number,
    shapes: Map<string, ShapePoint[]>
): GeoPoint & { bearing: number } {
    const shape = shapes.get(String(direction));

    if (!shape || shape.length < 2) {
        const pos = interpolatePosition(prevStop, nextStop, progress);
        return {
            ...pos,
            bearing: calculateBearing(prevStop, nextStop),
        };
    }

    const prevIdx = findClosestShapeIndex(shape, prevStop.lat, prevStop.lon);
    const nextIdx = findClosestShapeIndex(shape, nextStop.lat, nextStop.lon);
    const previousShapePoint = getShapePoint(shape, prevIdx);

    if (!previousShapePoint) {
        const pos = interpolatePosition(prevStop, nextStop, progress);
        return {
            ...pos,
            bearing: calculateBearing(prevStop, nextStop),
        };
    }

    if (prevIdx === nextIdx) {
        return {
            ...shapePointToGeo(previousShapePoint),
            bearing: calculateBearing(prevStop, nextStop),
        };
    }

    const shapeStart = Math.min(prevIdx, nextIdx);
    const shapeEnd = Math.max(prevIdx, nextIdx);
    const isReversed = prevIdx > nextIdx;

    const totalLength = calculateShapeSegmentLength(shape, shapeStart, shapeEnd);
    if (totalLength === 0) {
        return {
            ...shapePointToGeo(previousShapePoint),
            bearing: calculateBearing(prevStop, nextStop),
        };
    }

    const targetDistance = totalLength * progress;
    let accumulatedLength = 0;

    const walkStart = isReversed ? shapeEnd : shapeStart;
    const walkDirection = isReversed ? -1 : 1;
    const walkEnd = isReversed ? shapeStart : shapeEnd;

    let currentIdx = walkStart;
    while (walkDirection > 0 ? currentIdx < walkEnd : currentIdx > walkEnd) {
        const nextPointIdx = currentIdx + walkDirection;
        const currentPoint = getShapePoint(shape, currentIdx);
        const nextPoint = getShapePoint(shape, nextPointIdx);
        if (!currentPoint || !nextPoint) break;

        const [currentLat, currentLon] = currentPoint;
        const [nextLat, nextLon] = nextPoint;
        const segmentLength = Math.sqrt(distanceSquared(currentLat, currentLon, nextLat, nextLon));

        if (accumulatedLength + segmentLength >= targetDistance) {
            const remainingDistance = targetDistance - accumulatedLength;
            const segmentProgress = segmentLength > 0 ? remainingDistance / segmentLength : 0;

            return {
                lat: currentLat + (nextLat - currentLat) * segmentProgress,
                lon: currentLon + (nextLon - currentLon) * segmentProgress,
                bearing: calculateBearing(
                    { lat: currentLat, lon: currentLon },
                    { lat: nextLat, lon: nextLon }
                ),
            };
        }

        accumulatedLength += segmentLength;
        currentIdx = nextPointIdx;
    }

    const endPoint = getShapePoint(shape, walkEnd);
    if (!endPoint) {
        const pos = interpolatePosition(prevStop, nextStop, progress);
        return {
            ...pos,
            bearing: calculateBearing(prevStop, nextStop),
        };
    }

    return {
        ...shapePointToGeo(endPoint),
        bearing: calculateBearing(prevStop, nextStop),
    };
}
