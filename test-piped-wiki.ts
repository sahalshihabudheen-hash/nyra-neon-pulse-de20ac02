async function run() {
  const wikiUrl = 'https://raw.githubusercontent.com/wiki/TeamPiped/Piped/Instances.md';
  console.log(`Fetching TeamPiped Wiki: ${wikiUrl}`);
  try {
    const res = await fetch(wikiUrl);
    if (!res.ok) {
      console.log(`Failed to fetch wiki page, status: ${res.status}`);
      return;
    }
    const text = await res.text();
    console.log('Read success! Extracting URLs...');

    // Regex to match URLs under the markdown tables
    const urlRegex = /https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(urlRegex) || [];
    
    // De-duplicate in a set and filter for piped domain keywords or general urls
    const uniqueUrls = Array.from(new Set(matches)).filter(url => 
      !url.includes('github.com') && 
      !url.includes('wikidata.org') &&
      !url.includes('wikipedia.org') &&
      !url.includes('piped.video') // piped.video is the central landing
    );

    console.log(`Found ${uniqueUrls.length} unique potential Piped domains:`, uniqueUrls);

    console.log('\nTesting stream resolution on each domain (videoId = kJQP7kiw5Fk)...');
    const videoId = 'kJQP7kiw5Fk'; // Despacito

    const tests = uniqueUrls.map(async (domain) => {
      // Normalize to API url:
      // Some URLs in the wiki are user-facing, some are API. Let's try both.
      // E.g., if domain is https://piped.video, the API is https://api.piped.video or https://pipedapi.kavin.rocks
      // The wiki usually lists them separately. Let's make sure we test ${domain}/streams/${videoId}
      try {
        const testRes = await fetch(`${domain}/streams/${videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0'
          },
          signal: AbortSignal.timeout(3000)
        });
        if (testRes.ok) {
          const detail: any = await testRes.json();
          const streams = detail.audioStreams || [];
          if (streams.length > 0) {
            console.log(`[PASS] Piped Instance: ${domain}`);
            console.log(`       Stream Count: ${streams.length}`);
            console.log(`       Sample Stream URL: ${streams[0].url.substring(0, 80)}...`);
            return { domain, stream: streams[0].url };
          } else {
            console.log(`[FAIL] ${domain} -> No audio streams returned`);
          }
        } else {
          console.log(`[FAIL] ${domain} -> Status: ${testRes.status}`);
        }
      } catch (err: any) {
        console.log(`[FAIL] ${domain} -> Error: ${err.message}`);
      }
      return null;
    });

    const results = await Promise.all(tests);
    const success = results.filter(Boolean);
    console.log('\n--- SUCCESSFUL PIPED INSTANCES ---');
    console.log(success);
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

run();
