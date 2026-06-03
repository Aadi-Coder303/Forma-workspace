const { app, protocol, net, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    let urlPath = req.url.slice('app://-'.length);
    if (!urlPath || urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(app.getAppPath(), 'out', urlPath);
    console.log('Fetching:', filePath);
    return net.fetch('file://' + filePath);
  });

  const win = new BrowserWindow();
  win.loadURL('app://-/');
});
