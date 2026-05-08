import { NextResponse } from "next/server";
import { duffelFlightProvider } from "@/lib/flightProviders/duffelProvider";
import { mockFlightProvider } from "@/lib/flightProviders/mockProvider";
import type { FlightProvider, FlightResult } from "@/lib/flightProviders/types";

const DEFAULT_ADULTS = 1;
const DEFAULT_MAX_RESULTS = 5;
const MAX_SEARCH_COMBINATIONS = 30;
const MAX_DATE_RANGE_DAYS = 14;

type FlightSearchBody = {
  origins?: unknown;
  destination?: unknown;
  destinations?: unknown;
  date?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
  dates?: unknown;
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
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toUpperCase()).filter(Boolean);
}

function normalizeDate(value: unknown): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : "";
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function enumerateDateRange(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < MAX_DATE_RANGE_DAYS) {
    dates.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function getSearchDates(body: FlightSearchBody): { dates: string[]; wasDateRangeLimited: boolean; requestedDateCount: number } {
  const explicitDates = Array.isArray(body.dates)
    ? Array.from(new Set(body.dates.map(normalizeDate).filter(Boolean)))
    : [];
  if (explicitDates.length > 0) {
    return {
      dates: explicitDates.slice(0, MAX_DATE_RANGE_DAYS),
      wasDateRangeLimited: explicitDates.length > MAX_DATE_RANGE_DAYS,
      requestedDateCount: explicitDates.length,
    };
  }

  const fallbackDate = normalizeDate(body.date);
  const dateFrom = normalizeDate(body.dateFrom) || fallbackDate;
  const dateTo = normalizeDate(body.dateTo) || dateFrom;
  const allDates = dateFrom && dateTo ? enumerateDateRange(dateFrom, dateTo) : [];
  if (!dateFrom || !dateTo || allDates.length === 0) return { dates: [], wasDateRangeLimited: false, requestedDateCount: 0 };

  const requestedDateCount = Math.floor((new Date(`${dateTo}T00:00:00.000Z`).getTime() - new Date(`${dateFrom}T00:00:00.000Z`).getTime()) / 86400000) + 1;
  return { dates: allDates, wasDateRangeLimited: requestedDateCount > MAX_DATE_RANGE_DAYS, requestedDateCount };
}

function getDestinationCodes(body: FlightSearchBody): string[] {
  const destinationList = normalizeStringArray(body.destinations);
  if (destinationList.length > 0) return destinationList;
  return typeof body.destination === "string" && body.destination.trim() ? [body.destination.trim().toUpperCase()] : [];
}

function limitOriginsForCombinationCap(origins: string[], destinationCount: number, dateCount: number): string[] {
  if (destinationCount <= 0 || dateCount <= 0) return [];
  const maxOrigins = Math.max(1, Math.floor(MAX_SEARCH_COMBINATIONS / (destinationCount * dateCount)));
  return origins.slice(0, maxOrigins);
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

async function searchOrigins(provider: FlightProvider, origins: string[], destinations: string[], dates: string[], adults: number, maxResults: number, nonStop?: boolean) {
  const searchPairs = origins.flatMap((origin) => destinations.flatMap((destination) => dates.map((date) => ({ origin, destination, date }))));
  const settled = await Promise.allSettled(searchPairs.map(async ({ origin, destination, date }) => ({
    origin,
    flights: await provider.searchFlights({ origin, destination, date, adults, maxResults, nonStop }),
  })));

  const resultsByOrigin: Record<string, FlightResult[]> = Object.fromEntries(origins.map((origin) => [origin, []]));
  const errors = new Set<string>();

  settled.forEach((result, index) => {
    const { origin } = searchPairs[index];
    if (result.status === "fulfilled") resultsByOrigin[origin].push(...result.value.flights);
    else errors.add(origin);
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

  const requestedOrigins = normalizeStringArray(body.origins);
  const destinations = getDestinationCodes(body);
  const { dates, wasDateRangeLimited, requestedDateCount } = getSearchDates(body);
  const adults = typeof body.adults === "number" && body.adults > 0 ? Math.floor(body.adults) : DEFAULT_ADULTS;
  const maxResults = typeof body.maxResults === "number" && body.maxResults > 0 ? Math.floor(body.maxResults) : DEFAULT_MAX_RESULTS;
  const nonStop = typeof body.nonStop === "boolean" ? body.nonStop : undefined;

  if (requestedOrigins.length === 0 || destinations.length === 0 || dates.length === 0) {
    return NextResponse.json({ error: "origins, destination/destinations and date/dateFrom/dateTo are required" }, { status: 400 });
  }

  const origins = limitOriginsForCombinationCap(requestedOrigins, destinations.length, dates.length);
  const searchMeta = {
    requestedOriginCount: requestedOrigins.length,
    searchedOriginCount: origins.length,
    destinationCount: destinations.length,
    requestedDateCount,
    searchedDateCount: dates.length,
    requestedCombinations: requestedOrigins.length * destinations.length * requestedDateCount,
    searchedCombinations: origins.length * destinations.length * dates.length,
    maxCombinations: MAX_SEARCH_COMBINATIONS,
    maxDateRangeDays: MAX_DATE_RANGE_DAYS,
    wasDateRangeLimited,
    wasLimited: origins.length < requestedOrigins.length || wasDateRangeLimited,
  };

  const provider = getConfiguredProvider();
  const { resultsByOrigin, errors } = await searchOrigins(provider, origins, destinations, dates, adults, maxResults, nonStop);
  const flights = Object.values(resultsByOrigin).flat().sort((a, b) => a.price - b.price);

  if (flights.length === 0 && provider !== mockFlightProvider) {
    const fallback = await searchOrigins(mockFlightProvider, origins, destinations, dates, adults, maxResults, nonStop);
    const fallbackFlights = Object.values(fallback.resultsByOrigin).flat().sort((a, b) => a.price - b.price);
    return NextResponse.json({ flights: fallbackFlights, originSummaries: buildOriginSummaries(origins, fallback.resultsByOrigin, fallback.errors), searchMeta, source: "mock-fallback" });
  }

  return NextResponse.json({ flights, originSummaries: buildOriginSummaries(origins, resultsByOrigin, errors), searchMeta, source: provider === duffelFlightProvider ? "duffel" : "mock" });
}
