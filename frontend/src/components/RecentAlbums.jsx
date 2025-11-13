import { useEffect, useState } from 'react';
import { getAlbums } from '../api';
import { generateCover } from '../utils/covers';

export default function RecentAlbums() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAlbums();
        // Sort by listenedAt DESC and take top 3
        const sorted = [...data]
          .filter(a => a.listenedAt)
          .sort((a, b) => new Date(b.listenedAt) - new Date(a.listenedAt))
          .slice(0, 3);
        setAlbums(sorted);
      } catch (err) {
        console.error('Failed to load recent albums:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="recent-albums-loading">Loading recent albums...</div>;
  }

  if (albums.length === 0) {
    return <div className="recent-albums-empty">No recent albums yet.</div>;
  }

  return (
    <div className="recent-albums">
      <h3 className="recent-albums-title">Recent Albums</h3>
      <div className="recent-albums-grid">
        {albums.map(album => (
          <div key={album.id} className="recent-album-card">
            <img
              src={generateCover(album.title, album.artist)}
              alt={`${album.title} by ${album.artist}`}
              className="recent-album-cover"
            />
            <div className="recent-album-info">
              <div className="recent-album-title">{album.title}</div>
              <div className="recent-album-artist">{album.artist}</div>
              <div className="recent-album-date">
                {album.listenedAt ? new Date(album.listenedAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

