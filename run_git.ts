import { execSync } from 'child_process';

try {
  console.log("Git Status:");
  console.log(execSync('git status', { encoding: 'utf8' }));
} catch (err: any) {
  console.error("Error running git status:", err.message);
}
