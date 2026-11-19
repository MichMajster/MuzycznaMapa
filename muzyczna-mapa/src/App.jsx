import React, { useState, useEffect } from 'react';
import YouTubePlayer from './YouTubePlayer';
// import MapWithGeolocation from './MapWithGeolocation';
import UseLocationTest from './GeolocationTest';
import LeafletMap from './LeafletMap';
// import GridLayer from './GridLayer';
import './App.css';
import useTileCounts from './useTileCounts';




const API_BASE = 'http://localhost:5205';
// const API_BASE = 'http://192.168.1.12:5205';

// const currentSong = queue[currentIdx];

function App() {
  // definicja STANÓW
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  // const [text, setText] = useState("");

  // const [tileId, setTileId] = useState('53_09'); // póki co używam domyslnie 53_10 !!!
  const [tileId, setTileId] = useState('');
  const [urlText, setUrlText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

    // liczniki piosenek na kafelkach (pobierane paczkami i cache'owane)
  const { counts, requestForCells, setCount } = useTileCounts(API_BASE);



  // które panele są wysunięte
  const [rightOpen, setRightOpen] = useState(false); // info o kafelku
  const [leftOpen, setLeftOpen] = useState(false);

  const [tileBounds, setTileBounds] = useState(null);

  // POBIERANIE PIOSENEK Z C# DLA DANEGO KOORDYNATU
  const loadQueueForTile = async (coords) => {
    if (!coords || !coords.trim()) return;
    setStatusMsg('Ładowanie z serwera...');
    try {
      // wywołuje endpoint: GET /api/queue/{tileId}
      //encodeURIComponent - by url nie mial specjalnych znaków (np. spacji)
      const response = await fetch(`${API_BASE}/api/queue/${encodeURIComponent(coords)}`);
      if (!response.ok) throw new Error('Błąd pobierania');

      const data = await response.json(); // pobiera tablicę obiektów SongDto { videoId, title }
      setQueue(data);
      setCount(coords, data.length); // od razu zaktualizuj kolor kafelka
      
      setCurrentIdx(0);
      setStatusMsg(`Załadowano ${data.length} piosenek dla koordynatu ${coords}`);
    } catch (err) {
      setStatusMsg('Nie udało się połączyć z backendem C# (dotnet run?/docker?)');
    }
  };

  const addSongToTile = async () => {
    const trimmedUrl = urlText.trim();
    const trimmedTile = String(tileId ?? '').trim();

    if (!trimmedUrl) {
      setStatusMsg('Wklej link do piosenki');
      return;
    }
    if (!trimmedTile) {
      setStatusMsg('Wybierz kafelek (brak tileId)');
      return;
    }

    // 11-znakowe ID z linku (też z youtube.com/shorts/ i watch?v=)
    const match = trimmedUrl.match(
      /(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/
    );
    const videoId = match ? match[1] : trimmedUrl;

    // jeśli to raczej nie ID - nie wysyłaj śmieci do bazy
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      setStatusMsg('Nieprawidłowy link lub ID filmu');
      return;
    }

    setStatusMsg('Pobieranie tytułu i zapisywanie...');

    try {
      // 1. Próba pobrania prawdziwego tytułu przez oEmbed API YouTube
      let songTitle = `Piosenka (${videoId})`;
      try {
        const oEmbedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oEmbedRes.ok) {
          const oEmbedData = await oEmbedRes.json();
          if (oEmbedData.title) {
            songTitle = oEmbedData.title;
          }
        }
      } catch (embedErr) {
        console.warn('Nie udało się pobrać tytułu przez oEmbed, użyto domyślnego', embedErr);
      }

      // 2. Wysłanie danych do Twojego backendu C#
      const url = `${API_BASE}/api/queue/${encodeURIComponent(trimmedTile)}`;
      const payload = {
        videoId,
        title: songTitle, // Tutaj trafia już prawdziwy tytuł (lub fallback)
      };

      console.log('POST', url, payload); // podgląd w DevTools -> Console

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Odpowiedź błędu nie musi być JSONem - może być zwykłym tekstem
        const raw = await response.text();
        let message = raw;
        try {
          const parsed = JSON.parse(raw);
          message = parsed.message || parsed.title || raw;
        } catch { /* zostaje surowy tekst */ }

        console.error('Błąd API:', response.status, raw);
        setStatusMsg(`Błąd ${response.status}: ${message || 'Nie dodano'}`);
        return;
      }

      setUrlText('');
      await loadQueueForTile(trimmedTile);
      setStatusMsg('Dodano do kolejki ✓');
    } catch (err) {
    console.error('Błąd fetch:', err);
    setStatusMsg(`Błąd połączenia: ${err.message}`);
  }};


  // USUWANIE PIOSENKI Z C#
  const removeSongFromTile = async (videoId) => {
    try {
      // Wysyłamy DELETE /api/queue/{tileId}/{videoId}
      await fetch(`${API_BASE}/api/queue/${encodeURIComponent(tileId)}/${encodeURIComponent(videoId)}`, {
        method: 'DELETE'
      });
      await loadQueueForTile(tileId);
    } catch (err) {
      setStatusMsg('Błąd podczas usuwania');
    }
  };

  const handleVideoEnded = () => {
    setCurrentIdx((prevIdx) => {
      if (prevIdx + 1 < queue.length) {
        return prevIdx + 1;
      }
      return prevIdx; // lub "return 0;", by kolejka wrocila na poczatek
    });
  };

  const handleSelectTile1 = (id) => {
    setTileId(id);
    loadQueueForTile(id);
    setRightOpen(true);
  };

  const handleBounds = (element) => {
    const bounds =
    typeof element === 'object' && element !== null
      ? (element.bounds ?? null)
      : null;
    setTileBounds(bounds);
  }

    const handleSelectTile = (elements) => {
      const id =
      typeof elements === 'object' && elements !== null
      ? elements.id
      : elements;
    handleSelectTile1(id);
    handleBounds(elements);
  };

  const activeVideoId = typeof queue[currentIdx] === 'object' && queue[currentIdx] !== null
  ? queue[currentIdx].videoId
  : queue[currentIdx];

  const openLeftPanel = () => setLeftOpen(true);


  // ładuje kolejkę na starcie aplikacji
  useEffect(() => {
    if (tileId && tileId.trim()) {
      loadQueueForTile(tileId);
    }
  }, [tileId]);

  //wygląd strony //////////////////////////////////////////////////////////////////////////////////////////////

  return (
    <div className="app">
      {/* MAPA NA CAŁY EKRAN */}
      <div className="map-layer">
        <LeafletMap
          onSelectTile={handleSelectTile}
          tileCounts={counts}
          onCellsVisible={requestForCells}
          onOpenLeftPanel={openLeftPanel}
        />
      </div>

      {/* PASEK PRZYCISKÓW Z LEWEJ */}
      {/* <div className="rail">
        <button
          className={leftOpen ? 'active' : ''}
          onClick={() => setLeftOpen((v) => !v)}
          title="Dodaj piosenkę / wybierz kafelek"
        >
          ➕
        </button>
        <button
          className={rightOpen ? 'active' : ''}
          onClick={() => setRightOpen((v) => !v)}
          title="Info o kafelku"
        >
          🎵
        </button>
      </div> */}

      {/* LEWY PANEL: dodawanie */}
      <aside className={`panel panel-left ${leftOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h3>Dodaj piosenkę</h3>
          <button className="close" onClick={() => setLeftOpen(false)}>✕</button>
        </div>

        <label>Koordynat kafla</label>
        <div className="row">
          {/* <text
            type="text"
            value={tileId}
            onChange={(e) => setTileId(e.target.value)}
            placeholder="np. 53_10"
          />
          <button onClick={() => handleSelectTile(tileId)}>Wczytaj</button> */}
          <p>{tileId}</p>
        </div>

        <label>Link YouTube lub ID</label>
        <input
          type="text"
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          placeholder="Wklej link YouTube lub ID..."
        />
        <button className="primary" onClick={addSongToTile}>
          + Dodaj do koordynatu
        </button>
      </aside>

      {/* WYSUWANY PRAWY PANEL */}
      <aside className={`panel panel-right ${rightOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h3>Kafelek {tileId || '—'}</h3>
          <button className="close" onClick={() => setRightOpen(false)}>✕</button>
        </div>
 
        <p className="muted">Kolejka zawiera {queue.length} piosenek.</p>
        <div className="muted"><strong>Lewy dolny:</strong> {tileBounds?.[0][0].toFixed(4)}° N, {tileBounds?.[0][1].toFixed(4)}° E</div>
        <div className="muted"><strong>Prawy górny:</strong> {tileBounds?.[1][0].toFixed(4)}° N, {tileBounds?.[1][1].toFixed(4)}° E</div>
        <div className="muted"><strong>Środek:</strong> {((tileBounds?.[0][0] + tileBounds?.[1][0]) / 2).toFixed(4)}° N, {((tileBounds?.[0][1] + tileBounds?.[1][1]) / 2).toFixed(4)}° E</div>
 
        <ul className="song-list">
          {Array.isArray(queue) &&
            queue.map((song, index) => {
              const isObj = typeof song === 'object' && song !== null;
              const songTitle = isObj ? song.title || song.videoId : song;
              const songId = isObj ? song.videoId : song;
 
              return (
                <li
                  key={songId || index}
                  className={index === currentIdx ? 'current' : ''}
                >
                  <span className="song-title" onClick={() => setCurrentIdx(index)}>
                    {index === currentIdx ? '▶ ' : ''}
                    {songTitle}
                  </span>
                  <button onClick={() => removeSongFromTile(songId)}>✕</button>
                </li>
              );
            })}
        </ul>
 
        <div className="geo">
          <UseLocationTest />
        </div>
      </aside>
 
      {/* ODTWARZACZ YOUTUBE: prawy dolny róg */}
      <div className="player">
        <YouTubePlayer currentVideoId={activeVideoId} onEnded={handleVideoEnded} />
      </div>
 
      {statusMsg && <div className="status">{statusMsg}</div>}
    </div>
  );
}
 
export default App;
