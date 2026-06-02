process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
async function run() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  console.log('Fetching live Invidious registry...');
  try {
    const res = await fetch('https://api.invidious.io/instances.json');
    if (!res.ok) {
      console.log('Failed to fetch registry, status:', res.status);
      return;
    }
    const data: any = await res.json();
    console.log(`Found ${data.length} registered Invidious servers. Filtering for responsive ones...`);
    
    // Transform and filter instances
    const activeInstances = data
      .map((item: any) => {
        const domain = item[0];
        const info = item[1];
        return {
          domain,
          uri: info.uri || `https://${domain}`,
          down: info.monitor?.down,
          status: info.monitor?.last_status,
          uptime: info.monitor?.uptime || 0
        };
      })
      .filter((inst: any) => !inst.down && inst.status === 200);

    console.log(`Found ${activeInstances.length} live instances. Testing adaptive audio streams on each...`);
    
    const testPromises = activeInstances.map(async (inst: any) => {
      try {
        const testRes = await fetch(`${inst.uri}/api/v1/videos/${videoId}`, {
          signal: AbortSignal.timeout(4000)
        });
        if (testRes.ok) {
          const detail = await testRes.json();
          const formats = detail.adaptiveFormats || [];
          const audioFormat = formats.find((f: any) => f.type?.startsWith('audio/'));
          if (audioFormat?.url) {
            console.log(`[PASS] Invidious instance: ${inst.uri}`);
            console.log(`       Direct Audio stream: ${audioFormat.url.substring(0, 80)}...`);
            return inst.uri;
          } else {
            console.log(`[FAIL] ${inst.uri} -> No audio adaptive formats found`);
          }
        } else {
          console.log(`[FAIL] ${inst.uri} -> Status code: ${testRes.status}`);
        }
      } catch (err: any) {
        console.log(`[FAIL] ${inst.uri} -> Request error: ${err.message}`);
      }
      return null;
    });

    const results = await Promise.all(testPromises);
    const successfulOne = results.filter(Boolean);
    console.log('\n--- DIAGNOSTICS COMPLETE ---');
    console.log(`Successfully verified instances:`, successfulOne);
  } catch (e: any) {
    console.error('Invidious fetch error:', e.message);
  }
}

run();
