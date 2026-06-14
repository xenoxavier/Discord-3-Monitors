const { app, BrowserWindow, BrowserView, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let sidebarsHidden = false;
let discordViews = [];
let visiblePanes = [0, 1, 2]; // indices of visible panes (default: all 3)
const TOOLBAR_HEIGHT = 50;
const TOOLBAR_PEEK = 4;
let toolbarVisible = true;
const viewStyleKeys = new Map();

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
const PANE_GAP = 2;

function ensureViewStyleState(index) {
  if (!viewStyleKeys.has(index)) {
    viewStyleKeys.set(index, {
      sidebar: null,
      focus: null,
      progress: null
    });
  }

  return viewStyleKeys.get(index);
}

async function replaceViewCSS(index, kind, css) {
  const view = discordViews[index];
  if (!view || view.webContents.isDestroyed()) return;

  const styleState = ensureViewStyleState(index);
  if (styleState[kind]) {
    try {
      await view.webContents.removeInsertedCSS(styleState[kind]);
    } catch (e) {}
  }

  try {
    styleState[kind] = await view.webContents.insertCSS(css);
  } catch (e) {
    styleState[kind] = null;
  }
}

const updatePanes = () => {
  if (visiblePanes.length === 0) return;
  const bounds = mainWindow.getBounds();
  const contentWidth = bounds.width;
  const toolbarH = toolbarVisible ? TOOLBAR_HEIGHT : TOOLBAR_PEEK;
  const contentHeight = bounds.height - toolbarH;
  const count = visiblePanes.length;
  const totalGaps = (count - 1) * PANE_GAP;
  const paneWidth = Math.floor((contentWidth - totalGaps) / count);

  visiblePanes.forEach((paneIndex, slot) => {
    discordViews[paneIndex].setBounds({
      x: (paneWidth + PANE_GAP) * slot,
      y: toolbarH,
      width: paneWidth,
      height: availableHeight
    });
  });
};

// Function to toggle sidebars across all active views
const toggleSidebars = () => {
  sidebarsHidden = !sidebarsHidden;
  const css = sidebarsHidden ? hidesSidebarsCSS : showSidebarsCSS;

  visiblePanes.forEach(i => {
    replaceViewCSS(i, 'sidebar', css);
  });

  // Notify toolbar of sidebar state
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sidebar-state-changed', sidebarsHidden);
  }

  console.log(`Sidebars ${sidebarsHidden ? 'hidden' : 'visible'}`);
};

// Send pane status to toolbar
function sendPaneStatus(pane, status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pane-status', { pane, status });
  }
}

// Notification badge: aggregate unread counts from all Discord titles
function updateBadgeCount() {
  let total = 0;
  visiblePanes.forEach(i => {
    try {
      const title = discordViews[i].webContents.getTitle();
      const match = title.match(/\((\d+)\)/);
      if (match) total += parseInt(match[1], 10);
    } catch (e) {}
  });
  if (process.platform === 'darwin') {
    app.setBadgeCount(total);
  }
  // Send to toolbar for display
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('badge-count', total);
  }
}

// Toolbar show/hide animation
let toolbarAnimating = false;

function animateToolbar(show) {
  if (toolbarAnimating) return;
  if (show === toolbarVisible) return;
  toolbarAnimating = true;
  toolbarVisible = show;

  const start = show ? TOOLBAR_PEEK : TOOLBAR_HEIGHT;
  const end = show ? TOOLBAR_HEIGHT : TOOLBAR_PEEK;
  const steps = 8;
  let step = 0;

  const interval = setInterval(() => {
    step++;
    const progress = step / steps;
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(start + (end - start) * eased);

    // Resize toolbar area by updating pane positions
    const bounds = mainWindow.getBounds();
    const contentHeight = bounds.height - current;
    const count = visiblePanes.length;
    if (count === 0) return;
    const totalGaps = (count - 1) * PANE_GAP;
    const paneWidth = Math.floor((bounds.width - totalGaps) / count);

    visiblePanes.forEach((paneIndex, slot) => {
      discordViews[paneIndex].setBounds({
        x: (paneWidth + PANE_GAP) * slot,
        y: current,
        width: paneWidth,
        height: contentHeight
      });
    });

    if (step >= steps) {
      clearInterval(interval);
      toolbarAnimating = false;
    }
  }, 20);
}

