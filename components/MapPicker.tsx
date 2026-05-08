"use client";

import { useEffect } from "react";
import { Circle, MapContainer, Marker, Polygon, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Coordinate } from "@/lib/geo";

type MapPickerProps = {
  center: Coordinate;
  radiusKm: number;
  mode?: "radius" | "polygon";
  polygonPoints?: Coordinate[];
  onSelect: (next: Coordinate) => void;
  onAddPolygonPoint?: (next: Coordinate) => void;
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
  html: '<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 1px 4px rgba(15,23,42,.35);"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

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

function MapCenterUpdater({ center }: { center: Coordinate }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

export default function MapPicker({ center, radiusKm, mode = "radius", polygonPoints = [], onSelect, onAddPolygonPoint }: MapPickerProps) {
  const hasPolygon = polygonPoints.length >= 3;

  return (
    <MapContainer center={center} zoom={6} className="h-full w-full rounded-xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterUpdater center={center} />
      <ClickHandler mode={mode} onSelect={onSelect} onAddPolygonPoint={onAddPolygonPoint} />
      {mode === "radius" && <Marker position={center} icon={markerIcon} />}
      {mode === "radius" && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: "#2563eb", fillOpacity: 0.15 }} />}
      {mode === "polygon" && polygonPoints.map((point, index) => <Marker key={`${point[0]}-${point[1]}-${index}`} position={point} icon={polygonMarkerIcon} />)}
      {mode === "polygon" && polygonPoints.length >= 2 && <Polyline positions={polygonPoints} pathOptions={{ color: "#2563eb", weight: 3 }} />}
      {mode === "polygon" && hasPolygon && <Polygon positions={polygonPoints} pathOptions={{ color: "#2563eb", fillOpacity: 0.16 }} />}
    </MapContainer>
  );
}
