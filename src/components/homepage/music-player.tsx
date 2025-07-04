"use client";

import { Card, CardContent } from '@/components/ui/card';

export default function MusicPlayer() {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold tracking-tight text-center mb-6">Worship Playlist</h2>
      <Card>
        <CardContent className="p-2">
          <div className="w-full overflow-hidden rounded-lg">
            <iframe
              style={{ borderRadius: "12px" }}
              src="https://open.spotify.com/embed/playlist/37i9dQZF1DXaod7h2l5iA6?utm_source=generator&theme=0"
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Worship Playlist"
            ></iframe>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
