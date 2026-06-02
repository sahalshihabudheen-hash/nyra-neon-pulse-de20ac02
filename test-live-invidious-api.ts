async function testInvidious() {
  const videoId = 'dQw4w9WgXcQ'; // Rickroll
  const listUrl = 'https://api.invidious.io/instances.json';
  
  console.log('Fetching Invidious list...');
  try {
    const res = await fetch(listUrl);
    if (!res.ok) {
      console.log('Failed to fetch list');
      return;
    }
    const data: any = await res.json();
    const upInstances = data
      .map((item: any) => ({
        domain: item[0],
        uri: item[1].uri || `https://${item[0]}`,
        down: item[1].monitor?.down,
        status: item[1].monitor?.last_status
      }))
      .filter((inst: any) => !inst.down && inst.status === 200);

    console.log(`Found ${upInstances.length} up Invidious instances. Testing video API on each...`);

    for (const inst of upInstances) {
      try {
        const videoRes = await fetch(`${inst.uri}/api/v1/videos/${videoId}`, {
          signal: AbortSignal.timeout(3000)
        });
        console.log(`[Invidious] ${inst.uri} -> Status: ${videoRes.status}`);
        if (videoRes.ok) {
          const body: any = await videoRes.json();
          const formats = body.adaptiveFormats || [];
          const audio = formats.find((f: any) => f.type?.startsWith('audio/'));
          if (audio?.url) {
            console.log(`  🌟 KEY SUCCESS! Direct audio stream works: ${audio.url.substring(0, 80)}...`);
            console.log(`  Test details: Mime: ${audio.type}`);
          } else {
            console.log(`  Failed: No audio formats in payload`);
          }
        }
      } catch (e: any) {
        console.log(`[Invidious] ${inst.uri} -> Error: ${e.message}`);
      }
    }
  } catch (err: any) {
    console.error('Invidious central block:', err.message);
  }
}

testInvidious();
