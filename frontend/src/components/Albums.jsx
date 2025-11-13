import { useEffect, useState } from 'react';
import { addAlbum, getAlbums, deleteAlbum } from '../api';
import Filters from './Filters';
import { generateCover } from '../utils/covers';

export default function Albums() {
  const [albums, setAlbums] = useState([]);
  const [filteredAlbums, setFilteredAlbums] = useState([]);
  const [filters, setFilters] = useState({ genre: null, rating: null });
  const [form, setForm] = useState({
    title: '',
    artist: '',
    genre: 'Rock',
    rating: 5,
    listenedAt: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getAlbums();
      setAlbums(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Apply filters when albums or filters change
  useEffect(() => {
    let filtered = [...albums];
    
    if (filters.genre) {
      filtered = filtered.filter(a => a.genre === filters.genre);
    }
    
    if (filters.rating !== null) {
      filtered = filtered.filter(a => Number(a.rating) === filters.rating);
    }
    
    setFilteredAlbums(filtered);
  }, [albums, filters]);

  async function onAdd(e) {
    e.preventDefault();
    const payload = { ...form, rating: Number(form.rating) };
    await addAlbum(payload);
    setForm({ ...form, title: '', artist: '' });
    await load();
  }

  async function onDelete(id) {
    if (window.confirm('Are you sure you want to delete this album?')) {
      await deleteAlbum(id);
      await load();
    }
  }

  return (
    <div className="albums-page">
      <div className="albums-container">
        <h2 className="albums-title">My Albums</h2>

        <form onSubmit={onAdd} className="album-form">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="album-form-input"
            required
          />
          <input
            placeholder="Artist"
            value={form.artist}
            onChange={(e) => setForm({ ...form, artist: e.target.value })}
            className="album-form-input"
            required
          />
          <select
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
            className="album-form-input"
          >
            <option>Rock</option>
            <option>Pop</option>
            <option>Jazz</option>
            <option>Hip-Hop</option>
            <option>Classical</option>
            <option>Electronic</option>
            <option>Country</option>
            <option>Blues</option>
            <option>R&B</option>
            <option>Reggae</option>
            <option>Metal</option>
            <option>Folk</option>
            <option>Indie</option>
            <option>Alternative</option>
            <option>Punk</option>
            <option>Soul</option>
            <option>Funk</option>
            <option>Disco</option>
            <option>Techno</option>
            <option>House</option>
            <option>Ambient</option>
            <option>World</option>
            <option>Latin</option>
            <option>Gospel</option>
          </select>
          <select
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: e.target.value })}
            className="album-form-input"
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n}★</option>
            ))}
          </select>
          <input
            type="date"
            value={form.listenedAt}
            onChange={(e) => setForm({ ...form, listenedAt: e.target.value })}
            className="album-form-input"
          />
          <button type="submit" className="album-form-submit">Add</button>
        </form>

        <Filters
          albums={albums}
          onFilterChange={setFilters}
          filters={filters}
        />

        {loading ? (
          <p className="albums-loading">Loading…</p>
        ) : (
          <div className="albums-grid">
            {filteredAlbums.map((a) => (
              <div key={a.id} className="album-card">
                <img
                  src={generateCover(a.title, a.artist)}
                  alt={`${a.title} by ${a.artist}`}
                  className="album-cover"
                />
                <div className="album-info">
                  <div className="album-title">{a.title}</div>
                  <div className="album-artist">{a.artist}</div>
                  <div className="album-meta">
                    <span className="album-genre">{a.genre}</span>
                    <span className="album-rating">{a.rating}★</span>
                  </div>
                  <div className="album-date">
                    Listened: {a.listenedAt?.slice(0, 10) || 'N/A'}
                  </div>
                  <button
                    onClick={() => onDelete(a.id)}
                    className="album-delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!filteredAlbums.length && (
              <p className="albums-empty">
                {albums.length === 0
                  ? 'No albums yet. Add your first one!'
                  : 'No albums match the current filters.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
