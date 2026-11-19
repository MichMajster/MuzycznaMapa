import React, { useState, useEffect, useMemo } from 'react';
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

//ikonka czlowieka
const ludekIcon = L.icon({
  iconUrl: '/images/person.png', // np. plik w folderze public w React
  iconSize: [38, 38],     // rozmiar ikony w pikselach [szerokość, wysokość]
  iconAnchor: [19, 38],   // punkt ikony, który "dotyka" mapy (zazwyczaj środek dołu: szerokość/2, wysokość)
  popupAnchor: [0, -38]   // miejsce, nad którym ma się otwierać popup względem ikony
});

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

export default function LeafletMap({ zoom = 15, onSelectTile, tileCounts, onCellsVisible, onOpenLeftPanel }) {
// export default function LeafletMap({ coords, zoom = 15 }) {
  const [coords, setCoords] = useState(null); // koordynaty GPS { lat, lng }
  const [status, setStatus] = useState('Pobieranie lokalizacji...');
  useEffect(() => {
    // 1. Sprawdzamy wsparcie przeglądarki
    if (!navigator.geolocation) {
      setStatus('Twoja przeglądarka nie wspiera geolokalizacji.');
      return;
    }

    // 2. Pobieramy pozycję GPS
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setCoords({ lat, lng });
        setStatus('Lokalizacja pobrana pomyślnie!');
      },
      (error) => {
        console.error('Błąd GPS:', error);
        setStatus(`Błąd pobierania pozycji: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, []);



  const center = coords ?? DEFAULT_CENTER;
  
  // canvas renderer z większym zapasem poza ekranem (domyślnie 0.1) -
  // dzięki temu kafelki dodane w trakcie przeciągania od razu mają gdzie się narysować
  const canvasRenderer = useMemo(() => L.canvas({ padding: 1 }), []);
 
  return (
    // kontener MUSI mieć wysokość, inaczej mapa jest niewidoczna
    // kontener MUSI mieć wysokość - teraz wypełnia rodzica (.map-layer = cały ekran)
    <div style={{ height: '100%', width: '100%', isolation: 'isolate' }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        renderer={canvasRenderer}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GridLayer
          onSelectTile={onSelectTile}
          tileCounts={tileCounts}
          onCellsVisible={onCellsVisible}
          onOpenLeftPanel={onOpenLeftPanel}
          userPos={coords}
        />
 
        {coords && (
          <>
            <Marker 
              position={[coords.lat, coords.lng]}
              icon={ludekIcon}>
              {/* <Popup>Tu jesteś</Popup> */}
            </Marker>
            <RecenterMap lat={coords.lat} lng={coords.lng} />
          </>
        )}
      </MapContainer>
    </div>
  );
}