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
        height: '360',
        width: '640',
        videoId: currentVideoId || '',
        playerVars: { 
          autoplay: 1, 
          controls: 1,
          enablejsapi: 1
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
    <div>
      <div id="yt-player"></div>
      <p style={{ fontSize: '12px', color: '#888' }}>
        {isPlayerReady ? "Odtwarzacz gotowy" : "Ładowanie..."}
      </p>
    </div>
  );
}