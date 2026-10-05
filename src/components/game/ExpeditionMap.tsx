"use client";

import { useEffect, useEffectEvent, useMemo, useRef } from "react";
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

type MapMission = Pick<MissionDto, "id" | "name" | "kind" | "lat" | "lng">;

function icon(symbol: string, color: string) {
  return L.divIcon({
    className: "expedition-map-icon",
    html: `<span aria-hidden="true" style="display:grid;place-items:center;width:44px;height:44px;border:2px solid ${color};border-radius:50%;background:#17120f;box-shadow:0 2px 8px #0008;font-size:24px">${symbol}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// No DTO text is interpolated into icon HTML.
const baseIcon = icon("🏕️", "#fcd34d");
const cartIcon = icon("🛒", "#fcd34d");
const missionIcons = {
  normal: icon("⚔️", "#fb7185"),
  elite: icon("👑", "#c084fc"),
  trade: icon("📦", "#6ee7b7"),
};
const selectedIcon = icon("📍", "#fcd34d");

/** Keep markers and routes in the same nearest copy of the world. */
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
  const markers = useRef(new Map<string, L.Marker>());
  const fittedInitial = useRef(false);
  const cartRef = useRef<L.Marker | null>(null);
  const travelling = active !== null && active.phase !== "completed";
  const origin = travelling ? active.origin : base;
  const destination = travelling ? active.mission : missions.find((mission) => mission.id === selectedId);
  const destinationLat = destination?.lat;
  const destinationLng = destination?.lng;
  const previousSelection = useRef<string | null>(null);

  // Polling clones full DTOs. Only changed marker content may rebuild this layer.
  const signature = JSON.stringify(missions.map(({ id, name, kind, lat, lng }) => ({ id, name, kind, lat, lng })));
  const catalog = useMemo(() => JSON.parse(signature) as MapMission[], [signature]);
  const select = useEffectEvent((id: string) => onSelect(id));

  useEffect(() => {
    const marker = L.marker([origin.lat, origin.lng], {
      icon: baseIcon, title: "Tu poblado", alt: "Tu poblado", keyboard: false,
      autoPanOnFocus: false,
    }).bindTooltip(tooltipText("Tu poblado")).addTo(map);
    return () => { marker.remove(); };
  }, [map, origin.lat, origin.lng]);

  useEffect(() => {
    const layers = L.layerGroup().addTo(map);
    const currentMarkers = markers.current;
    for (const mission of catalog) {
      const marker = L.marker([mission.lat, unwrapLongitude(mission.lng, origin.lng)], {
        icon: missionIcons[mission.kind], title: `Seleccionar: ${mission.name}`, alt: mission.name,
        keyboard: true, autoPanOnFocus: false,
      }).bindTooltip(tooltipText(mission.name)).addTo(layers);
      marker.on("click", () => select(mission.id));
      currentMarkers.set(mission.id, marker);
    }
    return () => { currentMarkers.clear(); layers.remove(); };
  }, [map, catalog, origin.lng]);

  useEffect(() => {
    for (const mission of catalog) {
      const marker = markers.current.get(mission.id);
      const nextIcon = mission.id === selectedId ? selectedIcon : missionIcons[mission.kind];
      // Avoid replacing DOM/focused markers for unchanged selections.
      if (marker && marker.options.icon !== nextIcon) marker.setIcon(nextIcon);
    }
  }, [catalog, selectedId, origin.lng]);

  useEffect(() => {
    if (destinationLat === undefined || destinationLng === undefined) return;
    const route = L.polyline([
      [origin.lat, origin.lng],
      [destinationLat, unwrapLongitude(destinationLng, origin.lng)],
    ], { color: "#d97706", weight: 4, dashArray: "8 8", interactive: false }).addTo(map);
    // A persisted active destination can outlive the current catalog.
    const destinationMarker = travelling ? L.marker([destinationLat, unwrapLongitude(destinationLng, origin.lng)], {
      icon: selectedIcon, keyboard: false, autoPanOnFocus: false, title: "Destino de la expedición", alt: "Destino de la expedición",
    }).addTo(map) : null;
    return () => { route.remove(); destinationMarker?.remove(); };
  }, [map, origin.lat, origin.lng, destinationLat, destinationLng, travelling]);

  const fitInitial = useEffectEvent(() => {
    // Wait for the first real catalog and nonzero viewport, never fit on selection or polling.
    if (fittedInitial.current || (catalog.length === 0 && !travelling)) return;
    const container = map.getContainer();
    if (container.clientWidth === 0 || container.clientHeight === 0) return;
    const points: L.LatLngTuple[] = [[origin.lat, origin.lng]];
    for (const mission of catalog) {
      if (mission.kind !== "trade") points.push([mission.lat, unwrapLongitude(mission.lng, origin.lng)]);
    }
    if (travelling) points.push([active.mission.lat, unwrapLongitude(active.mission.lng, origin.lng)]);
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15, animate: false });
    fittedInitial.current = true;
  });

  useEffect(() => {
    fitInitial();
  }, [catalog, travelling]);

  useEffect(() => {
    if (!selectedId || selectedId === previousSelection.current) return;
    previousSelection.current = selectedId;
    const mission = catalog.find((item) => item.id === selectedId);
    if (mission?.kind !== "trade") return;
    const endpoint = [mission.lat, unwrapLongitude(mission.lng, origin.lng)] as L.LatLngTuple;
    map.fitBounds(L.latLngBounds([[origin.lat, origin.lng], endpoint]), { padding: [36, 36], maxZoom: 9, animate: true });
  }, [map, selectedId, catalog, origin.lat, origin.lng]);

  useEffect(() => {
    const resize = () => {
      const container = map.getContainer();
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      map.invalidateSize({ pan: false });
      fitInitial();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(map.getContainer());
    resize();
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (!travelling) return;
    const marker = L.marker([origin.lat, origin.lng], {
      icon: cartIcon, title: "Carro de expedición", alt: "Carro de expedición", zIndexOffset: 1000,
      keyboard: false, autoPanOnFocus: false,
    }).bindTooltip(tooltipText("Carro de expedición")).addTo(map);
    cartRef.current = marker;
    return () => { cartRef.current = null; marker.remove(); };
  }, [map, travelling, origin.lat, origin.lng]);

  useEffect(() => {
    if (!active || active.phase === "completed") return;
    const receivedAt = performance.now();
    const update = () => {
      // Presentation only: arrival does not advance gameplay or award loot.
      const position = expeditionPosition(active, serverNow + performance.now() - receivedAt);
      cartRef.current?.setLatLng([position.lat, unwrapLongitude(position.lng, active.origin.lng)]);
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [active, serverNow]);

  return null;
}

/** Import dynamically with ssr:false: Leaflet requires the browser. */
export default function ExpeditionMap(props: ExpeditionMapProps) {
  const origin = props.active && props.active.phase !== "completed" ? props.active.origin : props.base;
  return (
    <div className="relative isolate h-full min-h-0 w-full overflow-hidden rounded-lg border border-amber-100/20 bg-slate-800 [image-rendering:auto] [&_.leaflet-control-zoom_a]:!h-11 [&_.leaflet-control-zoom_a]:!w-11 [&_.leaflet-control-zoom_a]:!leading-[44px] [&_.leaflet-marker-icon]:focus-visible:outline-2 [&_.leaflet-marker-icon]:focus-visible:outline-offset-2 [&_.leaflet-marker-icon]:focus-visible:outline-amber-400" role="region" aria-label="Mapa de expediciones. Selecciona un marcador para ver sus detalles.">
      <MapContainer center={[origin.lat, origin.lng]} zoom={13} className="h-full min-h-0 w-full" scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} />
        <MapLayers {...props} />
      </MapContainer>
    </div>
  );
}