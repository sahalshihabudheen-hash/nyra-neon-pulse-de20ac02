async function run() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  const endpoint = 'https://inv.thepixora.com';
  console.log(`Testing Despacito on ${endpoint}/api/v1/videos/${videoId}...`);
  try {
    const res = await fetch(`${endpoint}/api/v1/videos/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const data: any = await res.json();
      const formats = data.adaptiveFormats || [];
      const audio = formats.find((f: any) => f.type?.startsWith('audio/'));
      if (audio?.url) {
        console.log(`🌟 CRITICAL SUCCESS! DESPACITO DIRECT STREAM RETRIEVED:`);
        console.log(audio.url.substring(0, 150) + '...');
        console.log(`Format Type: ${audio.type}`);
      } else {
        console.log('Failed: No audio formats found');
      }
    } else {
      console.log('Failed on instance side with non-200');
    }
  } catch (err: any) {
    console.log('Error:', err.message);
  }
}

run();
