import React, { useMemo } from 'react';

export default function StatsBar({ albums }) {
  const total = albums.length;
  const avg = useMemo(() => {
    if (!albums.length) return 0;
    return (albums.reduce((s, a) => s + Number(a.rating || 0), 0) / albums.length).toFixed(1);
  }, [albums]);

  const top = useMemo(() => {
    return albums.filter(a => Number(a.rating) === 5).length;
  }, [albums]);

  return (
    <div className="stats">
      <div><strong>Total:</strong> {total}</div>
      <div><strong>Avg rating:</strong> {avg}</div>
      <div><strong>5★:</strong> {top}</div>
    </div>
  );
}
