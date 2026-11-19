import React, { useEffect, useRef, useState } from 'react';

export default function YouTubePlayer({ currentVideoId, onEnded }) {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const playerRef = useRef(null);

  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // załadowanie skryptu API i 1. inicjalizacja
  useEffect(() => {
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: currentVideoId || '',
        playerVars: { 
          autoplay: 1, 
          controls: 1,
          enablejsapi: 1,
          // controls: 0,
          rel: 0,             // polecane na końcu tylko z tego samego kanału, nie z całego YT
          modestbranding: 1,  // mniejsze logo YouTube na pasku
          iv_load_policy: 3,  // wyłącza adnotacje i dymki
          fs: 0,              // bez przycisku pełnego ekranu
          disablekb: 1        // bez skrótów klawiszowych
        },
        events: {
          onReady: () => setIsPlayerReady(true),
          onStateChange: (event) => {
            // YT.PlayerState.ENDED wynosi 0 (gdy piosenka się skończy)
            if (event.data === window.YT.PlayerState.ENDED) {
              if (onEndedRef.current) {
                onEndedRef.current();
              }
            }
          },
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    } else if (window.YT && window.YT.Player) {
      window.onYouTubeIframeAPIReady();
    }
  }, []);

  // ładowanie i automatyczne odtwarzanie kolejnego wideo po zmianie ID
  useEffect(() => {
    if (isPlayerReady && currentVideoId && playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(currentVideoId);
    }
  }, [currentVideoId, isPlayerReady]);

  return (
    // <div>
    //   <div id="yt-player"></div>
    //   <p style={{ fontSize: '12px', color: '#888' }}>
    //     {isPlayerReady ? "Odtwarzacz gotowy" : "Ładowanie..."}
    //   </p>
    // </div>
    <div style={{ width: '100%', height: '100%' }}>
      <div id="yt-player"></div>
    </div>
  );
}