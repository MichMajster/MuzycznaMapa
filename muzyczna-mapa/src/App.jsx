import React, { useState, useEffect } from 'react';
import YouTubePlayer from './YouTubePlayer';
// import MapWithGeolocation from './MapWithGeolocation';
import UseLocationTest from './GeolocationTest';
import LeafletMap from './LeafletMap';
// import GridLayer from './GridLayer';


const API_BASE = 'http://localhost:5205';

function App() {
  // definicja STANÓW
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [text, setText] = useState("");

  // const [tileId, setTileId] = useState('53_09'); // póki co używam domyslnie 53_10 !!!
  const [tileId, setTileId] = useState('');
  const [urlText, setUrlText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // POBIERANIE PIOSENEK Z C# DLA DANEGO KOORDYNATU
  const loadQueueForTile = async (coords) => {
    if (!coords.trim()) return;
    setStatusMsg('Ładowanie z serwera...');
    try {
      // wywołuje endpoint: GET /api/queue/{tileId}
      const response = await fetch(`${API_BASE}/api/queue/${coords}`);
      if (!response.ok) throw new Error('Błąd pobierania');
      const data = await response.json(); // pobiera tablicę obiektów SongDto { videoId, title }
      setQueue(data);
      setCurrentIdx(0);
      setStatusMsg(`Załadowano ${data.length} piosenek dla koordynatu ${coords}`);
    } catch (err) {
      setStatusMsg('Nie udało się połączyć z backendem C# (dotnet run?)');
    }
  };

  // ładuje kolejkę na starcie aplikacji
  useEffect(() => {
    loadQueueForTile(tileId);
  }, [tileId]);

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

    setStatusMsg('Zapisywanie...');

    try {
      const url = `${API_BASE}/api/queue/${encodeURIComponent(trimmedTile)}`;
      const payload = {
        videoId,
        title: `Piosenka (${videoId})`,
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
      await fetch(`${API_BASE}/api/queue/${tileId}/${videoId}`, {
        method: 'DELETE'
      });
      await loadQueueForTile(tileId);
    } catch (err) {
      setStatusMsg('Błąd podczas usuwania');
    }
  };

  const currentSong = queue[currentIdx];

  // const addSong = () => {
  //   if (text.trim() === "") return; //jesli same biale znaki - ignoruj
    
  //   const match = text.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  
  //   // jesli znaleziono match, bierze samo ID (grupa 1 z text.match), else - caly tekst
  //   const finalTitle = match ? match[1] : text;

  //   // tworzymy nową tablicę z dodanym elementem i przekazujemy do setQueue
  //   // React widzi zmianę w 'setQueue' i automatycznie aktualizuje widok
  //   setQueue([...queue, finalTitle]); 
  //   setText(""); // czysci pole tekstowe
  // };

  // const removeSong = (indexToRemove) => {
  //   // filtruje tablicę, usuwając element o danym indeksie
  //   setQueue(queue.filter((_, index) => index !== indexToRemove));
  // };

  const handleVideoEnded = () => {
    setCurrentIdx((prevIdx) => {
      if (prevIdx + 1 < queue.length) {
        return prevIdx + 1;
      }
      return prevIdx; // lub "return 0;", by kolejka wrocila na poczatek
    });
  };
  

  const activeVideoId = typeof queue[currentIdx] === 'object' && queue[currentIdx] !== null
  ? queue[currentIdx].videoId
  : queue[currentIdx];

  const handleSelectTile = (id) => {
    setTileId(id);
    loadQueueForTile(id);
  };

  //wygląd strony //////////////////////////////////////////////////////////////////////////////////////////////
  return (
    <div style={{ padding: '20px' }}>
      <h2>Kolejka zawiera {queue.length} piosenki.</h2>
      <>https://youtu.be/TtZkzaamWPY?si=my66JlOrK6rROGcX</>
      <br />
      <>https://youtu.be/5AjADUA7LB8?si=O4WhhaXnWtGhl7iI</>
      <br />
      <YouTubePlayer 
        currentVideoId={activeVideoId} 
        onEnded={handleVideoEnded} 
      />

      {/* <input 
        type="text" 
        value={text} 
        onChange={(e) => setText(e.target.value)} // Aktualizuje zmienną "text" przy każdym wpisanym znaku
        placeholder="Wpisz nazwę piosenki..."
      />
      <button onClick={addSong}>Dodaj</button> */}
      <div style={{ width: '640px', margin: '0 auto' }}>
        <LeafletMap onSelectTile={handleSelectTile} />
      </div>
      
      {/* <UseLocationTest /> */}
      
      {/* Wyświetlanie listy przy użyciu map() */}
      <ul>
        {Array.isArray(queue) && queue.map((song, index) => {
          const songTitle = typeof song === 'object' && song !== null 
            ? (song.title || song.videoId) 
            : song;

          const songId = typeof song === 'object' && song !== null 
            ? song.videoId 
            : song;

          return (
            <li 
              key={songId || index} 
              style={{ fontWeight: index === currentIdx ? 'bold' : 'normal' }}
            >
              <span 
                style={{ cursor: 'pointer', marginRight: '10px' }} 
                onClick={() => setCurrentIdx(index)}
              >
                {index === currentIdx ? '▶ ' : ''}{songTitle}
              </span>
              <button onClick={() => typeof song === 'object' ? removeSongFromTile(songId) : removeSong(index)}>
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      {/* <ul>
        {queue.map((song, index) => (
          <li key={index}>
            {song} 
            <button onClick={() => removeSong(index)}>✕</button>
          </li>
        ))}
      </ul> */}

    {/* Wybór koordynatu */}
      <div style={{ marginBottom: '15px' }}>
        <label>Koordynat kafla: </label>
        <input 
          type="text" 
          value={tileId} 
          onChange={(e) => setTileId(e.target.value)} 
          placeholder="np. 53_10"
        />
        {/* <button onClick={() => loadQueueForTile(tileId)}>Wczytaj kafel</button> */}
        <button onClick={() => handleSelectTile(tileId)}>Wczytaj kafel</button>
      </div>

      {/* Formularz dodawania piosenki */}
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          value={urlText} 
          onChange={(e) => setUrlText(e.target.value)} 
          placeholder="Wklej link YouTube lub ID..."
          style={{ width: '250px', marginRight: '5px' }}
        />
        <button onClick={addSongToTile}>+ Dodaj do koordynatu</button>
      </div>
      <p>{statusMsg}</p>
    </div>

  );
}

export default App
