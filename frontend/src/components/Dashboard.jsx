import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getAlbums } from '../api';
import StatsCard from './StatsCard';
import RecentAlbums from './RecentAlbums';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAlbums();
        setAlbums(data);
      } catch (err) {
        console.error('Failed to load albums:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Calculate statistics
  const totalAlbums = albums.length;
  
  // Favorite genre (most common)
  const genreCounts = {};
  albums.forEach(a => {
    if (a.genre) {
      genreCounts[a.genre] = (genreCounts[a.genre] || 0) + 1;
    }
  });
  const favoriteGenre = Object.keys(genreCounts).length > 0
    ? Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0][0]
    : 'N/A';

  // Favorite artist (most common)
  const artistCounts = {};
  albums.forEach(a => {
    if (a.artist) {
      artistCounts[a.artist] = (artistCounts[a.artist] || 0) + 1;
    }
  });
  const favoriteArtist = Object.keys(artistCounts).length > 0
    ? Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0][0]
    : 'N/A';

  // Average rating
  const ratings = albums.filter(a => a.rating).map(a => Number(a.rating));
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
    : 'N/A';

  const firstName = user?.firstName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-welcome">Welcome, {firstName}</h1>
        <button onClick={() => navigate('/albums')} className="dashboard-go-to-albums-btn">
          Go to Albums
        </button>
      </div>

      <div className="dashboard-stats">
        <StatsCard label="Total Albums" value={totalAlbums} />
        <StatsCard label="Favorite Genre" value={favoriteGenre} />
        <StatsCard label="Favorite Artist" value={favoriteArtist} />
        <StatsCard label="Average Rating" value={avgRating} />
      </div>

      <div className="dashboard-recent">
        <RecentAlbums />
      </div>
    </div>
  );
}

