import { execSync } from 'child_process';

try {
  console.log("Checking if git is available...");
  const gitVersion = execSync('git --version', { encoding: 'utf8' });
  console.log("Git version:", gitVersion.trim());

  console.log("Cloning repository into a temporary directory...");
  execSync('git clone https://github.com/sahalshihabudheen-hash/nyra-neon-pulse-de20ac02.git temp_clone', { stdio: 'inherit' });
  console.log("Clone complete!");
} catch (err: any) {
  console.error("Error cloning:", err.message);
  if (err.stdout) console.error("Stdout:", err.stdout);
  if (err.stderr) console.error("Stderr:", err.stderr);
}
