import React from 'react';
import { useForm } from 'react-hook-form';
import api from '../api';

export default function AddAlbumForm({ onAdded }) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      title: '',
      artist: '',
      genre: 'Rock',
      rating: 5,
      listenedAt: new Date().toISOString().slice(0,10)
    }
  });

  const submit = async (form) => {
    const cleaned = {
      title: form.title.trim(),
      artist: form.artist.trim(),
      genre: form.genre,
      rating: Number(form.rating),
      listenedAt: form.listenedAt
    };
    const saved = await api.addAlbum(cleaned);
    onAdded(saved);
    reset({ ...cleaned, title: '', artist: '' });
  };

  return (
    <div className="card">
      <h2>Add album</h2>
      <form onSubmit={handleSubmit(submit)} className="grid">
        <input placeholder="Album title" {...register('title', { required: true })} />
        <input placeholder="Artist" {...register('artist', { required: true })} />
        <select {...register('genre')}>
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
        <select {...register('rating')}>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
        </select>
        <input type="date" {...register('listenedAt')} />
        <button className="btn">Add</button>
      </form>
    </div>
  );
}
