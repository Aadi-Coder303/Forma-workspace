const fs = require('fs');
const path = require('path');
try {
  const stat = fs.statSync(path.join(__dirname, 'test.asar', 'index.html'));
  console.log('stat sync:', stat.isFile());
  const data = fs.readFileSync(path.join(__dirname, 'test.asar', 'index.html'));
  console.log('read sync len:', data.length);
} catch (e) {
  console.error('Error:', e);
}
process.exit(0);
