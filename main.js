const { app, BrowserWindow } = require('electron');
const electronDl = require('electron-dl');

electronDl();
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    //kiosk: true, // Powerfull... not sure if we want this or not
    fullscreen: true,
    title: "Photo Booth",
    titleBarStyle: 'hidden',
    disableAutoHideCursor: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.maximize();
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
