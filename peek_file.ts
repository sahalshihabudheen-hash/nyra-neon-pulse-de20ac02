import * as fs from 'fs';

try {
  const fd = fs.openSync('./nyra-neon-pulse.zip', 'r');
  const buffer = Buffer.alloc(100);
  fs.readSync(fd, buffer, 0, 100, 0);
  console.log("First 100 bytes of nyra-neon-pulse.zip as hex:");
  console.log(buffer.toString('hex'));
  console.log("First 100 bytes of nyra-neon-pulse.zip as text:");
  console.log(buffer.toString('utf8'));
  fs.closeSync(fd);
} catch (err: any) {
  console.error("Error peeking file:", err.message);
}
