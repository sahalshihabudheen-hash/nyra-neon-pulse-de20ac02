import https from 'https';

https.get('https://www.y2mate.com/', {
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
}).on('error', (err) => {
  console.error('Error:', err.message);
});
