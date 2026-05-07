import { NextResponse } from "next/server";
import { duffelFlightProvider } from "@/lib/flightProviders/duffelProvider";
import { mockFlightProvider } from "@/lib/flightProviders/mockProvider";
import type { FlightProvider } from "@/lib/flightProviders/types";

const DEFAULT_ADULTS = 1;
const DEFAULT_MAX_RESULTS = 5;

type FlightSearchBody = {
  origins?: unknown;
  destination?: unknown;
  date?: unknown;
  adults?: unknown;
  maxResults?: unknown;
  nonStop?: unknown;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function getConfiguredProvider(): FlightProvider {
  if (process.env.FLIGHT_PROVIDER === "duffel" && process.env.DUFFEL_ACCESS_TOKEN) {
    return duffelFlightProvider;
  }

  return mockFlightProvider;
}

export async function POST(request: Request) {
  let body: FlightSearchBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const origins = normalizeStringArray(body.origins);
  const destination = typeof body.destination === "string" ? body.destination.trim().toUpperCase() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const adults = typeof body.adults === "number" && body.adults > 0 ? Math.floor(body.adults) : DEFAULT_ADULTS;
  const maxResults = typeof body.maxResults === "number" && body.maxResults > 0 ? Math.floor(body.maxResults) : DEFAULT_MAX_RESULTS;
  const nonStop = typeof body.nonStop === "boolean" ? body.nonStop : undefined;

  if (origins.length === 0 || !destination || !date) {
    return NextResponse.json(
      { error: "origins, destination and date are required" },
      { status: 400 },
    );
  }

  const provider = getConfiguredProvider();

  const results = await Promise.allSettled(
    origins.map((origin) =>
      provider.searchFlights({
        origin,
        destination,
        date,
        adults,
        maxResults,
        nonStop,
      }),
    ),
  );

  const flights = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => a.price - b.price)
    .slice(0, maxResults * origins.length);

  if (flights.length === 0 && provider !== mockFlightProvider) {
    const fallbackResults = await Promise.all(
      origins.map((origin) =>
        mockFlightProvider.searchFlights({
          origin,
          destination,
          date,
          adults,
          maxResults,
          nonStop,
        }),
      ),
    );

    return NextResponse.json({
      flights: fallbackResults
        .flat()
        .sort((a, b) => a.price - b.price)
        .slice(0, maxResults * origins.length),
      source: "mock-fallback",
    });
  }

  return NextResponse.json({
    flights,
    source: provider === duffelFlightProvider ? "duffel" : "mock",
  });
}
