import { Airport } from "@/data/airports";

const EARTH_RADIUS_KM = 6371;

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
