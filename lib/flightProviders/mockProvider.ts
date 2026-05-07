import { AIRPORTS } from "@/data/airports";
import type { FlightProvider, FlightResult, FlightSearchRequest } from "./types";

const AIRLINES = ["SkyWays", "CloudJet", "NorthStar Air", "AeroNova"];

function padTime(hours: number, minutes: number) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addHoursToTime(startHour: number, startMinute: number, durationHours: number) {
  const totalMinutes = startHour * 60 + startMinute + Math.round(durationHours * 60);
  const arrivalHour = Math.floor((totalMinutes / 60) % 24);
  const arrivalMinute = totalMinutes % 60;
  return padTime(arrivalHour, arrivalMinute);
}

export const mockFlightProvider: FlightProvider = {
  async searchFlights({ origin, destination, date, maxResults, nonStop }: FlightSearchRequest): Promise<FlightResult[]> {
    const originCode = origin.trim().toUpperCase();
    const destinationCode = destination.trim().toUpperCase();
    const airport = AIRPORTS.find((item) => item.code === originCode);

    if (!airport || !destinationCode || !date) return [];

    const generatedCount = Math.max(1, Math.min(maxResults, 3));

    return Array.from({ length: generatedCount })
      .map((_, flightIndex) => {
        const seed = originCode.charCodeAt(0) + originCode.charCodeAt(1) + originCode.charCodeAt(2) + destinationCode.length * 11 + flightIndex * 7;
        const stops = nonStop ? 0 : seed % 3;
        const durationHours = Number((2 + ((seed % 14) / 2) + stops * 1.25).toFixed(1));
        const departureHour = 6 + ((seed + flightIndex * 3) % 15);
        const departureMinute = (seed * 7) % 60;
        const price = 90 + ((seed + destinationCode.length * 17 + stops * 23) % 260);

        return {
          id: `mock-${originCode}-${destinationCode}-${date}-${flightIndex}`,
          fromCode: originCode,
          fromCity: airport.city,
          to: destinationCode,
          date,
          airline: AIRLINES[(seed + flightIndex) % AIRLINES.length],
          departureTime: padTime(departureHour, departureMinute),
          arrivalTime: addHoursToTime(departureHour, departureMinute, durationHours),
          duration: `${durationHours}h`,
          stops,
          price,
          currency: "USD",
          source: "mock",
        } satisfies FlightResult;
      })
      .sort((a, b) => a.price - b.price);
  },
};
