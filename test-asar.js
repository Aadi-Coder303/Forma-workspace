const fs = require('fs/promises');
const path = require('path');
(async () => {
  try {
    const stat = await fs.stat(path.join(__dirname, 'test.asar', 'index.html'));
    console.log('stat:', stat.isFile());
    const data = await fs.readFile(path.join(__dirname, 'test.asar', 'index.html'));
    console.log('read len:', data.length);
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
})();
