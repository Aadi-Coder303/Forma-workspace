const fs = require('fs');
const path = require('path');
console.log('Exists index:', fs.existsSync(path.join(__dirname, 'test.asar', 'index.html')));
console.log('Exists out:', fs.existsSync(path.join(__dirname, 'test.asar')));
process.exit(0);
