import React, { useState, useEffect } from 'react';
import LeafletMap from './LeafletMap';
//                                                        TEN PLIK NIE JEST JUZ UŻYWANY, TYLKO DO TESTÓW
export default function UseLocationTest() {
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

  return (
    <div>
      
      {coords && (
        <ul>
          <li>Szerokość (Lat): <strong>{coords.lat}</strong></li>
          <li>Długość (Lon): <strong>{coords.lng}</strong></li>
        </ul>
      )}
      <p><strong>Status:</strong> {status}</p>
      
    </div>
  );
}