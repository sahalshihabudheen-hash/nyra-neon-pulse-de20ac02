async function run() {
  const url1 = 'https://raw.githubusercontent.com/TeamPiped/Piped-Instances/main/instances.json';
  const url2 = 'https://raw.githubusercontent.com/TeamPiped/Piped-Instances/master/instances.json';
  
  for (const url of [url1, url2]) {
    console.log(`Fetching: ${url}`);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      console.log(`  Status: ${res.status}`);
      if (res.ok) {
        const d: any = await res.json();
        console.log(`  SUCCESS! It has ${d.length} entries.`);
        const first = d[0] || {};
        console.log(`  First item keys:`, Object.keys(first));
        console.log(`  First item sample:`, JSON.stringify(first).substring(0, 300));
        
        // Let's print out all item names and APIs!
        const apis = d.map((item: any) => item.api || item.apiUrl).filter(Boolean);
        console.log(`  Found APIs:`, apis);
        break; // stop on first success
      }
    } catch (e: any) {
      console.log(`  Failed: ${e.message}`);
    }
  }
}

run();
