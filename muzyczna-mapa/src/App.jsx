import React, { useState, useEffect } from 'react';
import YouTubePlayer from './YouTubePlayer';

const API_BASE = 'http://localhost:5205';

function App() {
  // definicja STANÓW
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [text, setText] = useState("");

  const [tileId, setTileId] = useState('53_10'); // póki co używam domyslnie 53_10 !!!
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
  }, []);

  // DODAWANIE PIOSENKI POD KOORDYNAT DO C#
  const addSongToTile = async () => {
    if (!urlText.trim() || !tileId.trim()) return;

    // Wyciągamy 11-znakowe ID z linku
    const match = urlText.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    const videoId = match ? match[1] : urlText.trim();

    setStatusMsg('Zapisywanie...');

    try {
      // POST /api/queue/{tileId} do C#
      const response = await fetch(`${API_BASE}/api/queue/${tileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoId,
          title: `Piosenka (${videoId})`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatusMsg(`Błąd: ${errorData.message || 'Nie dodano'}`);
        return;
      }

      // odświeżenie załadowanych danych
      setUrlText('');
      await loadQueueForTile(tileId);
    } catch (err) {
      setStatusMsg('Błąd połączenia z serwerem');
    }
  };

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

  // funkcja dodająca nowy utwór do listy
  const addSong = () => {
    if (text.trim() === "") return; //jesli same biale znaki - ignoruj
    
    const match = text.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  
    // jesli znaleziono match, bierze samo ID (grupa 1 z text.match), else - caly tekst
    const finalTitle = match ? match[1] : text;

    // tworzymy nową tablicę z dodanym elementem i przekazujemy do setQueue
    // React widzi zmianę w 'setQueue' i automatycznie aktualizuje widok
    setQueue([...queue, finalTitle]); 
    setText(""); // czysci pole tekstowe
  };

  const removeSong = (indexToRemove) => {
    // filtruje tablicę, usuwając element o danym indeksie
    setQueue(queue.filter((_, index) => index !== indexToRemove));
  };

  // const handleVideoEnded = () => {
  //   if (currentIdx + 1 < queue.length) {
  //     setCurrentIdx(currentIdx + 1);
  //   }
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

  //wygląd strony (JSX)
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

      <input 
        type="text" 
        value={text} 
        onChange={(e) => setText(e.target.value)} // Aktualizuje zmienną "text" przy każdym wpisanym znaku
        placeholder="Wpisz nazwę piosenki..."
      />
      <button onClick={addSong}>Dodaj</button>

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
        <button onClick={() => loadQueueForTile(tileId)}>Wczytaj kafel</button>
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
    </div>

  );
}

export default App
