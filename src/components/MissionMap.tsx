"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const campIcon = new L.Icon({
  iconUrl: "/camp.jpg",
  iconSize: [42, 42],
  iconAnchor: [21, 38],
  className: "camp-map-icon",
});

const missionIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const destinationIcon = L.divIcon({
  className: "destination-map-icon",
  html: '<span aria-hidden="true">🏁</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const heroIcon = L.divIcon({
  className: "hero-route-marker",
  html: '<img src="/warrior.png" alt="" aria-hidden="true" />',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function RutaExpedicion({
  baseCoords,
  destino,
  fechaSalida,
  fechaLlegada,
}: {
  baseCoords: { lat: number; lng: number };
  destino: { lat: number; lng: number } | null;
  fechaSalida?: string;
  fechaLlegada?: string;
}) {
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    if (!destino) return;
    const inicio = Date.now();
    const salida = fechaSalida ? new Date(fechaSalida).getTime() : 0;
    const llegada = fechaLlegada ? new Date(fechaLlegada).getTime() : 0;
    const usaTiempoReal = Number.isFinite(salida) && llegada > salida;
    const duracion = 12000;
    const intervalo = setInterval(() => {
      const ahora = Date.now();
      const transcurrido = usaTiempoReal ? ahora - salida : ahora - inicio;
      const duracionViaje = usaTiempoReal ? llegada - salida : duracion;
      setProgreso(Math.max(0, Math.min(transcurrido / duracionViaje, 1)));
    }, 80);
    return () => clearInterval(intervalo);
  }, [destino, fechaSalida, fechaLlegada]);

  if (!destino) return null;

  const posicionHeroe: [number, number] = [
    baseCoords.lat + (destino.lat - baseCoords.lat) * progreso,
    baseCoords.lng + (destino.lng - baseCoords.lng) * progreso,
  ];

  return (
    <>
      <Polyline
        positions={[[baseCoords.lat, baseCoords.lng], [destino.lat, destino.lng]]}
        pathOptions={{ color: "#facc15", weight: 4, dashArray: "8 10", opacity: 1 }}
      />
      <Marker position={[destino.lat, destino.lng]} icon={destinationIcon}>
        <Popup>Destino de la expedición</Popup>
      </Marker>
      <Marker position={posicionHeroe} icon={heroIcon} />
      <Tooltip
        direction="top"
        offset={[0, -18]}
        permanent
        opacity={1}
        position={posicionHeroe}
      >
        {Math.round(progreso * 100)}% del recorrido
      </Tooltip>
    </>
  );
}

interface MisionMapa {
  id: string | number;
  lat: number;
  lng: number;
  nombre: string;
  dificultad?: number;
  recompensa?: number;
  desc?: string;
  tipo?: string;
}

interface BaseMapa {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  nivel: number;
}

interface MissionMapProps {
  baseCoords: { lat: number; lng: number };
  misiones: MisionMapa[];
  basesAjenas?: BaseMapa[];
  destinoExpedicion?: { lat: number; lng: number } | null;
  fechaSalida?: string;
  fechaLlegada?: string;
  onSelectMission: (mision: MisionMapa) => void;
}

export default function MissionMap({
  baseCoords,
  misiones,
  basesAjenas = [],
  onSelectMission,
  destinoExpedicion = null,
  fechaSalida,
  fechaLlegada,
}: MissionMapProps) {
  return (
    <div className="h-full w-full z-0">
      <MapContainer
        center={[baseCoords.lat, baseCoords.lng]}
        zoom={11}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://opentopomap.org">OpenTopoMap</a>'
          maxNativeZoom={17}
          maxZoom={17}
        />

        {/* Marcador de tu base */}
        <Marker position={[baseCoords.lat, baseCoords.lng]} icon={campIcon}>
          <Popup>Tu Gremio</Popup>
        </Marker>

        <RutaExpedicion
          key={destinoExpedicion ? `${destinoExpedicion.lat}-${destinoExpedicion.lng}` : "sin-destino"}
          baseCoords={baseCoords}
          destino={destinoExpedicion}
          fechaSalida={fechaSalida}
          fechaLlegada={fechaLlegada}
        />

        {/* Marcadores de Misiones PvE */}
        {misiones.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={missionIcon}
            eventHandlers={{ click: () => onSelectMission(m) }}
          />
        ))}

        {/* Marcadores de Bases Ajenas (Comercio) */}
        {basesAjenas.map((base) => {
          // Si es tu propia base, no la renderizamos de nuevo
          if (base.lat === baseCoords.lat && base.lng === baseCoords.lng)
            return null;

          return (
            <Marker
              key={`base-${base.id}`}
              position={[base.lat, base.lng]}
              icon={campIcon}
              eventHandlers={{
                click: () =>
                  onSelectMission({
                    id: `comercio-${base.id}`,
                    lat: base.lat,
                    lng: base.lng,
                    nombre: `Comerciar: ${base.nombre}`,
                    dificultad: 0,
                    recompensa: base.nivel * 25, // Ejemplo: A más nivel, mejor comercio
                    desc: `Envía a tu personaje a intercambiar bienes con el gremio de ${base.nombre}. Ambos recibiréis beneficios.`,
                    tipo: "comercio", // Importante para la lógica de resolución futura
                  }),
              }}
            >
              <Popup>{base.nombre}</Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
