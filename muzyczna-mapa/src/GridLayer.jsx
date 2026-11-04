import { useState, useEffect } from 'react';
import { Rectangle, Popup, useMap, useMapEvents } from 'react-leaflet';

const GRID_Z = 16;      // "zoom siatki": świat dzielony na 2^16 x 2^16 kwadratów
const MIN_ZOOM = 14;    // poniżej tego zoomu mapy siatka się nie rysuje
const MAX_CELLS = 2000; // bezpiecznik
const MAX_LAT = 85.0511; // granica projekcji Mercatora

const N = 2 ** GRID_Z;

// --- konwersje: współrzędne geograficzne <-> indeksy kafelka (schemat XYZ) ---

const lngToX = (lng) => Math.floor(((lng + 180) / 360) * N);

const latToY = (lat) => {
  const rad = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * N
  );
};

const xToLng = (x) => (x / N) * 360 - 180;

const yToLat = (y) => {
  const n = Math.PI - (2 * Math.PI * y) / N;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

// --- lista kafelków w widocznym obszarze ---

function computeCells(map) {
  if (map.getZoom() < MIN_ZOOM) return [];

  const b = map.getBounds();
  const clampX = (x) => Math.max(0, Math.min(N - 1, x));

  const x0 = clampX(lngToX(b.getWest()));
  const x1 = clampX(lngToX(b.getEast()));
  const y0 = latToY(b.getNorth()); // północ = mniejsze y
  const y1 = latToY(b.getSouth());

  if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_CELLS) return [];

  const cells = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      cells.push({
        id: `${GRID_Z}_${x}_${y}`, // stabilny identyfikator kafelka (do bazy)
        bounds: [
          [yToLat(y + 1), xToLng(x)],     // lewy dolny róg
          [yToLat(y), xToLng(x + 1)],     // prawy górny róg
        ],
      });
    }
  }
  return cells;
}

export default function GridLayer({ onSelectTile }) {
  const map = useMap();
  const [cells, setCells] = useState([]);

  useEffect(() => {
    setCells(computeCells(map));
  }, [map]);

  useMapEvents({
    moveend: () => setCells(computeCells(map)),
  });

  return (
    <>
      {cells.map((cell) => (
        <Rectangle
          key={cell.id}
          bounds={cell.bounds}
          pathOptions={{ color: '#3388ff', weight: 1, fillOpacity: 0.05 }}
          eventHandlers={{
            mouseover: (e) => e.target.setStyle({ fillOpacity: 0.3 }),
            mouseout: (e) => e.target.setStyle({ fillOpacity: 0.05 }),
          }}
        >
          {/* <Popup>
            <strong>Kafelek {cell.id}</strong>
            <br />
            Tu będzie dodawanie piosenki
          </Popup> */}
          <Popup>
            <strong>Kafelek {cell.id}</strong>
            <div style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.4' }}>
            <div><strong>Lewy dolny:</strong> {cell.bounds[0][0].toFixed(4)}° N, {cell.bounds[0][1].toFixed(4)}° E</div>
            <div><strong>Prawy górny:</strong> {cell.bounds[1][0].toFixed(4)}° N, {cell.bounds[1][1].toFixed(4)}° E</div>
            <div><strong>Środek:</strong> {((cell.bounds[0][0] + cell.bounds[1][0]) / 2).toFixed(4)}° N, {((cell.bounds[0][1] + cell.bounds[1][1]) / 2).toFixed(4)}° E</div>
            <button 
              onClick={() => onSelectTile && onSelectTile(cell.id)}
              style={{ marginTop: '8px', cursor: 'pointer' }}
            ></button>
            </div>
            <hr style={{ margin: '8px 0', border: '0', borderTop: '1px solid #ddd' }} />
            <span style={{ color: '#666', fontSize: '12px' }}>Tu będzie dodawanie piosenki</span>
        </Popup>
        </Rectangle>
      ))}
    </>
  );
}