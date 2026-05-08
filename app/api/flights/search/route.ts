import { NextResponse } from "next/server";
import { duffelFlightProvider } from "@/lib/flightProviders/duffelProvider";
import { mockFlightProvider } from "@/lib/flightProviders/mockProvider";
import type { FlightProvider, FlightResult } from "@/lib/flightProviders/types";

const DEFAULT_ADULTS = 1;
const DEFAULT_MAX_RESULTS = 5;
const MAX_SEARCH_COMBINATIONS = 200;
const MAX_DATE_RANGE_DAYS = 14;

type FlightSearchBody = {
  origins?: unknown;
  destination?: unknown;
  destinations?: unknown;
  date?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
  returnDateFrom?: unknown;
  returnDateTo?: unknown;
  dates?: unknown;
  returnDates?: unknown;
  tripType?: unknown;
  adults?: unknown;
  maxResults?: unknown;
  nonStop?: unknown;
};

type OriginSummaryStatus = "found" | "partial" | "empty" | "error";
type OriginSummary = { origin: string; resultCount: number; cheapestPrice: number | null; currency: string | null; status: OriginSummaryStatus };

type SearchLeg = {
  origins: string[];
  destinations: string[];
  dates: string[];
  requestedOrigins: string[];
  requestedDateCount: number;
  wasDateRangeLimited: boolean;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toUpperCase()).filter(Boolean);
}

function normalizeDate(value: unknown): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : "";
}

function formatDate(date: Date): string { return date.toISOString().split("T")[0]; }

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

function buildExternalFlightSearchUrl(flight: FlightResult) {
  const query = encodeURIComponent(`${flight.fromCode} to ${flight.to} ${flight.date} flight`);
  return `https://www.google.com/travel/flights?q=${query}`;
}

function ensureBookingUrls(flights: FlightResult[]) {
  return flights.map((flight) => ({
    ...flight,
    bookingUrl: flight.bookingUrl || buildExternalFlightSearchUrl(flight),
  }));
}

function getSearchDates(body: FlightSearchBody, fromKey: "outbound" | "return" = "outbound"): { dates: string[]; wasDateRangeLimited: boolean; requestedDateCount: number } {
  const explicitValue = fromKey === "return" ? body.returnDates : body.dates;
  const explicitDates = Array.isArray(explicitValue) ? Array.from(new Set(explicitValue.map(normalizeDate).filter(Boolean))) : [];
  if (explicitDates.length > 0) return { dates: explicitDates.slice(0, MAX_DATE_RANGE_DAYS), wasDateRangeLimited: explicitDates.length > MAX_DATE_RANGE_DAYS, requestedDateCount: explicitDates.length };

  const fallbackDate = normalizeDate(body.date);
  const dateFrom = fromKey === "return" ? normalizeDate(body.returnDateFrom) : (normalizeDate(body.dateFrom) || fallbackDate);
  const dateTo = fromKey === "return" ? (normalizeDate(body.returnDateTo) || dateFrom) : (normalizeDate(body.dateTo) || dateFrom);
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
    const hasError = errors.has(origin);
    let status: OriginSummaryStatus = "empty";
    if (originFlights.length > 0 && hasError) status = "partial";
    else if (originFlights.length > 0) status = "found";
    else if (hasError) status = "error";
    return { origin, resultCount: originFlights.length, cheapestPrice: cheapest?.price ?? null, currency: cheapest?.currency ?? null, status };
  });
}

async function searchOrigins(provider: FlightProvider, origins: string[], destinations: string[], dates: string[], adults: number, maxResults: number, nonStop?: boolean) {
  const searchPairs = origins.flatMap((origin) => destinations.flatMap((destination) => dates.map((date) => ({ origin, destination, date }))));
  const settled = await Promise.allSettled(searchPairs.map(async ({ origin, destination, date }) => ({ origin, flights: await provider.searchFlights({ origin, destination, date, adults, maxResults, nonStop }) })));
  const resultsByOrigin: Record<string, FlightResult[]> = Object.fromEntries(origins.map((origin) => [origin, []]));
  const errors = new Set<string>();
  settled.forEach((result, index) => {
    const { origin } = searchPairs[index];
    if (result.status === "fulfilled") resultsByOrigin[origin].push(...result.value.flights);
    else errors.add(origin);
  });
  for (const origin of origins) resultsByOrigin[origin] = ensureBookingUrls(resultsByOrigin[origin].sort((a, b) => a.price - b.price).slice(0, maxResults));
  return { resultsByOrigin, errors };
}

function buildSearchMeta(leg: SearchLeg) {
  return {
    requestedOriginCount: leg.requestedOrigins.length,
    searchedOriginCount: leg.origins.length,
    destinationCount: leg.destinations.length,
    requestedDateCount: leg.requestedDateCount,
    searchedDateCount: leg.dates.length,
    requestedCombinations: leg.requestedOrigins.length * leg.destinations.length * leg.requestedDateCount,
    searchedCombinations: leg.origins.length * leg.destinations.length * leg.dates.length,
    maxCombinations: MAX_SEARCH_COMBINATIONS,
    maxDateRangeDays: MAX_DATE_RANGE_DAYS,
    wasDateRangeLimited: leg.wasDateRangeLimited,
    wasLimited: leg.origins.length < leg.requestedOrigins.length || leg.wasDateRangeLimited,
  };
}

