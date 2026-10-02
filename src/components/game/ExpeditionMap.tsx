"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { expeditionPosition, type ExpeditionDto, type MissionDto } from "@/shared/expeditions";

export interface ExpeditionMapProps {
  base: { lat: number; lng: number };
  missions: MissionDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  active: ExpeditionDto | null;
  serverNow: number;
}

function icon(symbol: string, color: string) {
  return L.divIcon({
    className: "expedition-map-icon",
    html: `<span aria-hidden="true" style="display:grid;place-items:center;width:36px;height:36px;border:2px solid ${color};border-radius:50%;background:#17120f;box-shadow:0 2px 8px #0008;font-size:22px">${symbol}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// Fixed icons are shared; no remote icon requests or interpolated HTML from DTOs.
const baseIcon = icon("🏕️", "#fcd34d");
const cartIcon = icon("🛒", "#fcd34d");
const missionIcons = {
  normal: icon("⚔️", "#fb7185"),
  elite: icon("👑", "#c084fc"),
  trade: icon("📦", "#6ee7b7"),
};
const selectedIcon = icon("📍", "#fcd34d");

/** Keep route, bounds and markers in the same nearest copy of the world. */
function unwrapLongitude(lng: number, origin: number): number {
  return origin + ((lng - origin + 540) % 360) - 180;
}

function tooltipText(text: string): HTMLSpanElement {
  const node = document.createElement("span");
  node.textContent = text;
  return node;
}

function MapLayers({ base, missions, selectedId, onSelect, active, serverNow }: ExpeditionMapProps) {
  const map = useMap();
  const travelling = active !== null && active.phase !== "completed";
  const origin = active?.origin ?? base;
  const destination = travelling ? active.mission : missions.find((mission) => mission.id === selectedId);
  const destinationLat = destination?.lat;
  const destinationLng = destination?.lng;
  const destinationId = destination?.id;
  const destinationKind = destination?.kind;
  const destinationName = destination?.name;
  const catalogBounds = missions.map((mission) => `${mission.lat},${unwrapLongitude(mission.lng, origin.lng)}`).join(";");

  useEffect(() => {
    const layers = L.layerGroup().addTo(map);
    L.marker([origin.lat, origin.lng], { icon: baseIcon, title: "Tu poblado", alt: "Tu poblado" })
      .bindTooltip(tooltipText("Tu poblado")).addTo(layers);

    const visible = travelling && destinationId && destinationLat !== undefined && destinationLng !== undefined
      && destinationKind && destinationName
      ? [{ id: destinationId, lat: destinationLat, lng: destinationLng, kind: destinationKind, name: destinationName }]
      : missions;
    for (const mission of visible) {
      const selected = mission.id === destinationId;
      const marker = L.marker([mission.lat, unwrapLongitude(mission.lng, origin.lng)], {
        icon: selected && !travelling ? selectedIcon : missionIcons[mission.kind],
        title: travelling ? mission.name : `Seleccionar: ${mission.name}`,
        alt: mission.name,
        keyboard: !travelling,
      }).bindTooltip(tooltipText(mission.name)).addTo(layers);
      if (!travelling) marker.on("click", () => onSelect(mission.id));
    }
    if (destinationLat !== undefined && destinationLng !== undefined) {
      L.polyline([
        [origin.lat, origin.lng],
        [destinationLat, unwrapLongitude(destinationLng, origin.lng)],
      ], { color: "#d97706", weight: 4, dashArray: "8 8", interactive: false }).addTo(layers);
    }
    return () => { layers.remove(); };
  }, [map, origin.lat, origin.lng, missions, onSelect, travelling, destinationId, destinationLat, destinationLng, destinationKind, destinationName]);

  useEffect(() => {
    const points: L.LatLngTuple[] = [[origin.lat, origin.lng]];
    if (destinationLat !== undefined && destinationLng !== undefined) {
      points.push([destinationLat, unwrapLongitude(destinationLng, origin.lng)]);
    } else if (catalogBounds) {
      for (const point of catalogBounds.split(";")) {
        const [lat, lng] = point.split(",").map(Number);
        points.push([lat, lng]);
      }
    }
    const resizeAndFit = () => {
      // A collapsed mobile map has 0x0 dimensions: fitting then locks in an
      // incorrect zoom. Refit when the panel becomes visible or rotates.
      const container = map.getContainer();
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      map.invalidateSize({ pan: false });
      map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15, animate: false });
    };
    const observer = new ResizeObserver(resizeAndFit);
    observer.observe(map.getContainer());
    resizeAndFit();
    return () => observer.disconnect();
  }, [map, origin.lat, origin.lng, destinationLat, destinationLng, catalogBounds]);

  useEffect(() => {
    if (!active || active.phase === "completed") return;
    const marker = L.marker([active.origin.lat, active.origin.lng], {
      icon: cartIcon, title: "Carro de expedición", alt: "Carro de expedición", zIndexOffset: 1000,
    }).addTo(map);
    const label = tooltipText("Carro de expedición");
    marker.bindTooltip(label);
    const receivedAt = performance.now();
    const update = () => {
      // Presentation only: reaching the destination never advances server gameplay.
      const position = expeditionPosition(active, serverNow + performance.now() - receivedAt);
      marker.setLatLng([position.lat, unwrapLongitude(position.lng, active.origin.lng)]);
      label.textContent = active.phase === "battle" ? "Carro · encuentro" : `Carro · ${Math.round(position.progress * 100)}%`;
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => { window.clearInterval(interval); marker.remove(); };
  }, [map, active, serverNow]);

  return null;
}

/** Import through next/dynamic with ssr:false: Leaflet requires the browser. */
export default function ExpeditionMap(props: ExpeditionMapProps) {
  const origin = props.active?.origin ?? props.base;
  return (
    <div className="relative isolate h-full min-h-40 w-full overflow-hidden rounded-lg border border-amber-100/20 bg-slate-800" role="region" aria-label="Mapa de expediciones. También puedes seleccionar una misión en la lista.">
      <MapContainer center={[origin.lat, origin.lng]} zoom={13} className="h-full min-h-40 w-full" scrollWheelZoom={false}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <MapLayers {...props} />
      </MapContainer>
    </div>
  );
}