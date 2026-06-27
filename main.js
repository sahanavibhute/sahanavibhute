const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  // Start Express API server as a background process
  const backendPath = path.join(__dirname, 'backend', 'server.js');
  backendProcess = fork(backendPath, [], {
    env: { ...process.env, PORT: 5173, NODE_ENV: 'production' }
  });

  backendProcess.on('message', (msg) => {
    console.log('Backend message:', msg);
  });

  backendProcess.on('error', (err) => {
    console.error('Backend process error:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'frontend', 'public', 'favicon.ico'),
    title: 'Gym Supplement Inventory & Billing'
  });

  // Remove default menu for clean desktop look
  mainWindow.setMenuBarVisibility(false);

  // In production, we load the Express server (which serves the React static build)
  // Give the backend a second to start up before loading the page
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.log('Failed to load backend URL, retrying...', err);
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:5173');
      }, 2000);
    });
  }, 1000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
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

app.on('will-quit', () => {
  // Ensure the backend process is killed when the Electron app exits
  if (backendProcess) {
    backendProcess.kill();
  }
});
