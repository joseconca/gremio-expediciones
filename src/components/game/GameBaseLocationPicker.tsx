"use client";

import { useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Coordinates = { lat: number; lng: number };

interface GameBaseLocationPickerProps {
  onStart: (coordinates: Coordinates) => void;
}

function LocationPicker({
  onSelect,
}: {
  onSelect: (coordinates: Coordinates) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

export default function GameBaseLocationPicker({
  onStart,
}: GameBaseLocationPickerProps) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-amber-900/70 bg-stone-950/95 p-4 text-amber-50 shadow-2xl">
      <div>
        <h1 className="text-xl font-bold text-amber-300">Funda tu gremio</h1>
        <p className="mt-1 text-sm text-stone-300">
          Elige en el mapa dónde establecer tu campamento. Esta selección se
          mantiene solo durante esta sesión y no modifica la base de datos.
        </p>
      </div>

      <div className="h-[min(55vh,420px)] min-h-64 overflow-hidden rounded-lg border border-stone-700">
        <MapContainer
          center={[40.4168, -3.7038]}
          zoom={10}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxNativeZoom={19}
            maxZoom={19}
          />
          <LocationPicker onSelect={setCoordinates} />
          {coordinates && (
            <CircleMarker
              center={[coordinates.lat, coordinates.lng]}
              radius={9}
              pathOptions={{ color: "#fbbf24", fillColor: "#b45309", fillOpacity: 0.9 }}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-300" aria-live="polite">
          {coordinates
            ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`
            : "Pulsa en el mapa para elegir una ubicación."}
        </p>
        <button
          type="button"
          disabled={!coordinates}
          onClick={() => coordinates && onStart(coordinates)}
          className="rounded-lg bg-amber-700 px-5 py-3 font-bold text-amber-50 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Establecer base
        </button>
      </div>
    </section>
  );
}
