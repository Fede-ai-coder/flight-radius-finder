"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AIRPORTS } from "@/data/airports";
import { airportsWithinPolygon, airportsWithinRadius, type Coordinate } from "@/lib/geo";
import { DEPARTURE_OPTIONS, findDepartureLocation, resolveDepartureCodes } from "@/lib/departureSearch";
import { DESTINATION_OPTIONS, resolveDestination } from "@/lib/destinationSearch";
import type { FlightResult } from "@/lib/flightProviders/types";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });
const RADIUS_OPTIONS = [50, 100, 200, 300];
const ARRIVAL_RADIUS_OPTIONS = [0, 50, 100, 200];
const ADULT_OPTIONS = [1, 2, 3, 4];
const MAX_RESULTS_OPTIONS = [3, 5, 10];
const DEPARTURE_COLOR = "#2563eb";
const ARRIVAL_COLOR = "#db2777";

type DepartureSearchMode = "exact" | "radius" | "polygon";
type ArrivalSearchMode = "input" | "polygon";
type MapEditArea = "departure" | "arrival";
type OriginSummary = { origin: string; resultCount: number; cheapestPrice: number | null; currency: string | null; status: "found" | "partial" | "empty" | "error" };
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
  const [mapEditArea, setMapEditArea] = useState<MapEditArea>("departure");
  const [departureSearchMode, setDepartureSearchMode] = useState<DepartureSearchMode>("exact");
  const [departurePolygon, setDeparturePolygon] = useState<Coordinate[]>([]);
  const [arrivalSearchMode, setArrivalSearchMode] = useState<ArrivalSearchMode>("input");
  const [arrivalPolygon, setArrivalPolygon] = useState<Coordinate[]>([]);
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
  const exactDepartureCodes = useMemo(() => resolveDepartureCodes(departureQuery), [departureQuery]);
  const exactDepartureAirports = useMemo(() => exactDepartureCodes.map((code) => AIRPORTS.find((airport) => airport.code === code)).filter((airport): airport is NonNullable<typeof airport> => Boolean(airport)).map((airport) => ({ ...airport, distanceKm: 0 })), [exactDepartureCodes]);
  const nearbyAirports = useMemo(() => {
    if (departureSearchMode === "exact") return exactDepartureAirports;
    if (departureSearchMode === "polygon") return airportsWithinPolygon(AIRPORTS, departurePolygon);
    return airportsWithinRadius(AIRPORTS, selectedPoint[0], selectedPoint[1], radiusKm);
  }, [departureSearchMode, exactDepartureAirports, departurePolygon, selectedPoint, radiusKm]);
  const nearbyOriginCodes = useMemo(() => nearbyAirports.map((airport) => airport.code), [nearbyAirports]);
  const arrivalPolygonAirports = useMemo(() => airportsWithinPolygon(AIRPORTS, arrivalPolygon), [arrivalPolygon]);
  const destinationResolution = useMemo(() => resolveDestination(destination, arrivalRadiusKm), [destination, arrivalRadiusKm]);
  const destinationCodes = arrivalSearchMode === "polygon" ? arrivalPolygonAirports.map((airport) => airport.code) : destinationResolution.codes;
  const destinationLabel = arrivalSearchMode === "polygon" ? (destinationCodes.length ? destinationCodes.join(" / ") : "drawn arrival area") : destinationResolution.label;
  const visibleFlights = useMemo(() => selectedOriginFilter === "all" ? flights : flights.filter((flight) => flight.fromCode === selectedOriginFilter), [flights, selectedOriginFilter]);
  const originAirportByCode = useMemo(() => new Map(nearbyAirports.map((airport) => [airport.code, airport])), [nearbyAirports]);
  const airportByCode = useMemo(() => new Map(AIRPORTS.map((airport) => [airport.code, airport])), []);
  const foundOriginCount = originSummaries.filter((summary) => summary.status === "found").length;
  const cheapestFlight = flights[0];
  const highlightedAirports = useMemo(() => originSummaries.filter((summary) => summary.status === "found").map((summary) => { const airport = originAirportByCode.get(summary.origin); return airport ? { ...airport, resultCount: summary.resultCount, cheapestPrice: summary.cheapestPrice, currency: summary.currency } : null; }).filter((airport): airport is NonNullable<typeof airport> => Boolean(airport)), [originSummaries, originAirportByCode]);
  const highlightedArrivalAirports = useMemo(() => {
    const summaryByArrival = new Map<string, { resultCount: number; cheapestPrice: number | null; currency: string | null }>();
    for (const flight of flights) {
      const current = summaryByArrival.get(flight.to);
      if (!current) {
        summaryByArrival.set(flight.to, { resultCount: 1, cheapestPrice: flight.price, currency: flight.currency });
        continue;
      }
      current.resultCount += 1;
      if (current.cheapestPrice === null || flight.price < current.cheapestPrice) current.cheapestPrice = flight.price;
      current.currency = current.currency ?? flight.currency;
    }
    return Array.from(summaryByArrival.entries()).map(([code, summary]) => {
      const airport = airportByCode.get(code);
      return airport ? { ...airport, ...summary } : null;
    }).filter((airport): airport is NonNullable<typeof airport> => Boolean(airport));
  }, [flights, airportByCode]);
  const alternateArrivalCount = visibleFlights.filter((flight) => destinationCodes.length > 0 && !destinationCodes.includes(flight.to)).length;
  const departureAreaLabel = departureSearchMode === "exact" ? `city/airport only (${nearbyOriginCodes.join(" / ") || "none"})` : departureSearchMode === "polygon" ? `drawn area (${departurePolygon.length} point${departurePolygon.length === 1 ? "" : "s"})` : `${radiusKm} km`;
  const arrivalAreaLabel = arrivalSearchMode === "polygon" ? `drawn area (${arrivalPolygon.length} point${arrivalPolygon.length === 1 ? "" : "s"})` : `${getArrivalRadiusLabel(arrivalRadiusKm)} arrival`;
  const currentSearchSignature = useMemo(() => JSON.stringify({ departureSearchMode, departurePolygon, origins: nearbyOriginCodes, arrivalSearchMode, arrivalPolygon, destinations: destinationCodes, date, adults, maxResults, nonStop, arrivalRadiusKm }), [departureSearchMode, departurePolygon, nearbyOriginCodes, arrivalSearchMode, arrivalPolygon, destinationCodes, date, adults, maxResults, nonStop, arrivalRadiusKm]);
  const hasPendingSearchChanges = hasSearched && lastSearchSignature !== currentSearchSignature;
  const canSearch = nearbyOriginCodes.length > 0 && destinationCodes.length > 0 && Boolean(date) && !isLoadingFlights;
  const activePolygon = mapEditArea === "arrival" ? arrivalPolygon : departurePolygon;
  const activeMapMode = mapEditArea === "arrival" ? "polygon" : departureSearchMode === "polygon" ? "polygon" : "radius";
  const activePolygonColor = mapEditArea === "arrival" ? ARRIVAL_COLOR : DEPARTURE_COLOR;
  const secondaryPolygons = useMemo(() => {
    const polygons = [];
    if (mapEditArea !== "departure" && departureSearchMode === "polygon" && departurePolygon.length >= 2) polygons.push({ points: departurePolygon, color: DEPARTURE_COLOR, fillOpacity: 0.08 });
    if (mapEditArea !== "arrival" && arrivalSearchMode === "polygon" && arrivalPolygon.length >= 2) polygons.push({ points: arrivalPolygon, color: ARRIVAL_COLOR, fillOpacity: 0.08 });
    return polygons;
  }, [mapEditArea, departureSearchMode, departurePolygon, arrivalSearchMode, arrivalPolygon]);

  function updateActivePolygon(updater: (current: Coordinate[]) => Coordinate[]) {
    if (mapEditArea === "arrival") setArrivalPolygon(updater);
    else setDeparturePolygon(updater);
  }

  function handleAddPolygonPoint(point: Coordinate) {
    updateActivePolygon((current) => [...current, point]);
  }

  function handleMovePolygonPoint(index: number, point: Coordinate) {
    updateActivePolygon((current) => current.map((currentPoint, currentIndex) => currentIndex === index ? point : currentPoint));
  }

  function handleInsertPolygonPoint(afterIndex: number, point: Coordinate) {
    updateActivePolygon((current) => [...current.slice(0, afterIndex + 1), point, ...current.slice(afterIndex + 1)]);
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
    } catch (error) {
      setFlights([]);
      setOriginSummaries([]);
      setSearchMeta(null);
      setFlightSource(null);
      setFlightError(error instanceof Error ? error.message : "Flight search failed");
    } finally {
      setHasSearched(true);
      setLastSearchSignature(currentSearchSignature);
      setIsLoadingFlights(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 md:p-8">
      <h1 className="text-3xl font-bold text-slate-900">Flight Radius Finder</h1>
      <p className="mt-2 text-slate-600">Pick a departure area and search flights to one or more destinations or an arrival area.</p>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow lg:col-span-2">
          <div className="mb-3">
            <label className="mb-2 block text-sm font-medium">Departure area or city</label>
            <input list="departure-options" value={departureQuery} onChange={(e) => { const query = e.target.value; setDepartureQuery(query); const departureLocation = findDepartureLocation(query); if (departureLocation) setSelectedPoint(departureLocation.coords); }} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Departure area or city (e.g. Roma, Milano, FCO)" />
            <datalist id="departure-options">{departureSuggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setMapEditArea("departure")} className={`rounded-lg border px-3 py-2 text-sm ${mapEditArea === "departure" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Edit departure</button>
            <button type="button" onClick={() => { setMapEditArea("arrival"); setArrivalSearchMode("polygon"); }} className={`rounded-lg border px-3 py-2 text-sm ${mapEditArea === "arrival" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Edit arrival area</button>
            {mapEditArea === "departure" && <button type="button" onClick={() => setDepartureSearchMode("exact")} className={`rounded-lg border px-3 py-2 text-sm ${departureSearchMode === "exact" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>City/Airport only</button>}
            {mapEditArea === "departure" && <button type="button" onClick={() => setDepartureSearchMode("radius")} className={`rounded-lg border px-3 py-2 text-sm ${departureSearchMode === "radius" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Radius mode</button>}
            {mapEditArea === "departure" && <button type="button" onClick={() => setDepartureSearchMode("polygon")} className={`rounded-lg border px-3 py-2 text-sm ${departureSearchMode === "polygon" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Draw departure</button>}
            {activeMapMode === "polygon" && <button type="button" onClick={() => updateActivePolygon((current) => current.slice(0, -1))} disabled={activePolygon.length === 0} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Undo point</button>}
            {activeMapMode === "polygon" && <button type="button" onClick={() => updateActivePolygon(() => [])} disabled={activePolygon.length === 0} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Clear area</button>}
          </div>
          <div className="mb-3 flex flex-wrap gap-3 text-xs font-medium text-slate-600"><span><span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" /> departure area</span><span><span className="inline-block h-2.5 w-2.5 rounded-full bg-pink-600" /> arrival area</span><span><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" /> result departures</span><span><span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" /> result arrivals</span></div>
          {activeMapMode === "polygon" && <p className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">Editing {mapEditArea} area: click on the map to add at least 3 points. Drag colored points to reshape the active area, or drag the light-blue line handles to pull out a new edge.</p>}
          <div className="h-[420px] overflow-hidden rounded-xl"><MapPicker center={selectedPoint} radiusKm={radiusKm} mode={activeMapMode} polygonPoints={activePolygon} secondaryPolygons={secondaryPolygons} activePolygonColor={activePolygonColor} highlightedAirports={highlightedAirports} highlightedArrivalAirports={highlightedArrivalAirports} onSelect={setSelectedPoint} onAddPolygonPoint={handleAddPolygonPoint} onMovePolygonPoint={handleMovePolygonPoint} onInsertPolygonPoint={handleInsertPolygonPoint} /></div>
          <p className="mt-3 text-sm text-slate-600">Departure: {departureAreaLabel} · Arrival: {arrivalSearchMode === "polygon" ? `${arrivalPolygonAirports.length} airports in ${arrivalAreaLabel}` : arrivalAreaLabel}</p>
          {highlightedAirports.length > 0 && <p className="mt-1 text-sm font-medium text-green-700">Highlighted departure airports: {highlightedAirports.map((airport) => airport.code).join(", ")}</p>}
          {highlightedArrivalAirports.length > 0 && <p className="mt-1 text-sm font-medium text-orange-600">Highlighted arrival airports: {highlightedArrivalAirports.map((airport) => airport.code).join(", ")}</p>}
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-4 shadow">
          {departureSearchMode === "radius" && <div><label className="mb-2 block text-sm font-medium">Departure radius (km)</label><div className="grid grid-cols-2 gap-2">{RADIUS_OPTIONS.map((option) => <button key={option} type="button" onClick={() => setRadiusKm(option)} className={`rounded-lg border px-3 py-2 text-sm ${radiusKm === option ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>{option} km</button>)}</div></div>}
          {departureSearchMode === "exact" && <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="font-semibold">Departure city/airport:</span> {nearbyOriginCodes.length > 0 ? nearbyOriginCodes.join(", ") : "No matching departure airport."}</div>}
          {departureSearchMode === "polygon" && <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="font-semibold">Departure draw mode:</span> {departurePolygon.length < 3 ? `add ${3 - departurePolygon.length} more point${3 - departurePolygon.length === 1 ? "" : "s"}.` : `${nearbyAirports.length} airports inside.`}</div>}
          <div><label className="mb-2 block text-sm font-medium">Arrival mode</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setArrivalSearchMode("input")} className={`rounded-lg border px-3 py-2 text-sm ${arrivalSearchMode === "input" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Destinations</button><button type="button" onClick={() => { setArrivalSearchMode("polygon"); setMapEditArea("arrival"); }} className={`rounded-lg border px-3 py-2 text-sm ${arrivalSearchMode === "polygon" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Draw arrival</button></div></div>
          {arrivalSearchMode === "input" && <div><label className="mb-2 block text-sm font-medium">Destination(s)</label><input list="destination-options" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. Santorini, Rome; Milan, LAX" /><datalist id="destination-options">{destinationSuggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist><p className="mt-1 text-xs font-medium text-slate-600">{destinationResolution.description}</p><p className="mt-1 text-xs text-slate-500">Use commas or semicolons for multiple destinations.</p></div>}
          {arrivalSearchMode === "input" && <div><label className="mb-2 block text-sm font-medium">Arrival radius</label><div className="grid grid-cols-2 gap-2">{ARRIVAL_RADIUS_OPTIONS.map((option) => <button key={option} type="button" onClick={() => setArrivalRadiusKm(option)} className={`rounded-lg border px-3 py-2 text-sm ${arrivalRadiusKm === option ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>{getArrivalRadiusLabel(option)}</button>)}</div><p className="mt-1 text-xs text-slate-500">Expand destination airports around the selected arrival city/airport.</p></div>}
          {arrivalSearchMode === "polygon" && <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="font-semibold">Arrival draw mode:</span> {arrivalPolygon.length < 3 ? `add ${3 - arrivalPolygon.length} more point${3 - arrivalPolygon.length === 1 ? "" : "s"}.` : `${arrivalPolygonAirports.length} destination airports inside: ${arrivalPolygonAirports.map((airport) => airport.code).join(", ") || "none"}`}</div>}
          <div><label className="mb-2 block text-sm font-medium">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="mb-2 block text-sm font-medium">Adults</label><select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2">{ADULT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div><div><label className="mb-2 block text-sm font-medium">Max results</label><select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2">{MAX_RESULTS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div></div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={nonStop} onChange={(e) => setNonStop(e.target.checked)} className="h-4 w-4" /> Direct only</label>
          <button type="button" onClick={handleSearchFlights} disabled={!canSearch} className={`w-full rounded-lg px-4 py-3 text-sm font-semibold ${canSearch ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-slate-200 text-slate-500"}`}>{isLoadingFlights ? "Searching flights..." : "Search flights"}</button>
          <p className="text-xs text-slate-500">Results update only when you press Search flights, so changing filters will not trigger extra API calls.</p>
          <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">Nearby departure airports: {nearbyAirports.length}</p><ul className="mt-2 space-y-1 text-slate-700">{nearbyAirports.map((airport) => <li key={airport.code}>{airport.code} - {airport.city} ({airport.distanceKm.toFixed(1)} km)</li>)}{nearbyAirports.length === 0 && <li>No airports in this departure area.</li>}</ul></div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-xl font-semibold">Flight results</h2><p className="mb-4 text-sm text-slate-500">Results are loaded through the configured flight provider and grouped by origin airport.</p></div><div className="text-right text-sm text-slate-500"><p>Source: <span className="font-semibold text-slate-700">{getSourceLabel(flightSource)}</span></p>{isLoadingFlights && <p>Loading results...</p>}</div></div>
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">Test mode: flight results may come from Duffel test API or mock fallback. No live bookings or payments are created.</div>
        {!hasSearched && <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Choose your departure area, arrival area or destinations and date, then click <span className="font-semibold">Search flights</span>.</div>}
        {hasPendingSearchChanges && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Search settings changed. Click <span className="font-semibold">Search flights</span> to refresh the results.</div>}
        {hasSearched && <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="font-semibold text-slate-900">Search:</span> {originSummaries.length || nearbyAirports.length} origin airports in {departureAreaLabel} departure area → {destinationLabel || "—"} ({arrivalAreaLabel}) · {foundOriginCount} airports with results · {flights.length} total results{cheapestFlight && <> · cheapest {cheapestFlight.currency} {cheapestFlight.price} from {cheapestFlight.fromCode}</>}</div>}
        {searchMeta?.wasLimited && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"><span className="font-semibold">Search limited:</span> checked {searchMeta.searchedCombinations} of {searchMeta.requestedCombinations} origin-destination combinations to protect provider limits. Try drawing smaller areas or choosing more specific destination airports.</div>}
        {alternateArrivalCount > 0 && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{alternateArrivalCount} visible result{alternateArrivalCount === 1 ? "" : "s"} arrive at an airport different from the requested destination area {destinationLabel}. These are shown as alternative arrival airports.</div>}
        {flightSource === "mock-fallback" && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">No Duffel test results were found for this search. Showing mock fallback results.</div>}
        {flightError && <p className="mb-4 text-sm text-red-600">{flightError}</p>}

        {originSummaries.length > 0 && <div className="mb-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">{originSummaries.map((summary) => { const airport = originAirportByCode.get(summary.origin); return <button key={summary.origin} type="button" onClick={() => setSelectedOriginFilter(summary.origin)} className={`rounded-lg border p-3 text-left text-sm ${selectedOriginFilter === summary.origin ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between"><span className="font-semibold">{summary.origin}{airport ? ` — ${airport.city}` : ""}</span><span className={summary.status === "found" ? "text-green-700" : summary.status === "partial" ? "text-amber-600" : summary.status === "error" ? "text-red-600" : "text-slate-500"}>{summary.status === "partial" ? "partial results" : summary.status}</span></div>{airport && <p className="mt-1 text-xs text-slate-500">{airport.name} · {airport.distanceKm.toFixed(1)} km away</p>}<p className="mt-1 text-slate-600">{summary.resultCount} result{summary.resultCount === 1 ? "" : "s"}</p>{summary.cheapestPrice !== null && <p className="text-slate-600">from {summary.currency} {summary.cheapestPrice}</p>}</button>; })}</div>}
        {originSummaries.length > 0 && <div className="mb-4 flex items-center justify-between gap-2"><button type="button" onClick={() => setSelectedOriginFilter("all")} className={`rounded-lg border px-3 py-2 text-sm ${selectedOriginFilter === "all" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>Show all airports</button><p className="text-sm text-slate-500">Showing {visibleFlights.length} of {flights.length} results</p></div>}

        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="p-2">From</th><th className="p-2">To</th><th className="p-2">Date</th><th className="p-2">Airline</th><th className="p-2">Departure</th><th className="p-2">Arrival</th><th className="p-2">Duration</th><th className="p-2">Stops</th><th className="p-2">Price</th></tr></thead><tbody>{visibleFlights.map((flight) => { const isAlternativeArrival = destinationCodes.length > 0 && !destinationCodes.includes(flight.to); return <tr key={flight.id} className="border-b last:border-b-0"><td className="p-2">{flight.fromCode} ({flight.fromCity})</td><td className="p-2">{flight.to}{isAlternativeArrival && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">alternative</span>}</td><td className="p-2">{flight.date}</td><td className="p-2">{flight.airline}</td><td className="p-2">{flight.departureTime}</td><td className="p-2">{flight.arrivalTime}</td><td className="p-2">{flight.duration}</td><td className="p-2">{flight.stops}</td><td className="p-2">{flight.currency} {flight.price}</td></tr>; })}{visibleFlights.length === 0 && <tr><td colSpan={9} className="p-3 text-slate-500">{hasSearched ? "No results for the selected airport filter." : "No search run yet."}</td></tr>}</tbody></table></div>
      </section>
    </main>
  );
}
