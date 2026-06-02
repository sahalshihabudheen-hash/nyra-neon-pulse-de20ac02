async function run() {
  const url = 'https://raw.githubusercontent.com/imputnet/cobalt/main/docs/mirrors.md';
  console.log('Fetching raw mirrors.md from imputnet/cobalt...');
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Failed! Status: ${res.status}`);
      return;
    }
    const text = await res.text();
    console.log('Successfully fetched mirrors.md! Content below:');
    console.log('--------------------------------------------------');
    console.log(text);
    console.log('--------------------------------------------------');
  } catch (err: any) {
    console.error('Error fetching mirrors.md:', err.message);
  }
}

run();