async function runLeg(provider: FlightProvider, leg: SearchLeg, adults: number, maxResults: number, nonStop?: boolean) {
  const { resultsByOrigin, errors } = await searchOrigins(provider, leg.origins, leg.destinations, leg.dates, adults, maxResults, nonStop);
  const flights = Object.values(resultsByOrigin).flat().sort((a, b) => a.price - b.price);
  return { flights, originSummaries: buildOriginSummaries(leg.origins, resultsByOrigin, errors), searchMeta: buildSearchMeta(leg) };
}

export async function POST(request: Request) {
  let body: FlightSearchBody;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const requestedOrigins = normalizeStringArray(body.origins);
  const destinations = getDestinationCodes(body);
  const outboundDates = getSearchDates(body, "outbound");
  const tripType = body.tripType === "roundTrip" ? "roundTrip" : "oneWay";
  const adults = typeof body.adults === "number" && body.adults > 0 ? Math.floor(body.adults) : DEFAULT_ADULTS;
  const maxResults = typeof body.maxResults === "number" && body.maxResults > 0 ? Math.floor(body.maxResults) : DEFAULT_MAX_RESULTS;
  const nonStop = typeof body.nonStop === "boolean" ? body.nonStop : undefined;

  if (requestedOrigins.length === 0 || destinations.length === 0 || outboundDates.dates.length === 0) return NextResponse.json({ error: "origins, destination/destinations and date/dateFrom/dateTo are required" }, { status: 400 });

  const outboundOrigins = limitOriginsForCombinationCap(requestedOrigins, destinations.length, outboundDates.dates.length);
  const outboundLeg: SearchLeg = { origins: outboundOrigins, destinations, dates: outboundDates.dates, requestedOrigins, requestedDateCount: outboundDates.requestedDateCount, wasDateRangeLimited: outboundDates.wasDateRangeLimited };
  const provider = getConfiguredProvider();
  const outbound = await runLeg(provider, outboundLeg, adults, maxResults, nonStop);

  let returnLegResponse = null;
  if (tripType === "roundTrip") {
    const returnDates = getSearchDates(body, "return");
    if (returnDates.dates.length === 0) return NextResponse.json({ error: "returnDateFrom/returnDateTo are required for roundTrip" }, { status: 400 });
    const returnOrigins = limitOriginsForCombinationCap(destinations, requestedOrigins.length, returnDates.dates.length);
    const returnLeg: SearchLeg = { origins: returnOrigins, destinations: requestedOrigins, dates: returnDates.dates, requestedOrigins: destinations, requestedDateCount: returnDates.requestedDateCount, wasDateRangeLimited: returnDates.wasDateRangeLimited };
    returnLegResponse = await runLeg(provider, returnLeg, adults, maxResults, nonStop);
  }

  const allFlights = [...outbound.flights, ...(returnLegResponse?.flights ?? [])];
  if (allFlights.length === 0 && provider !== mockFlightProvider) {
    const fallbackOutbound = await runLeg(mockFlightProvider, outboundLeg, adults, maxResults, nonStop);
    let fallbackReturn = null;
    if (tripType === "roundTrip") {
      const returnDates = getSearchDates(body, "return");
      const returnOrigins = limitOriginsForCombinationCap(destinations, requestedOrigins.length, returnDates.dates.length);
      fallbackReturn = await runLeg(mockFlightProvider, { origins: returnOrigins, destinations: requestedOrigins, dates: returnDates.dates, requestedOrigins: destinations, requestedDateCount: returnDates.requestedDateCount, wasDateRangeLimited: returnDates.wasDateRangeLimited }, adults, maxResults, nonStop);
    }
    return NextResponse.json({ flights: fallbackOutbound.flights, outboundFlights: fallbackOutbound.flights, returnFlights: fallbackReturn?.flights ?? [], originSummaries: fallbackOutbound.originSummaries, returnOriginSummaries: fallbackReturn?.originSummaries ?? [], searchMeta: fallbackOutbound.searchMeta, returnSearchMeta: fallbackReturn?.searchMeta ?? null, tripType, source: "mock-fallback" });
  }

  return NextResponse.json({ flights: outbound.flights, outboundFlights: outbound.flights, returnFlights: returnLegResponse?.flights ?? [], originSummaries: outbound.originSummaries, returnOriginSummaries: returnLegResponse?.originSummaries ?? [], searchMeta: outbound.searchMeta, returnSearchMeta: returnLegResponse?.searchMeta ?? null, tripType, source: provider === duffelFlightProvider ? "duffel" : "mock" });
}
