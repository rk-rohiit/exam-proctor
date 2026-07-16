const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1'
];

const baseUrl = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights/';

function downloadFile(fileName) {
  return new Promise((resolve, reject) => {
    const destPath = path.join(targetDir, fileName);
    const file = fs.createWriteStream(destPath);
    const url = baseUrl + fileName;

    console.log(`Downloading ${fileName}...`);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${fileName}: Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Finished ${fileName}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function start() {
  try {
    for (const file of files) {
      await downloadFile(file);
    }
    console.log('✅ All face-api.js models downloaded successfully!');
  } catch (err) {
    console.error('❌ Error downloading models:', err.message);
    process.exit(1);
  }
}

start();
