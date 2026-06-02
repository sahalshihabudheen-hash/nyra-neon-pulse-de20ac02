import https from 'https';

function testGet(url: string) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      console.log(`[https] ${url} -> Status: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`  Parsed length: ${data.length}`);
        resolve(true);
      });
    }).on('error', (err) => {
      console.log(`[https] ${url} -> Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function run() {
  console.log('--- Checking DNS and connection via https module ---');
  await testGet('https://api.cobalt.tools');
  await testGet('https://cobalt.colby.cafe');
  await testGet('https://cobalt.mom');
  await testGet('https://co.v6.sh');
}

run();
