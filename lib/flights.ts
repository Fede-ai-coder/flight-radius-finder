import { Airport } from "@/data/airports";

export type MockFlight = {
  id: string;
  fromCode: string;
  fromCity: string;
  to: string;
  date: string;
  airline: string;
  priceUsd: number;
  durationHours: number;
};

const AIRLINES = ["SkyWays", "CloudJet", "NorthStar Air", "AeroNova"];

export function buildMockFlights(airports: (Airport & { distanceKm: number })[], destination: string, date: string): MockFlight[] {
  return airports.flatMap((airport, index) => {
    const count = airport.distanceKm < 120 ? 2 : 1;

    return Array.from({ length: count }).map((_, flightIndex) => {
      const seed = index * 13 + flightIndex * 7;
      return {
        id: `${airport.code}-${seed}`,
        fromCode: airport.code,
        fromCity: airport.city,
        to: destination.toUpperCase(),
        date,
        airline: AIRLINES[(seed + destination.length) % AIRLINES.length],
        priceUsd: 120 + ((seed + destination.length * 5) % 250),
        durationHours: Number((2 + ((seed % 14) / 2)).toFixed(1)),
      };
    });
  });
}
