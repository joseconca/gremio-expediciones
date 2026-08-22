"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function LocationMarker({ onLocationSelect }: { onLocationSelect: (latlng: any) => void }) {
  const [position, setPosition] = useState(null);
  
  useMapEvents({
    click(e: any) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={customIcon} />
  );
}

interface MapSelectorProps {
  onSaveLocation: (coords: {lat: number, lng: number}) => void;
}

export default function MapSelector({ onSaveLocation }: MapSelectorProps) {
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);

  // Centro peninsular
  const defaultCenter: [number, number] = [40.4168, -3.7038]; 

  return (
    <div className="relative h-[400px] w-full rounded-lg overflow-hidden border border-slate-300 shadow-sm">
      <MapContainer center={defaultCenter} zoom={6} className="h-full w-full">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        <LocationMarker onLocationSelect={setSelectedCoords} />
      </MapContainer>

      {selectedCoords && (
        <button
          onClick={() => onSaveLocation(selectedCoords)}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors"
        >
          Construir Base Aquí
        </button>
      )}
    </div>
  );
}