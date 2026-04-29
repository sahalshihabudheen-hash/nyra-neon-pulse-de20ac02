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
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${trackTitle}</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${trackTitle}">
  <meta name="description" content="Listen to ${trackTitle} by ${trackChannel} on ${appName}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="music.song">
  <meta property="og:url" content="${url.href}">
  <meta property="og:title" content="${trackTitle}">
  <meta property="og:description" content="${trackChannel} · ${appName}">
  <meta property="og:image" content="${trackThumbnail}">
  <meta property="og:site_name" content="${appName}">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${url.href}">
  <meta property="twitter:title" content="${trackTitle}">
  <meta property="twitter:description" content="${trackChannel} · ${appName}">
  <meta property="twitter:image" content="${trackThumbnail}">

  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="theme-color" content="#ffd300">

  <!-- Interactive Player for Discord -->
  <meta property="og:video" content="https://nyra-neon-pulse-23e4f39d.vercel.app/embed-player?id=${trackId}&title=${encodeURIComponent(trackTitle)}&channel=${encodeURIComponent(trackChannel)}&thumbnail=${encodeURIComponent(trackThumbnail)}">
  <meta property="og:video:secure_url" content="https://nyra-neon-pulse-23e4f39d.vercel.app/embed-player?id=${trackId}&title=${encodeURIComponent(trackTitle)}&channel=${encodeURIComponent(trackChannel)}&thumbnail=${encodeURIComponent(trackThumbnail)}">
  <meta property="og:video:type" content="text/html">
  <meta property="og:video:width" content="500">
  <meta property="og:video:height" content="250">

  <meta name="twitter:card" content="player">
  <meta name="twitter:player" content="https://nyra-neon-pulse-23e4f39d.vercel.app/embed-player?id=${trackId}&title=${encodeURIComponent(trackTitle)}&channel=${encodeURIComponent(trackChannel)}&thumbnail=${encodeURIComponent(trackThumbnail)}">
  <meta name="twitter:player:width" content="500">
  <meta name="twitter:player:height" content="250">
  
  <meta http-equiv="refresh" content="0;url=https://nyra-neon-pulse-23e4f39d.vercel.app/?play=${trackId}&title=${encodeURIComponent(trackTitle)}&channel=${encodeURIComponent(trackChannel)}&thumbnail=${encodeURIComponent(trackThumbnail)}">
</head>
<body>
  <p>Redirecting to ${appName}...</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
    },
  });
}
