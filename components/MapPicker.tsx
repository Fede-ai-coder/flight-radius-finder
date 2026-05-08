"use client";

import { useEffect } from "react";
import { Circle, MapContainer, Marker, Polygon, Polyline, Tooltip, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Airport } from "@/data/airports";
import type { Coordinate } from "@/lib/geo";

type HighlightedAirport = Airport & { resultCount?: number; cheapestPrice?: number | null; currency?: string | null; distanceKm?: number };
type PolygonLayer = { points: Coordinate[]; color: string; fillOpacity?: number };

type MapPickerProps = {
  center: Coordinate;
  radiusKm: number;
  mode?: "radius" | "polygon";
  polygonPoints?: Coordinate[];
  secondaryPolygons?: PolygonLayer[];
  activePolygonColor?: string;
  originAirports?: HighlightedAirport[];
  highlightedAirports?: HighlightedAirport[];
  highlightedArrivalAirports?: HighlightedAirport[];
  onSelect: (next: Coordinate) => void;
  onAddPolygonPoint?: (next: Coordinate) => void;
  onMovePolygonPoint?: (index: number, next: Coordinate) => void;
  onInsertPolygonPoint?: (afterIndex: number, next: Coordinate) => void;
};

const markerIcon = L.icon({ iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png", shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41] });

function divIcon(color: string, size = 16) {
  return L.divIcon({ className: "", html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(15,23,42,.35);cursor:grab;"></span>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function airportResultIcon(color: string, label: string) {
  return L.divIcon({ className: "", html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(15,23,42,.35);color:white;font-size:13px;font-weight:800;">${label}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] });
}

const edgeHandleIcon = L.divIcon({ className: "", html: '<span style="display:block;width:12px;height:12px;border-radius:9999px;background:#38bdf8;border:2px solid white;box-shadow:0 1px 4px rgba(15,23,42,.28);cursor:grab;"></span>', iconSize: [12, 12], iconAnchor: [6, 6] });
const selectedOriginAirportIcon = airportResultIcon("#2563eb", "O");
const departureResultAirportIcon = airportResultIcon("#16a34a", "↗");
const arrivalResultAirportIcon = airportResultIcon("#f97316", "↘");

function midpoint(a: Coordinate, b: Coordinate): Coordinate { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

function ClickHandler({ mode, onSelect, onAddPolygonPoint }: { mode: "radius" | "polygon"; onSelect: (next: Coordinate) => void; onAddPolygonPoint?: (next: Coordinate) => void }) {
  useMapEvents({ click(event) { const point: Coordinate = [event.latlng.lat, event.latlng.lng]; if (mode === "polygon") onAddPolygonPoint?.(point); else onSelect(point); } });
  return null;
}

function MapCenterUpdater({ center, enabled }: { center: Coordinate; enabled: boolean }) {
  const map = useMap();
  useEffect(() => { if (enabled) map.setView(center, map.getZoom(), { animate: true }); }, [center, enabled, map]);
  return null;
}

function StaticPolygonLayer({ points, color, fillOpacity = 0.1 }: PolygonLayer) {
  if (points.length < 2) return null;
  return <>{points.length >= 2 && <Polyline positions={points} pathOptions={{ color, weight: 2, dashArray: "6 6" }} />}{points.length >= 3 && <Polygon positions={points} pathOptions={{ color, fillOpacity }} />}</>;
}

function AirportMarker({ airport, icon, label, showResultCount = true }: { airport: HighlightedAirport; icon: L.DivIcon; label: string; showResultCount?: boolean }) {
  return <Marker key={`${label}-${airport.code}`} position={[airport.lat, airport.lng]} icon={icon} zIndexOffset={1000}><Tooltip direction="top" offset={[0, -10]} opacity={1}><span><strong>{label}: {airport.code} — {airport.city}</strong>{showResultCount && <><br />{airport.resultCount ?? 0} result{airport.resultCount === 1 ? "" : "s"}{airport.cheapestPrice !== null && airport.cheapestPrice !== undefined && airport.currency ? ` · from ${airport.currency} ${airport.cheapestPrice}` : ""}</>}</span></Tooltip></Marker>;
}

export default function MapPicker({ center, radiusKm, mode = "radius", polygonPoints = [], secondaryPolygons = [], activePolygonColor = "#2563eb", originAirports = [], highlightedAirports = [], highlightedArrivalAirports = [], onSelect, onAddPolygonPoint, onMovePolygonPoint, onInsertPolygonPoint }: MapPickerProps) {
  const hasPolygon = polygonPoints.length >= 3;
  const edgeHandles = hasPolygon ? polygonPoints.map((point, index) => ({ afterIndex: index, position: midpoint(point, polygonPoints[(index + 1) % polygonPoints.length]) })) : [];
  const activeVertexIcon = divIcon(activePolygonColor, 16);
  const highlightedDepartureCodes = new Set(highlightedAirports.map((airport) => airport.code));
  const visibleOriginAirports = originAirports.filter((airport) => !highlightedDepartureCodes.has(airport.code));

  return (
    <MapContainer center={center} zoom={6} className="h-full w-full rounded-xl">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapCenterUpdater center={center} enabled={mode === "radius"} />
      <ClickHandler mode={mode} onSelect={onSelect} onAddPolygonPoint={onAddPolygonPoint} />
      {secondaryPolygons.map((polygon, index) => <StaticPolygonLayer key={`secondary-${index}`} {...polygon} />)}
      {mode === "radius" && <Marker position={center} icon={markerIcon} />}
      {mode === "radius" && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: activePolygonColor, fillOpacity: 0.15 }} />}
      {mode === "polygon" && polygonPoints.length >= 2 && <Polyline positions={polygonPoints} pathOptions={{ color: activePolygonColor, weight: 3 }} />}
      {mode === "polygon" && hasPolygon && <Polygon positions={polygonPoints} pathOptions={{ color: activePolygonColor, fillOpacity: 0.16 }} />}
      {mode === "polygon" && polygonPoints.map((point, index) => <Marker key={`${point[0]}-${point[1]}-${index}`} position={point} icon={activeVertexIcon} draggable eventHandlers={{ dragend(event) { const latLng = event.target.getLatLng(); onMovePolygonPoint?.(index, [latLng.lat, latLng.lng]); } }} />)}
      {mode === "polygon" && edgeHandles.map((handle) => <Marker key={`edge-${handle.afterIndex}-${handle.position[0]}-${handle.position[1]}`} position={handle.position} icon={edgeHandleIcon} draggable eventHandlers={{ dragend(event) { const latLng = event.target.getLatLng(); onInsertPolygonPoint?.(handle.afterIndex, [latLng.lat, latLng.lng]); } }} />)}
      {visibleOriginAirports.map((airport) => <AirportMarker key={`selected-origin-${airport.code}`} airport={airport} icon={selectedOriginAirportIcon} label="Selected origin" showResultCount={false} />)}
      {highlightedAirports.map((airport) => <AirportMarker key={`departure-result-${airport.code}`} airport={airport} icon={departureResultAirportIcon} label="Departure" />)}
      {highlightedArrivalAirports.map((airport) => <AirportMarker key={`arrival-result-${airport.code}`} airport={airport} icon={arrivalResultAirportIcon} label="Arrival" />)}
    </MapContainer>
  );
}
