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

function LocationMarker({
  onLocationSelect,
}: {
  onLocationSelect: (coords: { lat: number; lng: number }) => void;
}) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    click(e: any) {
      setPosition(e.latlng);
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={customIcon} />
  );
}

interface MapSelectorProps {
  onSaveLocation: (coords: { lat: number; lng: number }) => void;
}

export default function MapSelector({ onSaveLocation }: MapSelectorProps) {
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Centro peninsular
  const defaultCenter: [number, number] = [40.4168, -3.7038];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[400px] w-full rounded-lg overflow-hidden border border-slate-300 shadow-sm z-0">
        <MapContainer center={defaultCenter} zoom={6} className="h-full w-full">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
          <LocationMarker onLocationSelect={setSelectedCoords} />
        </MapContainer>
      </div>

      {selectedCoords && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border border-slate-300 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="mb-4 sm:mb-0 text-center sm:text-left">
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">
              Lugar seleccionado
            </p>
            <p className="text-xl font-bold text-slate-800">
              Lat: {selectedCoords.lat.toFixed(4)}{" "}
              <span className="text-slate-300">|</span> Lng:{" "}
              {selectedCoords.lng.toFixed(4)}
            </p>
          </div>

          <button
            onClick={() => onSaveLocation(selectedCoords)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all active:scale-95"
          >
            Construir Base Aquí
          </button>
        </div>
      )}
    </div>
  );
}
