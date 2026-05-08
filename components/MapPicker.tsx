"use client";

import { useEffect } from "react";
import { Circle, MapContainer, Marker, Polygon, Polyline, Tooltip, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Airport } from "@/data/airports";
import type { Coordinate } from "@/lib/geo";

type HighlightedAirport = Airport & {
  resultCount?: number;
  cheapestPrice?: number | null;
  currency?: string | null;
};

type MapPickerProps = {
  center: Coordinate;
  radiusKm: number;
  mode?: "radius" | "polygon";
  polygonPoints?: Coordinate[];
  highlightedAirports?: HighlightedAirport[];
  onSelect: (next: Coordinate) => void;
  onAddPolygonPoint?: (next: Coordinate) => void;
  onMovePolygonPoint?: (index: number, next: Coordinate) => void;
  onInsertPolygonPoint?: (afterIndex: number, next: Coordinate) => void;
};

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const polygonMarkerIcon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 1px 4px rgba(15,23,42,.35);cursor:grab;"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const edgeHandleIcon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:12px;height:12px;border-radius:9999px;background:#38bdf8;border:2px solid white;box-shadow:0 1px 4px rgba(15,23,42,.28);cursor:grab;"></span>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const resultAirportIcon = L.divIcon({
  className: "",
  html: '<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#16a34a;border:3px solid white;box-shadow:0 2px 8px rgba(15,23,42,.35);color:white;font-size:14px;font-weight:800;">✈</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function midpoint(a: Coordinate, b: Coordinate): Coordinate {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function ClickHandler({ mode, onSelect, onAddPolygonPoint }: { mode: "radius" | "polygon"; onSelect: (next: Coordinate) => void; onAddPolygonPoint?: (next: Coordinate) => void }) {
  useMapEvents({
    click(event) {
      const point: Coordinate = [event.latlng.lat, event.latlng.lng];
      if (mode === "polygon") {
        onAddPolygonPoint?.(point);
        return;
      }

      onSelect(point);
    },
  });

  return null;
}

function MapCenterUpdater({ center, enabled }: { center: Coordinate; enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, enabled, map]);

  return null;
}

export default function MapPicker({ center, radiusKm, mode = "radius", polygonPoints = [], highlightedAirports = [], onSelect, onAddPolygonPoint, onMovePolygonPoint, onInsertPolygonPoint }: MapPickerProps) {
  const hasPolygon = polygonPoints.length >= 3;
  const edgeHandles = hasPolygon
    ? polygonPoints.map((point, index) => ({
        afterIndex: index,
        position: midpoint(point, polygonPoints[(index + 1) % polygonPoints.length]),
      }))
    : [];

  return (
    <MapContainer center={center} zoom={6} className="h-full w-full rounded-xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterUpdater center={center} enabled={mode === "radius"} />
      <ClickHandler mode={mode} onSelect={onSelect} onAddPolygonPoint={onAddPolygonPoint} />
      {mode === "radius" && <Marker position={center} icon={markerIcon} />}
      {mode === "radius" && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: "#2563eb", fillOpacity: 0.15 }} />}
      {mode === "polygon" && polygonPoints.map((point, index) => (
        <Marker
          key={`${point[0]}-${point[1]}-${index}`}
          position={point}
          icon={polygonMarkerIcon}
          draggable
          eventHandlers={{
            dragend(event) {
              const marker = event.target;
              const latLng = marker.getLatLng();
              onMovePolygonPoint?.(index, [latLng.lat, latLng.lng]);
            },
          }}
        />
      ))}
      {mode === "polygon" && polygonPoints.length >= 2 && <Polyline positions={polygonPoints} pathOptions={{ color: "#2563eb", weight: 3 }} />}
      {mode === "polygon" && hasPolygon && <Polygon positions={polygonPoints} pathOptions={{ color: "#2563eb", fillOpacity: 0.16 }} />}
      {mode === "polygon" && edgeHandles.map((handle) => (
        <Marker
          key={`edge-${handle.afterIndex}-${handle.position[0]}-${handle.position[1]}`}
          position={handle.position}
          icon={edgeHandleIcon}
          draggable
          eventHandlers={{
            dragend(event) {
              const marker = event.target;
              const latLng = marker.getLatLng();
              onInsertPolygonPoint?.(handle.afterIndex, [latLng.lat, latLng.lng]);
            },
          }}
        />
      ))}
      {highlightedAirports.map((airport) => (
        <Marker key={`result-${airport.code}`} position={[airport.lat, airport.lng]} icon={resultAirportIcon} zIndexOffset={1000}>
          <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
            <span>
              <strong>{airport.code} — {airport.city}</strong>
              <br />
              {airport.resultCount ?? 0} result{airport.resultCount === 1 ? "" : "s"}
              {airport.cheapestPrice !== null && airport.cheapestPrice !== undefined && airport.currency ? ` · from ${airport.currency} ${airport.cheapestPrice}` : ""}
            </span>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
