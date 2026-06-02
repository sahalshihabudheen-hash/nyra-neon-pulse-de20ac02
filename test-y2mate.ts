async function run() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  console.log(`--- Testing Undocumented y2mate AJAX API for: ${videoId} ---`);
  
  try {
    // Step 1: Analyze the video
    console.log('Sending Analyze request...');
    const analyzeRes = await fetch('https://www.y2mate.com/mates/analyzeV2/ajax', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.y2mate.com/en898'
      },
      body: new URLSearchParams({
        k_query: `https://www.youtube.com/watch?v=${videoId}`,
        k_page: 'home',
        hl: 'en',
        q_auto: '1'
      })
    });

    if (!analyzeRes.ok) {
      console.log(`Analyze failed! Status: ${analyzeRes.status}`);
      return;
    }

    const analyzeData: any = await analyzeRes.json();
    console.log('Analyze Success! Response Keys:', Object.keys(analyzeData));
    
    if (analyzeData.status !== 'ok') {
      console.log('Analyze returned error:', analyzeData.mess || 'Unknown');
      return;
    }

    console.log(`Title: "${analyzeData.title}"`);
    console.log(`Video ID: ${analyzeData.vid}`);

    // Extract the MP3 keys
    const mp3Formats = analyzeData.links?.mp3 || {};
    // Grab the first available key for mp3 conversion (usually mp3128, mp3192, etc.)
    const formatKeys = Object.keys(mp3Formats);
    if (formatKeys.length === 0) {
      console.log('No MP3 formats found in links:', analyzeData.links);
      return;
    }

    console.log('Available audio formats:', formatKeys);
    const selectedFormat = mp3Formats[formatKeys[0]];
    const key = selectedFormat.k;
    console.log(`Selected Quality: ${selectedFormat.q} (${selectedFormat.size})`);
    console.log(`Format Encryption Key: ${key.substring(0, 40)}...`);

    // Step 2: Convert the video to direct MP3 download
    console.log('\nSending Convert request...');
    const convertRes = await fetch('https://www.y2mate.com/mates/convertV2/ajax', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.y2mate.com/en898'
      },
      body: new URLSearchParams({
        vid: analyzeData.vid,
        k: key
      })
    });

    if (!convertRes.ok) {
      console.log(`Convert failed! Status: ${convertRes.status}`);
      return;
    }

    const convertData: any = await convertRes.json();
    console.log('Convert Success!');
    console.log('Body Status:', convertData.status);
    console.log('Conversion Status:', convertData.c_status);
    
    if (convertData.status === 'ok' && convertData.dlink) {
      console.log('\n🌟 SUCCESS! DIRECT STREAM LINK OBTAINED:');
      console.log(convertData.dlink);
    } else {
      console.log('Convert payload didn\'t yield dlink:', convertData);
    }

  } catch (err: any) {
    console.log('System Error:', err.message);
  }
}

run();
