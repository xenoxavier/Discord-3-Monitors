const { app, BrowserWindow, BrowserView, globalShortcut, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let sidebarsHidden = false;
let discordViews = [];
let instanceCount = 3;
const TOOLBAR_HEIGHT = 50;

// CSS to hide Discord sidebars (server list and channel list)
const hidesSidebarsCSS = `
  /* Hide server list (left sidebar) */
  [class*="guilds-"] {
    display: none !important;
  }
  nav[aria-label="Servers sidebar"] {
    display: none !important;
  }
  /* Hide channel list sidebar */
  [class*="sidebar_"][class*="container-"] {
    display: none !important;
  }
  [class*="sidebar-"] {
    display: none !important;
  }
  /* Expand chat area to full width */
  [class*="chat_"] {
    margin-left: 0 !important;
  }
  [class*="chat-"] {
    margin-left: 0 !important;
  }
  [class*="content_"] {
    margin-left: 0 !important;
    max-width: 100% !important;
  }
  [class*="content-"] {
    margin-left: 0 !important;
    max-width: 100% !important;
  }
`;

const showSidebarsCSS = `
  /* Show server list (left sidebar) */
  [class*="guilds-"] {
    display: flex !important;
  }
  nav[aria-label="Servers sidebar"] {
    display: flex !important;
  }
  /* Show channel list sidebar */
  [class*="sidebar_"][class*="container-"] {
    display: flex !important;
  }
  [class*="sidebar-"] {
    display: flex !important;
  }
  /* Reset chat area margin */
  [class*="chat_"] {
    margin-left: unset !important;
  }
  [class*="chat-"] {
    margin-left: unset !important;
  }
  [class*="content_"] {
    margin-left: unset !important;
    max-width: unset !important;
  }
  [class*="content-"] {
    margin-left: unset !important;
    max-width: unset !important;
  }
`;

// Calculate pane layout based on instance count
const updatePanes = () => {
  const [contentWidth, contentHeight] = mainWindow.getContentSize();
  const availableHeight = contentHeight - TOOLBAR_HEIGHT;
  const paneWidth = Math.floor(contentWidth / instanceCount);

  discordViews.forEach((view, index) => {
    view.setBounds({
      x: paneWidth * index,
      y: TOOLBAR_HEIGHT,
      width: paneWidth,
      height: availableHeight
    });
  });
};

// Function to toggle sidebars across all active views
const toggleSidebars = () => {
  sidebarsHidden = !sidebarsHidden;
  const css = sidebarsHidden ? hidesSidebarsCSS : showSidebarsCSS;

  discordViews.forEach(view => {
    view.webContents.insertCSS(css);
  });

  console.log(`Sidebars ${sidebarsHidden ? 'hidden' : 'visible'}`);
};

// Create all 3 Discord views (called once at startup)
function createAllDiscordViews() {
  // Create all 3 views permanently
  for (let i = 0; i < 3; i++) {
    const view = new BrowserView({
      webPreferences: {
        partition: `persist:discord${i + 1}`,
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Set user agent to avoid detection issues
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    view.webContents.setUserAgent(userAgent);

    // Load Discord
    view.webContents.loadURL('https://discord.com/app');

    discordViews.push(view);
  }
  console.log('Created 3 persistent Discord views');
}

// Update which views are visible based on instance count
function updateVisibleViews(count) {
  // Remove all views from window first
  discordViews.forEach(view => {
    mainWindow.removeBrowserView(view);
  });

  // Add only the requested number of views
  for (let i = 0; i < count; i++) {
    mainWindow.addBrowserView(discordViews[i]);
  }

  instanceCount = count;
  console.log(`Displaying ${count} Discord instance(s)`);
}

function createWindow() {
  // Create the main window
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 1000,
    backgroundColor: '#2f3136',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load toolbar HTML
  mainWindow.loadFile('toolbar.html');

  // Create all 3 Discord views once (they persist for the lifetime of the app)
  createAllDiscordViews();

  // Show the default number of instances
  updateVisibleViews(instanceCount);

  // Initial layout
  updatePanes();

  // Update pane sizes when window is resized
  mainWindow.on('resize', updatePanes);

  // Register keyboard shortcut to toggle sidebars (Cmd+B on Mac, Ctrl+B on others)
  globalShortcut.register('CommandOrControl+B', () => {
    toggleSidebars();
  });

  // Open DevTools for debugging (optional - remove if not needed)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  // IPC handler for instance count changes
  ipcMain.on('instance-count-changed', (event, count) => {
    console.log(`Instance count changed to: ${count}`);
    updateVisibleViews(count);
    updatePanes();
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});
