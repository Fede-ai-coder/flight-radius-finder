"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AIRPORTS } from "@/data/airports";
import { airportsWithinRadius } from "@/lib/geo";
import { DEPARTURE_OPTIONS, findDepartureLocation } from "@/lib/departureSearch";
import type { FlightResult } from "@/lib/flightProviders/types";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

const RADIUS_OPTIONS = [50, 100, 200, 300];

export default function HomePage() {
  const [selectedPoint, setSelectedPoint] = useState<[number, number]>([40.7128, -74.006]);
  const [departureQuery, setDepartureQuery] = useState("New York");
  const [radiusKm, setRadiusKm] = useState(100);
  const [destination, setDestination] = useState("LAX");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [isLoadingFlights, setIsLoadingFlights] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);

  const departureSuggestions = useMemo(
    () => DEPARTURE_OPTIONS.map((option) => option.label),
    [],
  );

  const nearbyAirports = useMemo(
    () => airportsWithinRadius(AIRPORTS, selectedPoint[0], selectedPoint[1], radiusKm),
    [selectedPoint, radiusKm],
  );

  useEffect(() => {
    const origins = nearbyAirports.map((airport) => airport.code);

    if (!destination.trim() || !date || origins.length === 0) {
      setFlights([]);
      return;
    }

    let isActive = true;

    async function loadFlights() {
      setIsLoadingFlights(true);
      setFlightError(null);

      try {
        const response = await fetch("/api/flights/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origins,
            destination: destination.trim(),
            date,
            adults: 1,
            maxResults: 3,
          }),
        });

        if (!response.ok) throw new Error("Flight search failed");

        const data = (await response.json()) as { flights?: FlightResult[] };
        if (isActive) setFlights(data.flights ?? []);
      } catch (error) {
        if (isActive) {
          setFlights([]);
          setFlightError(error instanceof Error ? error.message : "Flight search failed");
        }
      } finally {
        if (isActive) setIsLoadingFlights(false);
      }
    }

    loadFlights();

    return () => {
      isActive = false;
    };
  }, [nearbyAirports, destination, date]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 md:p-8">
      <h1 className="text-3xl font-bold text-slate-900">Flight Radius Finder</h1>
      <p className="mt-2 text-slate-600">Pick a location on the map and discover mock flights from nearby airports.</p>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow lg:col-span-2">
          <div className="mb-3">
            <label className="mb-2 block text-sm font-medium">Departure area or city</label>
            <input
              list="departure-options"
              value={departureQuery}
              onChange={(e) => {
                const query = e.target.value;
                setDepartureQuery(query);
                const departureLocation = findDepartureLocation(query);
                if (departureLocation) setSelectedPoint(departureLocation.coords);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Departure area or city (e.g. Roma, Milano, FCO)"
            />
            <datalist id="departure-options">
              {departureSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>
          <div className="h-[420px] overflow-hidden rounded-xl">
            <MapPicker center={selectedPoint} radiusKm={radiusKm} onSelect={setSelectedPoint} />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Selected location: {selectedPoint[0].toFixed(4)}, {selectedPoint[1].toFixed(4)}
          </p>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-4 shadow">
          <div>
            <label className="mb-2 block text-sm font-medium">Radius (km)</label>
            <div className="grid grid-cols-2 gap-2">
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRadiusKm(option)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    radiusKm === option ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                  }`}
                >
                  {option} km
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Destination (IATA or city)</label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="e.g. LAX"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-semibold">Nearby airports: {nearbyAirports.length}</p>
            <ul className="mt-2 space-y-1 text-slate-700">
              {nearbyAirports.map((airport) => (
                <li key={airport.code}>
                  {airport.code} - {airport.city} ({airport.distanceKm.toFixed(1)} km)
                </li>
              ))}
              {nearbyAirports.length === 0 && <li>No airports in this radius.</li>}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Demo flight results</h2>
            <p className="mb-4 text-sm text-slate-500">These are generated sample flights (no real API calls).</p>
          </div>
          {isLoadingFlights && <p className="text-sm text-slate-500">Loading demo results...</p>}
        </div>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Demo mode: prices and flights are simulated. Real flight API not connected yet.
        </div>
        {flightError && <p className="mb-4 text-sm text-red-600">{flightError}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="p-2">From</th>
                <th className="p-2">To</th>
                <th className="p-2">Date</th>
                <th className="p-2">Airline</th>
                <th className="p-2">Departure</th>
                <th className="p-2">Arrival</th>
                <th className="p-2">Duration</th>
                <th className="p-2">Stops</th>
                <th className="p-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((flight) => (
                <tr key={flight.id} className="border-b last:border-b-0">
                  <td className="p-2">{flight.fromCode} ({flight.fromCity})</td>
                  <td className="p-2">{flight.to}</td>
                  <td className="p-2">{flight.date}</td>
                  <td className="p-2">{flight.airline}</td>
                  <td className="p-2">{flight.departureTime}</td>
                  <td className="p-2">{flight.arrivalTime}</td>
                  <td className="p-2">{flight.duration}</td>
                  <td className="p-2">{flight.stops}</td>
                  <td className="p-2">{flight.currency} {flight.price}</td>
                </tr>
              ))}
              {flights.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-3 text-slate-500">
                    Enter destination/date and select an area with nearby airports.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