// Toggle toolbar visibility (called by keyboard shortcut)
function toggleToolbar() {
  animateToolbar(!toolbarVisible);
  // Notify toolbar renderer of state for visual feedback
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('toolbar-visibility-changed', !toolbarVisible);
  }
}

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

    // Loading progress bar CSS
    const progressBarCSS = `
      #dm-loading-bar {
        position: fixed; top: 0; left: 0; height: 2px; z-index: 99999;
        background: #5865f2;
        width: 0%;
        transition: width 400ms ease;
        pointer-events: none;
      }
      #dm-loading-bar.done { width: 100%; opacity: 0; transition: width 200ms ease, opacity 300ms ease 200ms; }
    `;

    // Pane status tracking
    view.webContents.on('did-start-loading', () => {
      sendPaneStatus(i, 'loading');
      replaceViewCSS(i, 'progress', progressBarCSS).then(() => {
        view.webContents.executeJavaScript(`
          if (!document.getElementById('dm-loading-bar')) {
            const bar = document.createElement('div');
            bar.id = 'dm-loading-bar';
            document.body.prepend(bar);
          }
          const bar = document.getElementById('dm-loading-bar');
          bar.classList.remove('done');
          bar.style.width = '70%';
        `).catch(() => {});
      });
    });

    view.webContents.on('did-finish-load', () => {
      sendPaneStatus(i, 'loaded');
      view.webContents.executeJavaScript(`
        const bar = document.getElementById('dm-loading-bar');
        if (bar) { bar.style.width = '100%'; bar.classList.add('done'); }
      `).catch(() => {});
    });

    view.webContents.on('did-fail-load', () => {
      sendPaneStatus(i, 'error');
    });

    view.webContents.on('render-process-gone', (event, details) => {
      sendPaneStatus(i, 'error');
      console.log(`Pane ${i + 1} crashed: ${details.reason}. Reloading in 2s...`);
      setTimeout(() => {
        view.webContents.loadURL('https://discord.com/app');
      }, 2000);
    });

    // Active pane highlight (only across visible panes)
    view.webContents.on('focus', () => {
      visiblePanes.forEach(idx => {
        const borderCSS = idx === i
          ? 'html { border-top: 2px solid #5865f2 !important; }'
          : 'html { border-top: 2px solid transparent !important; }';
        replaceViewCSS(idx, 'focus', borderCSS);
      });
    });

    // Notification badge: parse Discord title for unread count
    view.webContents.on('page-title-updated', (event, title) => {
      updateBadgeCount();
    });

    // Load Discord
    view.webContents.loadURL('https://discord.com/app');

    discordViews.push(view);
  }
  console.log('Created 3 persistent Discord views');
}

// Update which views are visible based on pane indices array
function updateVisibleViews(panes) {
  // Remove all views from window first
  discordViews.forEach(view => {
    mainWindow.removeBrowserView(view);
  });

  // Add only the requested views
  panes.forEach(i => {
    mainWindow.addBrowserView(discordViews[i]);
  });

  visiblePanes = panes;
  console.log(`Displaying panes: ${panes.map(i => i + 1).join(', ')}`);
}

function createWindow() {
  // Create the main window
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 1000,
    minWidth: 800,
    minHeight: 400,
    backgroundColor: '#000000',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 16 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load toolbar HTML
  mainWindow.loadFile('toolbar.html');

  // Create all 3 Discord views once (they persist for the lifetime of the app)
  createAllDiscordViews();

  // Show the default panes (all 3)
  updateVisibleViews(visiblePanes);

  // Initial layout
  updatePanes();

  // Update pane sizes when window is resized
  mainWindow.on('resize', updatePanes);

  // Register keyboard shortcut to toggle sidebars (Cmd+B on Mac, Ctrl+B on others)
  globalShortcut.register('CommandOrControl+B', () => {
    toggleSidebars();
  });

  // Keyboard shortcut to toggle toolbar (Cmd+T on Mac, Ctrl+T on others)
  globalShortcut.register('CommandOrControl+T', () => {
    toggleToolbar();
  });

  // Keyboard shortcuts to focus specific panes (Cmd+1/2/3)
  for (let i = 0; i < 3; i++) {
    globalShortcut.register(`CommandOrControl+${i + 1}`, () => {
      if (discordViews[i] && visiblePanes.includes(i)) {
        discordViews[i].webContents.focus();
      }
    });
  }

  // Open DevTools for debugging (optional - remove if not needed)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  // IPC handler for visible panes changes
  ipcMain.on('visible-panes-changed', (event, panes) => {
    console.log(`Visible panes changed to: ${panes.map(i => i + 1).join(', ')}`);
    updateVisibleViews(panes);
    updatePanes();
  });

  // IPC handler for toolbar hover (show toolbar when mouse enters the toolbar zone)
  ipcMain.on('toolbar-hover', (event, hovering) => {
    if (hovering && !toolbarVisible) animateToolbar(true);
    if (!hovering && toolbarVisible) animateToolbar(false);
  });

  // IPC handler for reloading individual panes
  ipcMain.on('reload-pane', (event, paneIndex) => {
    if (discordViews[paneIndex]) {
      discordViews[paneIndex].webContents.loadURL('https://discord.com/app');
      console.log(`Reloading pane ${paneIndex + 1}`);
    }
  });

  // IPC handler for saving/loading pane labels
  const labelsPath = path.join(app.getPath('userData'), 'pane-labels.json');

  ipcMain.on('save-pane-label', (event, { pane, label }) => {
    let labels = {};
    try { labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8')); } catch (e) {}
    labels[pane] = label;
    fs.writeFileSync(labelsPath, JSON.stringify(labels));
  });

  ipcMain.on('get-pane-labels', (event) => {
    let labels = {};
    try { labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8')); } catch (e) {}
    event.reply('pane-labels', labels);
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
