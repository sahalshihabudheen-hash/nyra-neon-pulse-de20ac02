process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
  const videoId = 'dQw4w9WgXcQ'; // Rickroll
  const listUrl = 'https://api.invidious.io/instances.json';
  
  console.log('Fetching raw Invidious list...');
  const res = await fetch(listUrl);
  if (!res.ok) {
    console.log('Failed to fetch list');
    return;
  }
  const data: any = await res.json();
  const instances = data.map((item: any) => item[1].uri || `https://${item[0]}`);

  console.log(`Testing ${instances.length} instances for latest_version proxy...`);
  for (const inst of instances) {
    const url = `${inst}/latest_version?id=${videoId}&local=true&itag=140`;
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000)
      });
      console.log(`[Proxy Test] ${inst} -> HEAD Status: ${response.status}`);
      if (response.ok || response.status === 206 || response.status === 302) {
        console.log(`  🌟 WORKING PROXIED STREAM: ${url}`);
      }
    } catch (e: any) {
      // Silently catch to keep log clean
    }
  }
}

run();
