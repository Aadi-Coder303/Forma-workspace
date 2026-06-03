const { app, protocol } = require('electron');
app.whenReady().then(() => {
  console.log("registerFileProtocol exists:", typeof protocol.registerFileProtocol);
  app.quit();
});
