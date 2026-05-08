"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AIRPORTS } from "@/data/airports";
import { airportsWithinPolygon, airportsWithinRadius, type Coordinate } from "@/lib/geo";
import { DEPARTURE_OPTIONS, findDepartureLocation } from "@/lib/departureSearch";
import { DESTINATION_OPTIONS, resolveDestination, resolveDestinationCodes } from "@/lib/destinationSearch";
import type { FlightResult } from "@/lib/flightProviders/types";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

const RADIUS_OPTIONS = [50, 100, 200, 300];
const ARRIVAL_RADIUS_OPTIONS = [0, 50, 100, 200];
const ADULT_OPTIONS = [1, 2, 3, 4];
const MAX_RESULTS_OPTIONS = [3, 5, 10];

type DepartureSearchMode = "radius" | "polygon";
type OriginSummary = { origin: string; resultCount: number; cheapestPrice: number | null; currency: string | null; status: "found" | "empty" | "error" };
type SearchMeta = { requestedOriginCount: number; searchedOriginCount: number; destinationCount: number; requestedCombinations: number; searchedCombinations: number; maxCombinations: number; wasLimited: boolean };
type FlightSearchResponse = { flights?: FlightResult[]; source?: string; originSummaries?: OriginSummary[]; searchMeta?: SearchMeta };

function getSourceLabel(source: string | null) {
  if (source === "duffel") return "Duffel test API";
  if (source === "mock-fallback") return "Mock fallback";
  if (source === "mock") return "Mock demo data";
  return "Not loaded yet";
}

function getArrivalRadiusLabel(radiusKm: number) {
  return radiusKm === 0 ? "Exact only" : `${radiusKm} km`;
}

