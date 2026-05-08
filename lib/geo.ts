import { Airport } from "@/data/airports";

const EARTH_RADIUS_KM = 6371;

export type Coordinate = [number, number];

export function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const degToRad = (value: number) => (value * Math.PI) / 180;
  const dLat = degToRad(toLat - fromLat);
  const dLng = degToRad(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(fromLat)) * Math.cos(degToRad(toLat)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function airportsWithinRadius(airports: Airport[], centerLat: number, centerLng: number, radiusKm: number) {
  return airports
    .map((airport) => ({
      ...airport,
      distanceKm: distanceKm(centerLat, centerLng, airport.lat, airport.lng),
    }))
    .filter((airport) => airport.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  if (polygon.length < 3) return false;

  const [pointLat, pointLng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersects = lngI > pointLng !== lngJ > pointLng && pointLat < ((latJ - latI) * (pointLng - lngI)) / (lngJ - lngI) + latI;

    if (intersects) inside = !inside;
  }

  return inside;
}

export function airportsWithinPolygon(airports: Airport[], polygon: Coordinate[]) {
  if (polygon.length < 3) return [];

  const centerLat = polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length;
  const centerLng = polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length;

  return airports
    .map((airport) => ({
      ...airport,
      distanceKm: distanceKm(centerLat, centerLng, airport.lat, airport.lng),
    }))
    .filter((airport) => isPointInPolygon([airport.lat, airport.lng], polygon))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
