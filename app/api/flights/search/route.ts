import { NextResponse } from "next/server";
import { duffelFlightProvider } from "@/lib/flightProviders/duffelProvider";
import { mockFlightProvider } from "@/lib/flightProviders/mockProvider";
import type { FlightProvider, FlightResult } from "@/lib/flightProviders/types";

const DEFAULT_ADULTS = 1;
const DEFAULT_MAX_RESULTS = 5;

type FlightSearchBody = {
  origins?: unknown;
  destination?: unknown;
  destinations?: unknown;
  date?: unknown;
  adults?: unknown;
  maxResults?: unknown;
  nonStop?: unknown;
};

type OriginSummary = {
  origin: string;
  resultCount: number;
  cheapestPrice: number | null;
  currency: string | null;
  status: "found" | "empty" | "error";
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function getDestinationCodes(body: FlightSearchBody): string[] {
  const destinationList = normalizeStringArray(body.destinations);
  if (destinationList.length > 0) return destinationList;

  return typeof body.destination === "string" && body.destination.trim()
    ? [body.destination.trim().toUpperCase()]
    : [];
}

function getConfiguredProvider(): FlightProvider {
  if (process.env.FLIGHT_PROVIDER === "duffel" && process.env.DUFFEL_ACCESS_TOKEN) return duffelFlightProvider;
  return mockFlightProvider;
}

function buildOriginSummaries(origins: string[], resultsByOrigin: Record<string, FlightResult[]>, errors = new Set<string>()): OriginSummary[] {
  return origins.map((origin) => {
    const originFlights = resultsByOrigin[origin] ?? [];
    const cheapest = originFlights[0];
    return {
      origin,
      resultCount: originFlights.length,
      cheapestPrice: cheapest?.price ?? null,
      currency: cheapest?.currency ?? null,
      status: errors.has(origin) ? "error" : originFlights.length > 0 ? "found" : "empty",
    };
  });
}

async function searchOrigins(provider: FlightProvider, origins: string[], destinations: string[], date: string, adults: number, maxResults: number, nonStop?: boolean) {
  const searchPairs = origins.flatMap((origin) => destinations.map((destination) => ({ origin, destination })));
  const settled = await Promise.allSettled(
    searchPairs.map(async ({ origin, destination }) => ({
      origin,
      flights: await provider.searchFlights({ origin, destination, date, adults, maxResults, nonStop }),
    })),
  );

  const resultsByOrigin: Record<string, FlightResult[]> = Object.fromEntries(origins.map((origin) => [origin, []]));
  const errors = new Set<string>();

  settled.forEach((result, index) => {
    const { origin } = searchPairs[index];
    if (result.status === "fulfilled") {
      resultsByOrigin[origin].push(...result.value.flights);
    } else {
      errors.add(origin);
    }
  });

  for (const origin of origins) {
    resultsByOrigin[origin] = resultsByOrigin[origin].sort((a, b) => a.price - b.price).slice(0, maxResults);
  }

  return { resultsByOrigin, errors };
}

export async function POST(request: Request) {
  let body: FlightSearchBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const origins = normalizeStringArray(body.origins);
  const destinations = getDestinationCodes(body);
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const adults = typeof body.adults === "number" && body.adults > 0 ? Math.floor(body.adults) : DEFAULT_ADULTS;
  const maxResults = typeof body.maxResults === "number" && body.maxResults > 0 ? Math.floor(body.maxResults) : DEFAULT_MAX_RESULTS;
  const nonStop = typeof body.nonStop === "boolean" ? body.nonStop : undefined;

  if (origins.length === 0 || destinations.length === 0 || !date) {
    return NextResponse.json({ error: "origins, destination/destinations and date are required" }, { status: 400 });
  }

  const provider = getConfiguredProvider();
  const { resultsByOrigin, errors } = await searchOrigins(provider, origins, destinations, date, adults, maxResults, nonStop);
  const flights = Object.values(resultsByOrigin).flat().sort((a, b) => a.price - b.price);

  if (flights.length === 0 && provider !== mockFlightProvider) {
    const fallback = await searchOrigins(mockFlightProvider, origins, destinations, date, adults, maxResults, nonStop);
    const fallbackFlights = Object.values(fallback.resultsByOrigin).flat().sort((a, b) => a.price - b.price);

    return NextResponse.json({
      flights: fallbackFlights,
      originSummaries: buildOriginSummaries(origins, fallback.resultsByOrigin, fallback.errors),
      source: "mock-fallback",
    });
  }

  return NextResponse.json({
    flights,
    originSummaries: buildOriginSummaries(origins, resultsByOrigin, errors),
    source: provider === duffelFlightProvider ? "duffel" : "mock",
  });
}