export default function HomePage() {
  const [selectedPoint, setSelectedPoint] = useState<Coordinate>([40.7128, -74.006]);
  const [departureQuery, setDepartureQuery] = useState("New York");
  const [departureSearchMode, setDepartureSearchMode] = useState<DepartureSearchMode>("radius");
  const [departurePolygon, setDeparturePolygon] = useState<Coordinate[]>([]);
  const [radiusKm, setRadiusKm] = useState(100);
  const [destination, setDestination] = useState("LAX");
  const [arrivalRadiusKm, setArrivalRadiusKm] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [adults, setAdults] = useState(1);
  const [maxResults, setMaxResults] = useState(3);
  const [nonStop, setNonStop] = useState(false);
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [originSummaries, setOriginSummaries] = useState<OriginSummary[]>([]);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [selectedOriginFilter, setSelectedOriginFilter] = useState("all");
  const [flightSource, setFlightSource] = useState<string | null>(null);
  const [isLoadingFlights, setIsLoadingFlights] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchSignature, setLastSearchSignature] = useState<string | null>(null);

  const departureSuggestions = useMemo(() => DEPARTURE_OPTIONS.map((option) => option.label), []);
  const destinationSuggestions = useMemo(() => DESTINATION_OPTIONS.map((option) => option.label), []);
  const nearbyAirports = useMemo(() => departureSearchMode === "polygon" ? airportsWithinPolygon(AIRPORTS, departurePolygon) : airportsWithinRadius(AIRPORTS, selectedPoint[0], selectedPoint[1], radiusKm), [departureSearchMode, departurePolygon, selectedPoint, radiusKm]);
  const nearbyOriginCodes = useMemo(() => nearbyAirports.map((airport) => airport.code), [nearbyAirports]);
  const visibleFlights = useMemo(() => selectedOriginFilter === "all" ? flights : flights.filter((flight) => flight.fromCode === selectedOriginFilter), [flights, selectedOriginFilter]);
  const destinationResolution = useMemo(() => resolveDestination(destination, arrivalRadiusKm), [destination, arrivalRadiusKm]);
  const destinationCodes = destinationResolution.codes;
  const destinationLabel = destinationResolution.label;
  const originAirportByCode = useMemo(() => new Map(nearbyAirports.map((airport) => [airport.code, airport])), [nearbyAirports]);
  const foundOriginCount = originSummaries.filter((summary) => summary.status === "found").length;
  const cheapestFlight = flights[0];
  const highlightedAirports = useMemo(() => originSummaries.filter((summary) => summary.status === "found").map((summary) => { const airport = originAirportByCode.get(summary.origin); return airport ? { ...airport, resultCount: summary.resultCount, cheapestPrice: summary.cheapestPrice, currency: summary.currency } : null; }).filter((airport): airport is NonNullable<typeof airport> => Boolean(airport)), [originSummaries, originAirportByCode]);
  const alternateArrivalCount = visibleFlights.filter((flight) => destinationCodes.length > 0 && !destinationCodes.includes(flight.to)).length;
  const departureAreaLabel = departureSearchMode === "polygon" ? `drawn area (${departurePolygon.length} point${departurePolygon.length === 1 ? "" : "s"})` : `${radiusKm} km`;
  const currentSearchSignature = useMemo(() => JSON.stringify({ departureSearchMode, polygon: departurePolygon, origins: nearbyOriginCodes, destinations: destinationCodes, date, adults, maxResults, nonStop, arrivalRadiusKm }), [departureSearchMode, departurePolygon, nearbyOriginCodes, destinationCodes, date, adults, maxResults, nonStop, arrivalRadiusKm]);
  const hasPendingSearchChanges = hasSearched && lastSearchSignature !== currentSearchSignature;
  const canSearch = nearbyOriginCodes.length > 0 && destinationCodes.length > 0 && Boolean(date) && !isLoadingFlights;

  function handleAddPolygonPoint(point: Coordinate) {
    setDeparturePolygon((current) => [...current, point]);
  }

  function handleMovePolygonPoint(index: number, point: Coordinate) {
    setDeparturePolygon((current) => current.map((currentPoint, currentIndex) => currentIndex === index ? point : currentPoint));
  }

  function handleUndoPolygonPoint() {
    setDeparturePolygon((current) => current.slice(0, -1));
  }

  function handleClearPolygon() {
    setDeparturePolygon([]);
  }

  async function handleSearchFlights() {
    if (!canSearch) return;

    setIsLoadingFlights(true);
    setFlightError(null);

    try {
      const response = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origins: nearbyOriginCodes, destinations: destinationCodes, date, adults, maxResults, nonStop }),
      });

      if (!response.ok) throw new Error("Flight search failed");

      const data = (await response.json()) as FlightSearchResponse;
      setFlights(data.flights ?? []);
      setOriginSummaries(data.originSummaries ?? []);
      setSearchMeta(data.searchMeta ?? null);
      setSelectedOriginFilter("all");
      setFlightSource(data.source ?? null);
      setHasSearched(true);
      setLastSearchSignature(currentSearchSignature);
    } catch (error) {
      setFlights([]);
      setOriginSummaries([]);
      setSearchMeta(null);
      setFlightSource(null);
      setFlightError(error instanceof Error ? error.message : "Flight search failed");
      setHasSearched(true);
      setLastSearchSignature(currentSearchSignature);
    } finally {
      setIsLoadingFlights(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 md:p-8">
      <h1 className="text-3xl font-bold text-slate-900">Flight Radius Finder</h1>
      <p className="mt-2 text-slate-600">Pick a location on the map and discover flights from nearby airports.</p>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow lg:col-span-2">
          <div className="mb-3">
            <label className="mb-2 block text-sm font-medium">Departure area or city</label>
            <input list="departure-options" value={departureQuery} onChange={(e) => { const query = e.target.value; setDepartureQuery(query); const departureLocation = findDepartureLocation(query); if (departureLocation) setSelectedPoint(departureLocation.coords); }} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Departure area or city (e.g. Roma, Milano, FCO)" />
            <datalist id="departure-options">{departureSuggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setDepartureSearchMode("radius")} className={`rounded-lg border px-3 py-2 text-sm ${departureSearchMode === "radius" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Radius mode</button>
            <button type="button" onClick={() => setDepartureSearchMode("polygon")} className={`rounded-lg border px-3 py-2 text-sm ${departureSearchMode === "polygon" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Draw area</button>
            {departureSearchMode === "polygon" && <button type="button" onClick={handleUndoPolygonPoint} disabled={departurePolygon.length === 0} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Undo point</button>}
            {departureSearchMode === "polygon" && <button type="button" onClick={handleClearPolygon} disabled={departurePolygon.length === 0} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Clear area</button>}
          </div>
          {departureSearchMode === "polygon" && <p className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">Click on the map to add at least 3 points and draw a custom departure area. Drag any blue point to reshape the area.</p>}
          <div className="h-[420px] overflow-hidden rounded-xl"><MapPicker center={selectedPoint} radiusKm={radiusKm} mode={departureSearchMode} polygonPoints={departurePolygon} highlightedAirports={highlightedAirports} onSelect={setSelectedPoint} onAddPolygonPoint={handleAddPolygonPoint} onMovePolygonPoint={handleMovePolygonPoint} /></div>
          <p className="mt-3 text-sm text-slate-600">{departureSearchMode === "polygon" ? `Drawn departure area: ${departurePolygon.length} point${departurePolygon.length === 1 ? "" : "s"}` : `Selected location: ${selectedPoint[0].toFixed(4)}, ${selectedPoint[1].toFixed(4)}`}</p>
          {highlightedAirports.length > 0 && <p className="mt-1 text-sm font-medium text-green-700">Highlighted result airports: {highlightedAirports.map((airport) => airport.code).join(", ")}</p>}
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-4 shadow">
          {departureSearchMode === "radius" && <div><label className="mb-2 block text-sm font-medium">Radius (km)</label><div className="grid grid-cols-2 gap-2">{RADIUS_OPTIONS.map((option) => <button key={option} type="button" onClick={() => setRadiusKm(option)} className={`rounded-lg border px-3 py-2 text-sm ${radiusKm === option ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>{option} km</button>)}</div></div>}
          {departureSearchMode === "polygon" && <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="font-semibold">Draw mode:</span> {departurePolygon.length < 3 ? `add ${3 - departurePolygon.length} more point${3 - departurePolygon.length === 1 ? "" : "s"} to create an area.` : "custom area ready."}</div>}
          <div><label className="mb-2 block text-sm font-medium">Destination(s)</label><input list="destination-options" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. Santorini, Rome; Milan, LAX" /><datalist id="destination-options">{destinationSuggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist><p className="mt-1 text-xs font-medium text-slate-600">{destinationResolution.description}</p><p className="mt-1 text-xs text-slate-500">Use commas or semicolons for multiple destinations.</p></div>
          <div><label className="mb-2 block text-sm font-medium">Arrival radius</label><div className="grid grid-cols-2 gap-2">{ARRIVAL_RADIUS_OPTIONS.map((option) => <button key={option} type="button" onClick={() => setArrivalRadiusKm(option)} className={`rounded-lg border px-3 py-2 text-sm ${arrivalRadiusKm === option ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>{getArrivalRadiusLabel(option)}</button>)}</div><p className="mt-1 text-xs text-slate-500">Expand destination airports around the selected arrival city/airport.</p></div>
          <div><label className="mb-2 block text-sm font-medium">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="mb-2 block text-sm font-medium">Adults</label><select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2">{ADULT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div><div><label className="mb-2 block text-sm font-medium">Max results</label><select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2">{MAX_RESULTS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div></div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={nonStop} onChange={(e) => setNonStop(e.target.checked)} className="h-4 w-4" /> Direct only</label>
          <button type="button" onClick={handleSearchFlights} disabled={!canSearch} className={`w-full rounded-lg px-4 py-3 text-sm font-semibold ${canSearch ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-slate-200 text-slate-500"}`}>{isLoadingFlights ? "Searching flights..." : "Search flights"}</button>
          <p className="text-xs text-slate-500">Results update only when you press Search flights, so changing filters will not trigger extra API calls.</p>
          <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">Nearby airports: {nearbyAirports.length}</p><ul className="mt-2 space-y-1 text-slate-700">{nearbyAirports.map((airport) => <li key={airport.code}>{airport.code} - {airport.city} ({airport.distanceKm.toFixed(1)} km)</li>)}{nearbyAirports.length === 0 && <li>No airports in this departure area.</li>}</ul></div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-xl font-semibold">Flight results</h2><p className="mb-4 text-sm text-slate-500">Results are loaded through the configured flight provider and grouped by origin airport.</p></div><div className="text-right text-sm text-slate-500"><p>Source: <span className="font-semibold text-slate-700">{getSourceLabel(flightSource)}</span></p>{isLoadingFlights && <p>Loading results...</p>}</div></div>
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">Test mode: flight results may come from Duffel test API or mock fallback. No live bookings or payments are created.</div>
        {!hasSearched && <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Choose your departure area, destination and date, then click <span className="font-semibold">Search flights</span>.</div>}
        {hasPendingSearchChanges && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Search settings changed. Click <span className="font-semibold">Search flights</span> to refresh the results.</div>}
        {hasSearched && <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="font-semibold text-slate-900">Search:</span> {originSummaries.length || nearbyAirports.length} origin airports in {departureAreaLabel} departure area → {destinationLabel || "—"} ({getArrivalRadiusLabel(arrivalRadiusKm)} arrival) · {foundOriginCount} airports with results · {flights.length} total results{cheapestFlight && <> · cheapest {cheapestFlight.currency} {cheapestFlight.price} from {cheapestFlight.fromCode}</>}</div>}
        {searchMeta?.wasLimited && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"><span className="font-semibold">Search limited:</span> checked {searchMeta.searchedCombinations} of {searchMeta.requestedCombinations} origin-destination combinations to protect provider limits. Try reducing the radius, drawing a smaller departure area or choosing a more specific destination airport to search fewer combinations.</div>}
        {alternateArrivalCount > 0 && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{alternateArrivalCount} visible result{alternateArrivalCount === 1 ? "" : "s"} arrive at an airport different from the requested destination area {destinationLabel}. These are shown as alternative arrival airports.</div>}
        {flightSource === "mock-fallback" && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">No Duffel test results were found for this search. Showing mock fallback results.</div>}
        {flightError && <p className="mb-4 text-sm text-red-600">{flightError}</p>}

        {originSummaries.length > 0 && <div className="mb-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">{originSummaries.map((summary) => { const airport = originAirportByCode.get(summary.origin); return <button key={summary.origin} type="button" onClick={() => setSelectedOriginFilter(summary.origin)} className={`rounded-lg border p-3 text-left text-sm ${selectedOriginFilter === summary.origin ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between"><span className="font-semibold">{summary.origin}{airport ? ` — ${airport.city}` : ""}</span><span className={summary.status === "found" ? "text-green-700" : summary.status === "error" ? "text-red-600" : "text-slate-500"}>{summary.status}</span></div>{airport && <p className="mt-1 text-xs text-slate-500">{airport.name} · {airport.distanceKm.toFixed(1)} km away</p>}<p className="mt-1 text-slate-600">{summary.resultCount} result{summary.resultCount === 1 ? "" : "s"}</p>{summary.cheapestPrice !== null && <p className="text-slate-600">from {summary.currency} {summary.cheapestPrice}</p>}</button>; })}</div>}

        {originSummaries.length > 0 && <div className="mb-4 flex items-center justify-between gap-2"><button type="button" onClick={() => setSelectedOriginFilter("all")} className={`rounded-lg border px-3 py-2 text-sm ${selectedOriginFilter === "all" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Show all airports</button><p className="text-sm text-slate-500">Showing {visibleFlights.length} of {flights.length} results</p></div>}

        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="p-2">From</th><th className="p-2">To</th><th className="p-2">Date</th><th className="p-2">Airline</th><th className="p-2">Departure</th><th className="p-2">Arrival</th><th className="p-2">Duration</th><th className="p-2">Stops</th><th className="p-2">Price</th></tr></thead><tbody>{visibleFlights.map((flight) => { const isAlternativeArrival = destinationCodes.length > 0 && !destinationCodes.includes(flight.to); return <tr key={flight.id} className="border-b last:border-b-0"><td className="p-2">{flight.fromCode} ({flight.fromCity})</td><td className="p-2">{flight.to}{isAlternativeArrival && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">alternative</span>}</td><td className="p-2">{flight.date}</td><td className="p-2">{flight.airline}</td><td className="p-2">{flight.departureTime}</td><td className="p-2">{flight.arrivalTime}</td><td className="p-2">{flight.duration}</td><td className="p-2">{flight.stops}</td><td className="p-2">{flight.currency} {flight.price}</td></tr>; })}{visibleFlights.length === 0 && <tr><td colSpan={9} className="p-3 text-slate-500">{hasSearched ? "No results for the selected airport filter." : "No search run yet."}</td></tr>}</tbody></table></div>
      </section>
    </main>
  );
}
