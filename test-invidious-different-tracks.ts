async function run() {
  const videoId = 'dQw4w9WgXcQ'; // Rickroll
  const endpoints = [
    'https://yt.chocolatemoo53.com',
    'https://invidious.f5.si',
    'https://invidious.nerdvpn.de',
    'https://inv.nadeko.net'
  ];

  console.log(`--- Testing Invidious on standard video: ${videoId} ---`);
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${ep}/api/v1/videos/${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(3000)
      });
      console.log(`[Invidious] ${ep} -> Status: ${res.status}`);
      if (res.ok) {
        const d: any = await res.json();
        const formats = d.adaptiveFormats || [];
        const audio = formats.find((f: any) => f.type?.startsWith('audio/'));
        if (audio?.url) {
          console.log(`  SUCCESS! Stream url: ${audio.url.substring(0, 100)}...`);
        } else {
          console.log(`  Failed: No audio formats found`);
        }
      }
    } catch (e: any) {
      console.log(`[Invidious] ${ep} -> Error: ${e.message}`);
    }
  }
}

run();
