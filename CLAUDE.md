# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Discord Monitor is an Electron application that displays 1-3 side-by-side Discord web app instances. Users can select the number of instances via a persistent toolbar. Each pane uses a separate session partition allowing users to monitor different Discord accounts or channels simultaneously.

## Commands

### Development
```bash
# Install dependencies
npm install

# Start the application
npm start
```

## Architecture

### Main Application Structure
The application consists of:
- Main process file (`main.js`) that creates an Electron window with a toolbar and dynamic BrowserViews
- Toolbar UI (`toolbar.html`) that displays the instance count selector
- Toolbar renderer (`toolbar-renderer.js`) that handles IPC communication

### Instance Count Selection
- Toolbar UI at top of window (50px height) with dropdown selector
- Users can choose 1, 2, or 3 Discord instances
- Selection does NOT persist - always defaults to 3 on startup
- Dropdown sends IPC message to main process via `instance-count-changed` event (main.js:176)
- Main process rebuilds BrowserViews array dynamically

### Dynamic BrowserView Management
- BrowserViews stored in `discordViews[]` array (not fixed variables)
- `createDiscordViews(count)` function (main.js:105) destroys old views and creates new ones
- Each view maintains separate session partition (persist:discord1/2/3)
- Layout recalculated based on active instance count
- `instanceCount` variable tracks current number of active instances

### Session Management
- Each BrowserView uses a separate persistent session partition (`persist:discord1`, `persist:discord2`, `persist:discord3`)
- These partitions ensure isolated cookies, local storage, and session data
- Sessions persist across application restarts
- Sessions also persist when changing instance count (as long as the partition name remains the same)

### Layout System
- Main window divided into equal vertical panes (1, 2, or 3 depending on selection)
- Pane widths are calculated dynamically: `Math.floor(contentWidth / instanceCount)` (main.js:80)
- Account for toolbar height: `TOOLBAR_HEIGHT = 50` (main.js:8)
- The `updatePanes()` function (main.js:76) recalculates BrowserView bounds on window resize and instance count changes
- Each BrowserView is positioned with `setBounds({ x, y, width, height })`
- Y-coordinate offset by `TOOLBAR_HEIGHT` to position below toolbar

### Toolbar UI
- HTML file (`toolbar.html`) loaded in main window's webContents
- Dark theme matching Discord aesthetic (#202225 background)
- Dropdown selector with options: 1, 2, 3 instances
- Keyboard hint text displays shortcut information
- Uses `-webkit-app-region: drag` for window dragging
- Dropdown area uses `-webkit-app-region: no-drag` to allow interaction

### IPC Communication
- Toolbar uses `ipcRenderer.send()` to send instance count changes (toolbar-renderer.js)
- Main process listens via `ipcMain.on('instance-count-changed')` (main.js:176)
- Main window webPreferences set to `nodeIntegration: true` and `contextIsolation: false` for toolbar IPC
- BrowserViews maintain security with `nodeIntegration: false` and `contextIsolation: true`

### Discord Web App Integration
- Each pane loads `https://discord.com/app` directly (no scraping)
- User agent is set to mimic Chrome browser to avoid detection issues (main.js:124)
- BrowserViews use `nodeIntegration: false` and `contextIsolation: true` for security

### Sidebar Toggle Feature
- Global keyboard shortcut: Cmd+B (Mac) / Ctrl+B (Windows/Linux)
- Toggling injects custom CSS into all active panes simultaneously using `webContents.insertCSS()`
- `toggleSidebars()` function (main.js:93) loops through `discordViews[]` array
- CSS hides/shows Discord's server list and channel list sidebars
- CSS selectors target Discord's class names and ARIA labels (main.js:11-73)
- The `sidebarsHidden` state tracks whether sidebars are currently hidden

### Key Implementation Details
- BrowserViews are children of the main BrowserWindow, not separate windows
- Views are dynamically added/removed from window via `mainWindow.addBrowserView()` and `mainWindow.removeBrowserView()`
- Old views are destroyed when changing instance count via `view.webContents.destroy()`
- Global shortcuts are registered in `app.whenReady()` and unregistered in `app.on('will-quit')`
- On macOS, the app stays running when windows are closed (standard macOS behavior)

## File Structure

- `main.js` - Main Electron process with BrowserView management
- `toolbar.html` - Toolbar UI with instance selector
- `toolbar-renderer.js` - IPC communication for toolbar
- `package.json` - Project configuration and dependencies
- `README.md` - User documentation
- `CLAUDE.md` - Developer/AI assistant documentation

## Notes

- If Discord updates its class naming scheme, the CSS selectors in main.js:11-73 may need updating
- DevTools can be enabled for the main window by uncommenting main.js:169
- The toolbar height is defined as a constant (50px) which can be adjusted if needed
- Instance count selection does not persist by design - always starts with 3 instances
