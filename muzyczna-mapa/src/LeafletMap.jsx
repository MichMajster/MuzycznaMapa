import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // bez tego mapa wyświetla się rozjechanie
import GridLayer from './GridLayer';

// Domyślne poprawienie ikony Markera w Leaflet React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
// tu konczy sie mambo jumbo potrzebne do poprawnego wyswietlania mapy

// Domyślnie Toruń, gdy nie ma jeszcze koordynatów
const DEFAULT_CENTER = { lat: 53.0138, lng: 18.5984 };

// MapContainer ustawia środek tylko raz (przy starcie),
// więc przy zmianie koordynatów trzeba przesunąć mapę ręcznie
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, 
  [lat, lng, map]);
 
  return null;
}

export default function LeafletMap({ coords, zoom = 15, onSelectTile }) {
// export default function LeafletMap({ coords, zoom = 15 }) {
  const center = coords ?? DEFAULT_CENTER;
 
  return (
    // kontener MUSI mieć wysokość, inaczej mapa jest niewidoczna
    <div style={{ height: '800px', width: '100%', isolation: 'isolate' }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GridLayer onSelectTile={onSelectTile} />
 
        {coords && (
          <>
            <Marker position={[coords.lat, coords.lng]}>
              <Popup>Tu jesteś</Popup>
            </Marker>
            <RecenterMap lat={coords.lat} lng={coords.lng} />
          </>
        )}
      </MapContainer>
    </div>
  );
}