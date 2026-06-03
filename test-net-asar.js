const { app, protocol, net, BrowserWindow } = require('electron');
const path = require('path');
app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const filePath = path.join(__dirname, 'test.asar', 'index.html');
    console.log('Fetching:', filePath);
    return net.fetch('file://' + filePath);
  });
  const win = new BrowserWindow();
  win.webContents.on('did-fail-load', (e, code, desc) => console.log('Fail:', code, desc));
  win.loadURL('app://-/');
});
