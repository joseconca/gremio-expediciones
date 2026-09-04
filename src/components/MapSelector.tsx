"use client";

import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Icono para tu futura base (Azul)
const campIcon = new L.Icon({
  iconUrl: "/camp.jpg",
  iconSize: [42, 42],
  iconAnchor: [21, 38],
  className: "camp-map-icon",
});

// Icono para las bases de otros jugadores (Verde)
const enemyBaseIcon = campIcon;

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
    <Marker position={position} icon={campIcon}>
      <Popup>Tu futura base</Popup>
    </Marker>
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
  const [basesAjenas, setBasesAjenas] = useState<any[]>([]);

  // Cargamos las bases de otros jugadores al montar el mapa
  useEffect(() => {
    fetch("/api/bases")
      .then((res) => res.json())
      .then((data) => {
        if (data.bases) setBasesAjenas(data.bases);
      })
      .catch((err) => console.error("Error cargando bases", err));
  }, []);

  const defaultCenter: [number, number] = [40.4168, -3.7038];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[400px] w-full rounded-lg overflow-hidden border border-slate-300 shadow-sm z-0">
        <MapContainer
          center={defaultCenter}
          zoom={10}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://opentopomap.org">OpenTopoMap</a>'
            maxNativeZoom={17}
            maxZoom={17}
          />

          <LocationMarker onLocationSelect={setSelectedCoords} />

          {/* Renderizar las bases de los demás */}
          {basesAjenas.map((base) => (
            <Marker
              key={base.id}
              position={[base.lat, base.lng]}
              icon={enemyBaseIcon}
            >
              <Popup>
                <div className="text-center font-bold text-slate-800">
                  {base.nombre} <br />
                  <span className="text-xs text-slate-500 font-normal">
                    Nivel {base.nivel}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {selectedCoords && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border border-slate-300 rounded-lg shadow-sm animate-in fade-in duration-300">
          <div className="mb-4 sm:mb-0 text-center sm:text-left">
            <p className="text-sm text-slate-500 uppercase tracking-wider">
              Coordenadas
            </p>
            <p className="text-xl font-bold text-slate-800">
              {selectedCoords.lat.toFixed(4)} | {selectedCoords.lng.toFixed(4)}
            </p>
          </div>
          <button
            onClick={() => onSaveLocation(selectedCoords)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg"
          >
            Construir Aquí
          </button>
        </div>
      )}
    </div>
  );
}
