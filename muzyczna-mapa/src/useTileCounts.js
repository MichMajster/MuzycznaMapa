import { useState, useRef, useCallback } from 'react';

const CHUNK = 16;          // musi się zgadzać z ChunkSize w QueueController.cs
const TTL_MS = 30_000;     // tyle czasu paczka jest "świeża" i nie pobieramy jej ponownie
const RETRY_MS = 5_000;    // po błędzie próbujemy ponownie po tylu ms

// "16_36000_20960" -> { cx, cy }
const chunkOfTile = (tileId) => {
  const [, x, y] = tileId.split('_').map(Number);
  return { cx: Math.floor(x / CHUNK), cy: Math.floor(y / CHUNK) };
};

export default function useTileCounts(apiBase) {
  // apiBase przyjmuje bazowy adres API (np. "http://localhost:XXXX")
  const [counts, setCounts] = useState({}); // { tileId: liczba piosenek }
  // key "cx_cy" -> { fetchedAt, inFlight, tileIds:Set }
  const chunks = useRef(new Map());

  const loadChunk = useCallback(
    async (cx, cy) => {
      const key = `${cx}_${cy}`;
      const entry = chunks.current.get(key);
      const now = Date.now();

      // aktualne albo właśnie pobierane - nie pytamy serwera ponownie
      if (entry && (entry.inFlight || now - entry.fetchedAt < TTL_MS)) return;

      const prevIds = entry?.tileIds ?? new Set();
      chunks.current.set(key, {
        fetchedAt: entry?.fetchedAt ?? 0,
        inFlight: true,
        tileIds: prevIds,
      });

      try {
        const res = await fetch(`${apiBase}/api/queue/chunk/${cx}/${cy}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const fresh = new Set(Object.keys(data));

        setCounts((old) => {
          const next = { ...old };
          // kafelki, które były w paczce, a teraz ich nie ma = opróżnione
          prevIds.forEach((id) => {
            if (!fresh.has(id)) delete next[id];
          });
          Object.assign(next, data);
          return next;
        });

        chunks.current.set(key, { fetchedAt: Date.now(), inFlight: false, tileIds: fresh });
      } catch (err) {
        console.warn('Nie udało się pobrać paczki kafelków', key, err);
        chunks.current.set(key, {
          fetchedAt: Date.now() - TTL_MS + RETRY_MS, // ponowna próba za RETRY_MS
          inFlight: false,
          tileIds: prevIds,
        });
      }
    },
    [apiBase]
  );

  // lista widocznych kafelków -> unikalne paczki -> pobierz tylko brakujące/nieświeże
  const requestForCells = useCallback(
    (cells) => {
      const keys = new Set();
      for (const cell of cells) {
        const { cx, cy } = chunkOfTile(cell.id);
        keys.add(`${cx}_${cy}`);
      }
      keys.forEach((k) => {
        const [cx, cy] = k.split('_').map(Number);
        loadChunk(cx, cy);
      });
    },
    [loadChunk]
  );

  // lokalna aktualizacja po dodaniu/usunięciu (bez czekania na serwer)
  const setCount = useCallback((tileId, n) => {
    setCounts((old) => {
      const next = { ...old };
      if (n > 0) next[tileId] = n;
      else delete next[tileId];
      return next;
    });
    const { cx, cy } = chunkOfTile(tileId);
    const entry = chunks.current.get(`${cx}_${cy}`);
    if (entry) {
      if (n > 0) entry.tileIds.add(tileId);
      else entry.tileIds.delete(tileId);
    }
  }, []);

  return { counts, requestForCells, setCount };
}
