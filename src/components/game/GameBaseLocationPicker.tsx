"use client";

import { FormEvent, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { CreatePlayerRequest, PlayerSex } from "@/shared/world";

type Coordinates = { lat: number; lng: number };

interface GameBaseLocationPickerProps {
  onStart: (request: CreatePlayerRequest) => void;
  busy?: boolean;
  errorMessage?: string | null;
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

const INPUT_CLASS =
  "w-full rounded border border-stone-600 bg-stone-900 p-2 text-sm text-amber-50";

export default function GameBaseLocationPicker({
  onStart,
  busy = false,
  errorMessage = null,
}: GameBaseLocationPickerProps) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [baseName, setBaseName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [sex, setSex] = useState<PlayerSex>("chico");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!coordinates) return;
    onStart({ ...coordinates, baseName, playerName, sex });
  };

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-amber-900/70 bg-stone-950/95 p-4 text-amber-50 shadow-2xl"
    >
      <div>
        <h1 className="text-xl font-bold text-amber-300">Funda tu poblado</h1>
        <p className="mt-1 text-sm text-stone-300">
          Elige en el mapa d&oacute;nde levantar tu campamento. La ubicaci&oacute;n es
          permanente y debe quedar al menos a 200 m de cualquier otra base.
        </p>
      </div>

      <div className="h-[min(45vh,360px)] min-h-56 overflow-hidden rounded-lg border border-stone-700">
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

      <p className="text-sm text-stone-300" aria-live="polite">
        {coordinates
          ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`
          : "Pulsa en el mapa para elegir una ubicaci\u00f3n."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Nombre del poblado
          <input
            required
            minLength={2}
            maxLength={32}
            value={baseName}
            onChange={(event) => setBaseName(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <label className="text-sm">
          Nombre del personaje
          <input
            required
            minLength={2}
            maxLength={24}
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <fieldset className="flex items-center gap-4 text-sm">
        <legend className="mb-1">Personaje</legend>
        {(["chico", "chica"] as const).map((option) => (
          <label key={option} className="flex items-center gap-2">
            <input
              type="radio"
              name="sex"
              checked={sex === option}
              onChange={() => setSex(option)}
            />
            {option === "chico" ? "Chico" : "Chica"}
          </label>
        ))}
        <span className="text-stone-400">Clase inicial: Novato</span>
      </fieldset>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-300">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!coordinates || busy}
        className="rounded-lg bg-amber-700 px-5 py-3 font-bold text-amber-50 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Fundando..." : "Comenzar aventura"}
      </button>
    </form>
  );
}
