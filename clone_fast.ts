import { execSync } from 'child_process';

try {
  console.log("Cloning repository with depth 1 and a 10-second timeout...");
  execSync('git clone --depth 1 https://github.com/sahalshihabudheen-hash/nyra-neon-pulse-de20ac02.git temp_clone', {
    stdio: 'inherit',
    timeout: 10000
  });
  console.log("Clone completed successfully!");
} catch (err: any) {
  console.error("Error cloning:", err.message);
}
