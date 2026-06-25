import * as fs from 'fs';

try {
  console.log("Copying index.css from temp_clone to src...");
  const content = fs.readFileSync('temp_clone/src/index.css', 'utf8');
  fs.writeFileSync('src/index.css', content, 'utf8');
  console.log("Success! Copied index.css successfully.");
} catch (err: any) {
  console.error("Error copying index.css:", err.message);
}
