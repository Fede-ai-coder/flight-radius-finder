"use client";

import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import React from "react";

type MapPickerProps = {
  center: [number, number];
  radiusKm: number;
  onSelect: (next: [number, number]) => void;
};

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});


function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();

  React.useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

function ClickHandler({ onSelect }: { onSelect: (next: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

export default function MapPicker({ center, radiusKm, onSelect }: MapPickerProps) {
  return (
    <MapContainer center={center} zoom={6} className="h-full w-full rounded-xl">
      <RecenterMap center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onSelect={onSelect} />
      <Marker position={center} icon={markerIcon} />
      <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: "#2563eb", fillOpacity: 0.15 }} />
    </MapContainer>
  );
}
