async function testRegistries() {
  console.log('--- Fetching Invidious Instances Dynamic Registry ---');
  try {
    const res = await fetch('https://api.invidious.io/instances.json');
    if (res.ok) {
      const data: any = await res.json();
      console.log(`Success! Total Invidious instances parsed: ${data.length || Object.keys(data).length}`);
      // Invidious instances are usually elements like [ "domain", { ... } ]
      const activeEndpoints = data
        .filter((item: any) => item[1]?.api && item[1]?.type === 'https' && item[1]?.monitor?.status === 'up')
        .map((item: any) => item[1]?.uri || `https://${item[0]}`);
      console.log('Active, Up Invidious API Endpoints (sample of 5):', activeEndpoints.slice(0, 5));
    } else {
      console.log('Invidious request failed, Status:', res.status);
    }
  } catch (e: any) {
    console.log('Invidious registry error:', e.message);
  }

  console.log('\n--- Fetching Piped Instances Dynamic Registry (FreeTube resource) ---');
  try {
    const res = await fetch('https://raw.githubusercontent.com/freetubeapp/freetube-resources/master/data/piped_instances.json');
    if (res.ok) {
      const data: any = await res.json();
      // FreeTube holds Piped instances as array of { name, api_url, etc. }
      console.log(`Success! Total Piped instances parsed: ${data.length}`);
      const activeEndpoints = data
        .filter((item: any) => item.api_url)
        .map((item: any) => item.api_url);
      console.log('Piped API Endpoints (sample of 5):', activeEndpoints.slice(0, 5));
    } else {
      console.log('Piped request failed, Status:', res.status);
    }
  } catch (e: any) {
    console.log('Piped registry error:', e.message);
  }
}

testRegistries();
