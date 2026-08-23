"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const baseIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const missionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function MissionMap({ baseCoords, misiones, onSelectMission }: any) {
  return (
    <div className="h-full w-full z-0">
      <MapContainer center={[baseCoords.lat, baseCoords.lng]} zoom={11} className="h-full w-full">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OSM'
        />
        
        {/* Marcador de tu base */}
        <Marker position={[baseCoords.lat, baseCoords.lng]} icon={baseIcon}>
          <Popup>Tu Gremio</Popup>
        </Marker>

        {/* Marcadores de las misiones */}
        {misiones.map((m: any) => (
          <Marker 
            key={m.id} 
            position={[m.lat, m.lng]} 
            icon={missionIcon}
            eventHandlers={{
              click: () => onSelectMission(m),
            }}
          >
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}