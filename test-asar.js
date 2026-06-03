const { app, net } = require('electron');
const path = require('path');
const url = require('url');

app.whenReady().then(async () => {
  const asarPath = path.join(__dirname, 'dist/mac/Forma Workspace.app/Contents/Resources/app.asar/out/index.html');
  const fileUrl = url.pathToFileURL(asarPath).toString();
  try {
    const res = await net.fetch(fileUrl);
    console.log("FETCH STATUS:", res.status);
    console.log("FETCH TEXT:", (await res.text()).slice(0, 100));
  } catch (e) {
    console.error("FETCH ERROR:", e);
  }
  app.quit();
});
