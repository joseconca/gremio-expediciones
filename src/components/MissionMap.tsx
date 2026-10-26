"use client";

import { useEffect, useState } from "react";
import type { BaseMapa, DefinicionMision } from "@/lib/tiposJuego";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";

const campIcon = new L.Icon({
  iconUrl: "/sprites/buildings/camp.png",
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

const bossIcon = L.divIcon({
  className: "boss-daily-map-icon",
  html: '<span aria-hidden="true" style="display:grid;place-items:center;width:38px;height:38px;background:#33203e;border:2px solid #dfae62;border-radius:50%;font-size:23px;box-shadow:0 2px 8px #0009">♛</span>',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

const destinationIcon = L.divIcon({
  className: "destination-map-icon",
  html: '<span aria-hidden="true">🏁</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function crearHeroIcon(clase?: string | null, sexo?: string | null, profesionActivaId?: string | null) {
  return L.divIcon({
    className: "hero-route-marker",
    html: `<img src="${obtenerSpriteHeroe(clase, sexo, profesionActivaId)}" alt="" aria-hidden="true" />`,
    iconSize: [64, 64],
    iconAnchor: [32, 32],
  });
}

function RutaExpedicion({
  baseCoords,
  destino,
  fechaSalida,
  fechaLlegada,
  nombreHeroe = "Aventurero",
  claseHeroe,
  sexoHeroe,
  profesionActivaIdHeroe,
  regresando = false,
  etiquetaDestino,
}: {
  baseCoords: { lat: number; lng: number };
  destino: { lat: number; lng: number } | null;
  fechaSalida?: string;
  fechaLlegada?: string;
  nombreHeroe?: string;
  claseHeroe?: string | null;
  sexoHeroe?: string | null;
  profesionActivaIdHeroe?: string | null;
  regresando?: boolean;
  etiquetaDestino?: string;
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

  const origenRuta = regresando ? destino : baseCoords;
  const destinoRuta = regresando ? baseCoords : destino;
  const posicionHeroe: [number, number] = [
    origenRuta.lat + (destinoRuta.lat - origenRuta.lat) * progreso,
    origenRuta.lng + (destinoRuta.lng - origenRuta.lng) * progreso,
  ];

  return (
    <>
      <Polyline
        positions={[
          [baseCoords.lat, baseCoords.lng],
          [destino.lat, destino.lng],
        ]}
        pathOptions={{
          color: "#172033",
          weight: 6,
          dashArray: "8 10",
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      <Polyline
        positions={[
          [baseCoords.lat, baseCoords.lng],
          [destino.lat, destino.lng],
        ]}
        pathOptions={{
          color: "#facc15",
          weight: 4,
          dashArray: "8 10",
          opacity: 1,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      <Marker position={[destino.lat, destino.lng]} icon={destinationIcon}>
        <Popup>
          {etiquetaDestino ?? (regresando ? "Lugar de la misión" : "Destino de la expedición")}
        </Popup>
      </Marker>
      <Marker
        position={posicionHeroe}
        icon={crearHeroIcon(claseHeroe, sexoHeroe, profesionActivaIdHeroe)}
      />
      <Tooltip
        direction="top"
        offset={[0, -18]}
        permanent
        opacity={1}
        position={posicionHeroe}
      >
        {nombreHeroe} · {Math.round(progreso * 100)}% del recorrido
      </Tooltip>
    </>
  );
}

interface RutaEntrante {
  id: string;
  origenCoords: { lat: number; lng: number };
  fechaSalida: string;
  fechaLlegada: string;
  nombreHeroe: string;
  claseHeroe?: string | null;
  sexoHeroe?: string | null;
  profesionActivaIdHeroe?: string | null;
}

function AjustarVistaRuta({
  baseCoords,
  destino,
}: {
  baseCoords: { lat: number; lng: number };
  destino: { lat: number; lng: number };
}) {
  const mapa = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(
      [baseCoords.lat, baseCoords.lng],
      [destino.lat, destino.lng],
    );
    mapa.fitBounds(bounds, {
      padding: [42, 42],
      maxZoom: 11,
      animate: false,
    });
  }, [mapa, baseCoords.lat, baseCoords.lng, destino.lat, destino.lng]);

  return null;
}

interface MissionMapProps {
  baseCoords: { lat: number; lng: number };
  misiones: DefinicionMision[];
  ajustarVistaRuta?: boolean;
  etiquetaBase?: string;
  etiquetaDestino?: string;
  basesAjenas?: BaseMapa[];
  destinoExpedicion?: { lat: number; lng: number } | null;
  fechaSalida?: string;
  fechaLlegada?: string;
  claseHeroe?: string | null;
  sexoHeroe?: string | null;
  profesionActivaIdHeroe?: string | null;
  nombreHeroe?: string;
  rutasEntrantes?: RutaEntrante[];
  regresando?: boolean;
  onSelectMission: (mision: DefinicionMision) => void;
  onSelectBase?: (base: BaseMapa) => void; // AÑADIDO: Prop para manejar clicks en bases
}

export default function MissionMap({
  baseCoords,
  misiones,
  basesAjenas = [],
  onSelectMission,
  onSelectBase,
  destinoExpedicion = null,
  fechaSalida,
  fechaLlegada,
  claseHeroe,
  sexoHeroe,
  profesionActivaIdHeroe,
  nombreHeroe = "Aventurero",
  rutasEntrantes = [],
  regresando = false,
  ajustarVistaRuta = false,
  etiquetaBase = "Tu Gremio",
  etiquetaDestino,
}: MissionMapProps) {
  return (
    <div className="h-full w-full z-0">
      <MapContainer
        key={`${baseCoords.lat}:${baseCoords.lng}`}
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

        {/* Encaja los dos extremos en pantalla cuando el mapa representa un traslado. */}
        {ajustarVistaRuta && destinoExpedicion && (
          <AjustarVistaRuta baseCoords={baseCoords} destino={destinoExpedicion} />
        )}

        {/* Marcador de la base de referencia */}
        <Marker position={[baseCoords.lat, baseCoords.lng]} icon={campIcon}>
          <Popup>{etiquetaBase}</Popup>
        </Marker>

        <RutaExpedicion
          key={
            destinoExpedicion
              ? `${destinoExpedicion.lat}-${destinoExpedicion.lng}`
              : "sin-destino"
          }
          baseCoords={baseCoords}
          destino={destinoExpedicion}
          fechaSalida={fechaSalida}
          fechaLlegada={fechaLlegada}
          nombreHeroe={nombreHeroe}
          claseHeroe={claseHeroe}
          sexoHeroe={sexoHeroe}
          profesionActivaIdHeroe={profesionActivaIdHeroe}
          regresando={regresando}
          etiquetaDestino={etiquetaDestino}
        />

        {rutasEntrantes.map((ruta) => (
          <RutaExpedicion
            key={`entrante-${ruta.id}`}
            baseCoords={ruta.origenCoords}
            destino={baseCoords}
            fechaSalida={ruta.fechaSalida}
            fechaLlegada={ruta.fechaLlegada}
            nombreHeroe={ruta.nombreHeroe}
            claseHeroe={ruta.claseHeroe}
            sexoHeroe={ruta.sexoHeroe}
            profesionActivaIdHeroe={ruta.profesionActivaIdHeroe}
          />
        ))}

        {/* Marcadores de Misiones PvE */}
        {misiones.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={m.tipo === "elite" ? bossIcon : missionIcon}
            title={m.tipo === "elite" ? `Boss diario · ${m.nombre}` : m.nombre}
            eventHandlers={{ click: () => onSelectMission(m) }}
          >
            {m.tipo === "elite" && <Tooltip direction="top">Boss diario · {m.nombre}</Tooltip>}
          </Marker>
        ))}

        {/* Marcadores de Bases Ajenas SIN Popup */}
        {basesAjenas.map((base) => {
          if (base.lat === baseCoords.lat && base.lng === baseCoords.lng) {
            return null;
          }

          return (
            <Marker
              key={`base-${base.id}`}
              position={[base.lat, base.lng]}
              icon={campIcon}
              eventHandlers={{
                click: () => onSelectBase && onSelectBase(base),
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
