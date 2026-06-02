async function testLocalProxyRewrite() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  const instance = 'https://inv.thepixora.com';
  
  console.log(`Fetching stream info from ${instance} for ${videoId}`);
  try {
    const apiRes = await fetch(`${instance}/api/v1/videos/${videoId}`);
    if (!apiRes.ok) {
      console.log('Failed to fetch api info, status:', apiRes.status);
      return;
    }
    const data = await apiRes.json() as any;
    const formats = data.adaptiveFormats || [];
    const audioFormat = formats.find((f: any) => f.type?.startsWith('audio/'));
    if (!audioFormat || !audioFormat.url) {
      console.log('No audio format found in API response.');
      return;
    }
    
    const originalUrl = audioFormat.url;
    console.log('Original GoogleVideo URL:', originalUrl.substring(0, 120));
    
    // Parse the original URL to get only the pathname and search params
    const parsed = new URL(originalUrl);
    const proxyUrl = `${instance}/videoplayback${parsed.search}&local=true`;
    console.log('Rewritten Proxied URL:', proxyUrl.substring(0, 120));
    
    // Test fetching the rewritten URL
    const streamRes = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Range': 'bytes=0-1024' // request first 1KB
      }
    });
    
    console.log('Stream Proxy Response Status:', streamRes.status);
    console.log('Content-Type:', streamRes.headers.get('content-type'));
    console.log('Content-Length:', streamRes.headers.get('content-length'));
    console.log('Content-Range:', streamRes.headers.get('content-range'));
    
    if (streamRes.status === 200 || streamRes.status === 206) {
      const buf = await streamRes.arrayBuffer();
      console.log(`🎉 SUCCESS! Successfully fetched ${buf.byteLength} bytes from proxied stream!`);
    } else {
      const errText = await streamRes.text();
      console.log('Failed! Response body:', errText.substring(0, 300));
    }
  } catch (err: any) {
    console.error('Error in proxy test:', err.message);
  }
}

testLocalProxyRewrite();
