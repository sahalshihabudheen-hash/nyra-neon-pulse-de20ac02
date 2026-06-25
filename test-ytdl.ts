import ytdl from '@distube/ytdl-core';

async function run() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito
  console.log(`--- Testing @distube/ytdl-core stream extraction for videoId: ${videoId} ---`);
  try {
    const info = await ytdl.getInfo(videoId);
    console.log(`Success! Video Title: "${info.videoDetails.title}"`);
    console.log(`Length (seconds): ${info.videoDetails.lengthSeconds}`);
    
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
    if (format && format.url) {
      console.log(`SUCCESS! Direct Audio Format Found:`, format.container);
      console.log(`Audio Bitrate: ${format.audioBitrate}`);
      console.log(`Audio Stream URL: ${format.url.substring(0, 100)}...`);
    } else {
      console.log(`Failed: No audio formats matched the request.`);
    }
  } catch (err: any) {
    console.log(`ERROR from @distube/ytdl-core:`, err.message);
  }
}

run();
