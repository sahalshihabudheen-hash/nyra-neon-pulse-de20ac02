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
  <title>${trackTitle}</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${trackTitle}">
  <meta name="description" content="${trackChannel} · ${appName}">

  <!-- Twitter Player Card (PRIORITY) -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:site" content="@nyra">
  <meta name="twitter:player" content="${embedUrl}">
  <meta name="twitter:player:width" content="500">
  <meta name="twitter:player:height" content="250">
  <meta name="twitter:title" content="${trackTitle}">
  <meta name="twitter:description" content="${trackChannel} · ${appName}">
  <meta name="twitter:image" content="${trackThumbnail}">

  <!-- Open Graph -->
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${url.href}">
  <meta property="og:title" content="${trackTitle}">
  <meta property="og:description" content="${trackChannel} · ${appName}">
  <meta property="og:image" content="${trackThumbnail}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="${appName}">

  <!-- Interactive Video Tags -->
  <meta property="og:video" content="${embedUrl}">
  <meta property="og:video:secure_url" content="${embedUrl}">
  <meta property="og:video:type" content="text/html">
  <meta property="og:video:width" content="500">
  <meta property="og:video:height" content="250">
  <meta property="og:video:tag" content="music">


  <meta name="theme-color" content="#ffd300">
  
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
