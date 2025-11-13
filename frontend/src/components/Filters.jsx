export default function Filters({ albums, onFilterChange, filters }) {
  // Get unique genres from albums
  const genres = [...new Set(albums.map(a => a.genre).filter(Boolean))].sort();

  function handleGenreChange(e) {
    onFilterChange({ ...filters, genre: e.target.value || null });
  }

  function handleRatingChange(e) {
    onFilterChange({ ...filters, rating: e.target.value ? Number(e.target.value) : null });
  }

  function handleReset() {
    onFilterChange({ genre: null, rating: null });
  }

  return (
    <div className="filters-container">
      <div className="filters-group">
        <label htmlFor="genre-filter">Genre:</label>
        <select
          id="genre-filter"
          value={filters.genre || ''}
          onChange={handleGenreChange}
          className="filter-select"
        >
          <option value="">All Genres</option>
          {genres.map(genre => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </div>

      <div className="filters-group">
        <label htmlFor="rating-filter">Rating:</label>
        <select
          id="rating-filter"
          value={filters.rating || ''}
          onChange={handleRatingChange}
          className="filter-select"
        >
          <option value="">All Ratings</option>
          {[1, 2, 3, 4, 5].map(rating => (
            <option key={rating} value={rating}>{rating}★</option>
          ))}
        </select>
      </div>

      <button onClick={handleReset} className="filter-reset-btn">
        Reset Filters
      </button>
    </div>
  );
}

