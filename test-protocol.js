const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const url = require('url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true } }
]);

app.whenReady().then(async () => {
  protocol.handle('app', (request) => {
    let urlPath = request.url.slice('app://-'.length);
    if (!urlPath || urlPath === '/') urlPath = '/index.html';
    urlPath = urlPath.split('?')[0];
    const asarDir = path.join(__dirname, 'dist/mac/Forma Workspace.app/Contents/Resources/app.asar/src/electron');
    const filePath = path.join(asarDir, '../../out', urlPath);
    console.log("FETCHING:", filePath);
    return net.fetch(url.pathToFileURL(filePath).toString());
  });
  const win = new BrowserWindow();
  win.loadURL('app://-/index.html');
  
  setTimeout(() => app.quit(), 3000);
});
