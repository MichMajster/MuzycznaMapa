import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Rectangle, Popup, useMap, useMapEvents } from 'react-leaflet';
import './App.css';

const GRID_Z = 16;      // "zoom siatki": świat dzielony na 2^16 x 2^16 kwadratów
const MIN_ZOOM = 14;    // poniżej tego zoomu mapy siatka się nie rysuje
const MAX_CELLS = 3000; // bezpiecznik
const MAX_LAT = 85.0511; // granica projekcji Mercatora

const PAD = 0.5;          // ile ponad widoczny obszar liczymy kafelki
const TRIGGER_PAD = 0.15; // odświeżamy, gdy widok zbliży się do krawędzi policzonego obszaru
const REFRESH_MS = 15_000; // co ile sprawdzamy, czy liczniki nie są nieświeże
const POPUP_MS = 5_000;    // po ilu ms popup kafelka sam się zamyka

const N = 2 ** GRID_Z;

// const [leftOpen, setLeftOpen] = useState(false);

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

// --- cache obiektów kafelków: te same obiekty między przeliczeniami,
//     dzięki temu React.memo nie przerysowuje niezmienionych kafelków ---
const cellCache = new Map();

function getCell(x, y) {
  const id = `${GRID_Z}_${x}_${y}`;
  let cell = cellCache.get(id);
  if (!cell) {
    cell = {
      id, // stabilny identyfikator kafelka (do bazy)
      bounds: [
        [yToLat(y + 1), xToLng(x)],   // lewy dolny róg
        [yToLat(y), xToLng(x + 1)],   // prawy górny róg
      ],
    };
    if (cellCache.size > 20000) cellCache.clear();
    cellCache.set(id, cell);
  }
  return cell;
}

// --- lista kafelków w podanym obszarze (null = za dużo kafelków) ---

function computeCells(b) {
  const clampX = (x) => Math.max(0, Math.min(N - 1, x));

  const x0 = clampX(lngToX(b.getWest()));
  const x1 = clampX(lngToX(b.getEast()));
  const y0 = latToY(b.getNorth()); // północ = mniejsze y
  const y1 = latToY(b.getSouth());

  if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_CELLS) return null;

  const cells = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      cells.push(getCell(x, y));
    }
  }
  return cells;
}

// --- styl zależny od liczby piosenek ---
const styleFor = (count) =>
  count > 0
    ? {
        color: '#e67e22',
        fillColor: '#e67e22',
        weight: 2,
        fillOpacity: Math.min(0.15 + 0.08 * count, 0.8),
      }
    : { color: '#3388ff', fillColor: '#3388ff', weight: 1, fillOpacity: 0.05 };

// pojedynczy kafelek; memo = przerysowuje się tylko, gdy zmieni się jego liczba piosenek
const TileRect = memo(function TileRect({ cell, count, onSelect, onOpenLeftPanel }) {
  const pathOptions = useMemo(() => styleFor(count), [count]);

  const eventHandlers = useMemo(
    () => ({
      mouseover: (e) =>
        e.target.setStyle({ fillOpacity: Math.min(pathOptions.fillOpacity + 0.25, 0.85) }),
      mouseout: (e) => e.target.setStyle({ fillOpacity: pathOptions.fillOpacity }),
      click: () => onSelect(cell),
    }),
    [pathOptions, onSelect, cell.id]
  );

  // automatyczne zamykanie popupa po POPUP_MS (wstrzymane, gdy kursor jest nad nim)
  const popupRef = useRef(null);
  const timerRef = useRef(null);

  const stopTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setTimeout(() => popupRef.current?.close(), POPUP_MS);
  }, [stopTimer]);

  useEffect(() => stopTimer, [stopTimer]); // sprzątanie przy odmontowaniu

  const popupHandlers = useMemo(
    () => ({ add: startTimer, remove: stopTimer }), // add = popup otwarty, remove = zamknięty
    [startTimer, stopTimer]
  );

  return (
    <Rectangle bounds={cell.bounds} pathOptions={pathOptions} eventHandlers={eventHandlers}>
      {/* closeButton={false} usuwa "X"; wygląd popupa w App.css (.tile-popup) */}
      <Popup ref={popupRef} closeButton={false} className="tile-popup" eventHandlers={popupHandlers}>
        <button
          type="button"
          className="tile-popup-btn"
          onMouseEnter={stopTimer}
          onMouseLeave={startTimer}
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent?.stopPropagation?.();
            onOpenLeftPanel?.();
          }}
          title="Dodaj piosenkę / wybierz kafelek"
        >
          <span className="tile-popup-icon">➕</span>
          ADD SONG | 5/10
        </button>
      </Popup>
    </Rectangle>
  );
});

