import https from 'https';

function testGet(url: string) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      console.log(`[https] ${url} -> Status: ${res.statusCode}`);
      resolve(true);
    }).on('error', (err) => {
      console.log(`[https] ${url} -> Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function run() {
  const mirrors = [
    'https://cobalt.q69.de',
    'https://cobalt.shite.xyz',
    'https://cobalt.k6.ovh',
    'https://co.v6.sh',
    'https://cobalt.smartit.nu',
    'https://cobalt.drgns.space',
    'https://c.onon.app'
  ];
  for (const m of mirrors) {
    await testGet(m);
  }
}

run();
