import AdmZip from 'adm-zip';
import * as fs from 'fs';

try {
  console.log("Loading nyra-neon-pulse.zip...");
  const zip = new AdmZip('./nyra-neon-pulse.zip');
  console.log("Extracting src/index.css to a temp variable...");
  const entry = zip.getEntry('src/index.css');
  if (entry) {
    console.log("index.css found in zip! Content:");
    console.log(entry.getData().toString('utf8'));
  } else {
    console.log("index.css NOT found in zip!");
  }
} catch (err: any) {
  console.error("Error reading zip:", err.message);
}
