export const generateCover = (title, artist) => {
  const seed = encodeURIComponent(title + artist);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    artist
  )}&background=random&size=200&bold=true`;
};

