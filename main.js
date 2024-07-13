const { app, BrowserWindow } = require('electron');
const path = require('node:path')

//import electronDl from 'electron-dl';
//const electronDl = require('electron-dl');
//electronDl();


function createWindow() {
  const win = new BrowserWindow({
    //kiosk: true, // Powerfull... not sure if we want this or not
    fullscreen: true,
    title: "Photo Booth",
    titleBarStyle: 'hidden',
    disableAutoHideCursor: true,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js')
    }
  });

  win.maximize();
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
