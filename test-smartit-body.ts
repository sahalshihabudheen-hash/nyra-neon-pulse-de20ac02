process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  try {
    const res = await fetch('https://cobalt.smartit.nu/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioQuality: '128'
      })
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Raw Body Response:`);
    console.log(text);
  } catch (err: any) {
    console.log('Error:', err.message);
  }
}

run();
