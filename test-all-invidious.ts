process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testAllInvidious() {
  const videoId = 'dQw4w9WgXcQ'; // Rickroll
  const listUrl = 'https://api.invidious.io/instances.json';
  
  console.log('Fetching raw Invidious list...');
  try {
    const res = await fetch(listUrl);
    if (!res.ok) {
      console.log('Failed to fetch list, status:', res.status);
      return;
    }
    const data: any = await res.json();
    const allInstances: string[] = [];
    for (const item of data) {
      const domain = item[0];
      const stats = item[1];
      const uri = stats.uri || `https://${domain}`;
      allInstances.push(uri);
    }
    
    console.log(`Found ${allInstances.length} Invidious instances in the registry. Testing each...`);
    const successful: string[] = [];
    
    for (const inst of allInstances) {
      try {
        const videoRes = await fetch(`${inst}/api/v1/videos/${videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(4000)
        });
        
        console.log(`[Invidious] ${inst} -> Status: ${videoRes.status}`);
        if (videoRes.ok) {
          const body: any = await videoRes.json();
          const formats = body.adaptiveFormats || [];
          const audio = formats.find((f: any) => f.type?.startsWith('audio/'));
          if (audio?.url) {
            console.log(`  🎉 SUCCESS on ${inst}! Audio URL verified!`);
            successful.push(inst);
          } else {
            console.log(`  No audio format found on ${inst}.`);
          }
        }
      } catch (e: any) {
        console.log(`[Invidious] ${inst} -> Failed: ${e.message}`);
      }
    }
    
    console.log('\n--- VERIFIED WORKING INVIDIOUS INSTANCES ---');
    console.log(successful);
  } catch (err: any) {
    console.error('Core error:', err.message);
  }
}

testAllInvidious();
