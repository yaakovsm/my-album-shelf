import React from 'react';

export default function AlbumList({ albums }) {
  if (!albums.length) {
    return <div className="muted">No albums yet. Add your first one! </div>;
  }

  return (
    <div className="list">
      {albums.map(a => (
        <div key={a.id ?? `${a.title}-${a.artist}-${a.listenedAt}`} className="row">
          <div className="title">{a.title}</div>
          <div className="artist">{a.artist}</div>
          <div className="genre">{a.genre}</div>
          <div className="rating">{'★'.repeat(a.rating)}</div>
          <div className="date">{a.listenedAt}</div>
        </div>
      ))}
    </div>
  );
}
