import * as fs from 'fs';

try {
  const stats1 = fs.statSync('./nyra-neon-pulse.zip');
  console.log("nyra-neon-pulse.zip size:", stats1.size);
} catch (err: any) {
  console.error("Error stat-ing nyra-neon-pulse.zip:", err.message);
}

try {
  const stats2 = fs.statSync('./nyra-full-source.zip');
  console.log("nyra-full-source.zip size:", stats2.size);
} catch (err: any) {
  console.error("Error stat-ing nyra-full-source.zip:", err.message);
}
