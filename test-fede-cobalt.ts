async function run() {
  const url1 = 'https://raw.githubusercontent.com/fede-pro/cobalt-instances/main/instances.json';
  const url2 = 'https://raw.githubusercontent.com/fede-pro/cobalt-instances/master/instances.json';
  
  for (const url of [url1, url2]) {
    console.log(`Fetching: ${url}`);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      console.log(`  Status: ${res.status}`);
      if (res.ok) {
        const d: any = await res.json();
        console.log(`  SUCCESS! Parser obtained ${d.length || Object.keys(d).length} entries.`);
        
        let instances: string[] = [];
        if (Array.isArray(d)) {
          instances = d.map((x: any) => x.url || x.api || x.uri).filter(Boolean);
        } else if (d && typeof d === 'object') {
          // If it's a map
          instances = Object.keys(d);
        }
        
        console.log('Instances found:', instances);
        break;
      }
    } catch (e: any) {
      console.log(`  Failed: ${e.message}`);
    }
  }
}

run();
