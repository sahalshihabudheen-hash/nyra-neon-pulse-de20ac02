async function test() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  console.log('Testing video STREAM resolution for Despacito...');
  try {
    const res = await fetch(`http://localhost:3000/api/get-audio-url?videoId=${videoId}&stream=1`, {
      headers: {
        'Range': 'bytes=0-100'
      }
    });
    console.log('Response Status:', res.status);
    console.log('Response Headers:', Object.fromEntries(res.headers.entries()));
    const textSnapshot = await res.text().then(t => t.substring(0, 150)).catch(() => 'could not read text');
    console.log('Response Text (first 150 chars):', textSnapshot);
  } catch (e: any) {
    console.error('Error during stream test fetch:', e.message);
  }
}

test();
