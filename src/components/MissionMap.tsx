"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const baseIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const missionIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Icono verde para las bases de otros jugadores
const tradeIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function MissionMap({
  baseCoords,
  misiones,
  basesAjenas = [],
  onSelectMission,
}: any) {
  return (
    <div className="h-full w-full z-0">
      <MapContainer
        center={[baseCoords.lat, baseCoords.lng]}
        zoom={11}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OSM"
        />

        {/* Marcador de tu base */}
        <Marker position={[baseCoords.lat, baseCoords.lng]} icon={baseIcon}>
          <Popup>Tu Gremio</Popup>
        </Marker>

        {/* Marcadores de Misiones PvE */}
        {misiones.map((m: any) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={missionIcon}
            eventHandlers={{ click: () => onSelectMission(m) }}
          />
        ))}

        {/* Marcadores de Bases Ajenas (Comercio) */}
        {basesAjenas.map((base: any) => {
          // Si es tu propia base, no la renderizamos de nuevo
          if (base.lat === baseCoords.lat && base.lng === baseCoords.lng)
            return null;

          return (
            <Marker
              key={`base-${base.id}`}
              position={[base.lat, base.lng]}
              icon={tradeIcon}
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
