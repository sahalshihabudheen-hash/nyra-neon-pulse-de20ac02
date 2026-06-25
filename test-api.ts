async function test() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  console.log('Testing video resolution for Despacito...');
  try {
    const res = await fetch(`http://localhost:3000/api/get-audio-url?videoId=${videoId}`);
    console.log('Response Status:', res.status);
    console.log('Response URL:', res.url);
    const data = await res.json().catch(() => null);
    console.log('Response Data:', data);
  } catch (e: any) {
    console.error('Error during test fetch:', e.message);
  }
}

test();
