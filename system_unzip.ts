import { execSync } from 'child_process';

try {
  console.log("Checking if system unzip is available...");
  const unzipVersion = execSync('unzip -v', { encoding: 'utf8' });
  console.log("Unzip is available!");

  console.log("Extracting nyra-neon-pulse.zip using system unzip to a temp folder...");
  execSync('unzip -o nyra-neon-pulse.zip -d temp_extract', { stdio: 'inherit' });
  console.log("Extraction successful!");
} catch (err: any) {
  console.error("Error with system unzip:", err.message);
}
