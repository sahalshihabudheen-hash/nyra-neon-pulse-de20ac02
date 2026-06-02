process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function verifyPlayback() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  const backends = [
    'https://invidious.f5.si',
    'https://invidious.nerdvpn.de'
  ];

  for (const back of backends) {
    const url = `${back}/latest_version?id=${videoId}&local=true&itag=140`;
    console.log(`Checking track playback bytes from: ${url}`);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Range': 'bytes=0-1000'
        }
      });
      console.log(`  Status: ${res.status}`);
      console.log(`  Content-Type: ${res.headers.get('content-type')}`);
      console.log(`  Content-Length: ${res.headers.get('content-length')}`);
      console.log(`  Content-Range: ${res.headers.get('content-range')}`);
      if (res.status === 200 || res.status === 206) {
        const text = await res.text();
        console.log(`  🎉 SEED Response text preview (first 400 chars):`, text.substring(0, 400));
      } else {
        console.log(`  Failed. response: ${await res.text()}`);
      }
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

verifyPlayback();
