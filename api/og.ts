export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const trackId = url.searchParams.get('id');
  const trackTitle = url.searchParams.get('title') || 'Great Music';
  const trackChannel = url.searchParams.get('channel') || 'NYRA';
  const trackThumbnail = url.searchParams.get('thumbnail') || 'https://nyra-neon-pulse-23e4f39d.vercel.app/og-image.png';
  
  const appName = "NYRA";
  const embedUrl = `https://nyra-neon-pulse-23e4f39d.vercel.app/embed-player?id=${trackId}&title=${encodeURIComponent(trackTitle)}&channel=${encodeURIComponent(trackChannel)}&thumbnail=${encodeURIComponent(trackThumbnail)}`;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>🎧 ${trackTitle}</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="💖 ${trackTitle}">
  <meta name="description" content="✨ ${trackChannel} · NYRA PREMIUM • FEEL THE PULSE">

  <meta property="og:type" content="video.other">
  <meta property="og:site_name" content="NYRA • FEEL THE PULSE">
  <meta property="og:title" content="🎧 ${trackTitle}">
  <meta property="og:description" content="✨ ${trackChannel} • Click the link for full Soundwaves!">
  <meta property="og:image" content="${trackThumbnail}">

  <!-- YouTube Fakeout to force Play Button -->
  <meta property="og:video" content="https://www.youtube.com/embed/${trackId}">
  <meta property="og:video:secure_url" content="https://www.youtube.com/embed/${trackId}">
  <meta property="og:video:type" content="text/html">
  <meta property="og:video:width" content="1280">
  <meta property="og:video:height" content="720">

  <meta name="twitter:card" content="player">
  <meta name="twitter:player" content="https://www.youtube.com/embed/${trackId}">
  <meta name="twitter:player:width" content="1280">
  <meta name="twitter:player:height" content="720">

  <meta name="theme-color" content="#ffd300">
  
  <meta http-equiv="refresh" content="0;url=https://nyra-neon-pulse-23e4f39d.vercel.app/?play=${trackId}&title=${encodeURIComponent(trackTitle)}&channel=${encodeURIComponent(trackChannel)}&thumbnail=${encodeURIComponent(trackThumbnail)}">
</head>
<body>
  <div style="background: #0b0b0b; color: white; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif;">
    <img src="${trackThumbnail}" style="width: 200px; height: 200px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
    <h1 style="margin: 0; font-size: 24px;">${trackTitle}</h1>
    <p style="color: #888; margin-top: 8px;">Opening in ${appName}...</p>
  </div>
</body>
</html>`;



  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
    },
  });
}