export default function GridLayer({ onSelectTile, tileCounts = {}, onCellsVisible, onOpenLeftPanel, userPos }) {
  const map = useMap();
  const [cells, setCells] = useState([]);
  const coveredRef = useRef(null); // obszar, dla którego mamy już policzone kafelki
  const cellsRef = useRef([]);

  // najnowsze propsy w refach, żeby callbacki były stabilne
  const selectRef = useRef(onSelectTile);
  selectRef.current = onSelectTile;
  const visibleRef = useRef(onCellsVisible);
  visibleRef.current = onCellsVisible;

  const handleSelect = useCallback((id) => selectRef.current?.(id), []);

  const userBlockBounds = useMemo(() => {
    if (!userPos) return null;
    const x = lngToX(userPos.lng);
    const y = latToY(userPos.lat);
    return [
      [yToLat(y + 2), xToLng(x - 1)], // lewy dolny róg bloku
      [yToLat(y - 1), xToLng(x + 2)], // prawy górny róg bloku
    ];
  }, [userPos]);

  const refresh = useCallback(
    (force = false) => {
      if (map.getZoom() < MIN_ZOOM) {
        coveredRef.current = null;
        cellsRef.current = [];
        setCells([]);
        return;
      }

      const view = map.getBounds();

      // jeśli widok (z małym zapasem) mieści się w policzonym obszarze - nic nie rób
      if (!force && coveredRef.current && coveredRef.current.contains(view.pad(TRIGGER_PAD))) {
        return;
      }

      // najpierw próbujemy z zapasem; jeśli za dużo kafelków - tylko widoczny obszar
      let area = view.pad(PAD);
      let result = computeCells(area);
      if (!result) {
        area = view;
        result = computeCells(area);
      }

      coveredRef.current = result ? area : null;
      cellsRef.current = result ?? [];
      setCells(cellsRef.current);

      // poproś o liczniki tylko dla paczek, których jeszcze nie mamy / są nieświeże
      if (result) visibleRef.current?.(result);
    },
    [map]
  );

  useEffect(() => {
    refresh(true);
  }, [refresh]);

  // okresowo odśwież liczniki widocznych paczek (zmiany od innych użytkowników);
  // hook sam pilnuje TTL, więc większość wywołań nic nie robi
  useEffect(() => {
    const t = setInterval(() => {
      if (cellsRef.current.length) visibleRef.current?.(cellsRef.current);
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  useMapEvents({
    move: () => refresh(),          // w trakcie przeciągania
    zoomend: () => refresh(true),   // po zmianie zoomu zawsze przelicz
  });

  return (
    <>
      {userBlockBounds && (
        <Rectangle
          bounds={userBlockBounds}
          interactive={false} // klik przechodzi "przez" obramowanie do kafelków pod spodem
          pathOptions={{ color: '#16a34a', weight: 4, fill: false }}
        />
      )}
      {cells.map((cell) => (
        <TileRect
          key={cell.id}
          cell={cell}
          count={tileCounts[cell.id] ?? 0}
          onSelect={handleSelect}
          onOpenLeftPanel={onOpenLeftPanel}
        />
      ))}
    </>
  );
}