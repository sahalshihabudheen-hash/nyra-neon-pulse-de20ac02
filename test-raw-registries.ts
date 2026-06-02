async function checkInvidiousRaw() {
  try {
    const res = await fetch('https://api.invidious.io/instances.json');
    const data: any = await res.json();
    console.log('Invidious top objects sample:', JSON.stringify(data.slice(0, 2), null, 2));
  } catch (e: any) {
    console.log('Invidious fetch error:', e.message);
  }
}

async function checkPipedRaw() {
  const urls = [
    'https://piped-instances.github.io/data/instances.json',
    'https://raw.githubusercontent.com/piped-instances/piped-instances.github.io/main/data/instances.json'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`Piped Registry ${url} -> Status ${res.status}`);
      if (res.ok) {
        const data: any = await res.json();
        console.log(`  Success! Keys inside Piped json:`, Object.keys(data).slice(0, 10));
        if (data.instances) {
          console.log(`  Instances details sample:`, JSON.stringify(data.instances.slice(0, 2), null, 2));
        } else if (Array.isArray(data)) {
          console.log(`  Sample item:`, JSON.stringify(data[0], null, 2));
        }
      }
    } catch (e: any) {
      console.log(`  Error on ${url}:`, e.message);
    }
  }
}

async function run() {
  await checkInvidiousRaw();
  await checkPipedRaw();
}

run();
