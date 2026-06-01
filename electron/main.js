const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const si = require('systeminformation');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 150,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // We could launch server.cjs here or simply use the built IPC.
    // For simplicity, we just load the vite app, which we'll configure to fetch stats over IPC in electron mode.
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
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

ipcMain.handle('get-network-speed', async () => {
  try {
     const stats = await si.networkStats();
     let rx = 0;
     let tx = 0;
     for (const stat of stats) {
       if (stat.operstate === 'up' || stat.rx_bytes > 0) {
         rx += Math.max(0, stat.rx_sec || 0);
         tx += Math.max(0, stat.tx_sec || 0);
       }
     }
     return { downloadMs: rx, uploadMs: tx };
  } catch (e) {
     return { downloadMs: 0, uploadMs: 0 };
  }
});

// Run once to start tracking bandwidth
si.networkStats().catch(() => {});
