# Discord Monitor

Monitor 1-3 Discord channels simultaneously in separate panes.

## Quick Start

### First Time Setup
```bash
npm install
```

### Launch Application
```bash
npm start
```

Opens Discord Monitor with 3 side-by-side Discord panes. Use the dropdown in the toolbar to switch between 1, 2, or 3 instances.

## Features

- Configurable 1-3 side-by-side panes displaying Discord web app
- Persistent toolbar with instance count selector
- Each pane uses a separate session (multiple accounts supported)
- Keyboard shortcut (Cmd/Ctrl+B) to toggle Discord sidebars
- Persistent sessions - stay logged in between restarts
- No web scraping - authentic Discord web UI

## Usage

1. Run `npm start` to launch the application
2. Use the **Instances** dropdown in the toolbar to select 1, 2, or 3 panes
3. Each pane will load Discord - log into your account(s)
4. Navigate to the channels you want to monitor
5. Press **Cmd+B** (Mac) or **Ctrl+B** (Windows/Linux) to toggle sidebars

### Instance Selection

- Use the dropdown at the top of the window to choose 1, 2, or 3 Discord instances
- Selection does NOT persist - app always starts with 3 instances by default
- Change instance count any time via the toolbar dropdown
- Each instance maintains its own separate Discord session

### Multiple Accounts

Each pane uses a separate persistent session, so you can:
- Use up to 3 different Discord accounts simultaneously
- Or use the same account but view different servers/channels
- Sessions persist across app restarts - no need to log in every time

### Sidebar Toggle

- Press **Cmd+B** (Mac) or **Ctrl+B** (Windows/Linux) to toggle sidebars
- Hide sidebars to maximize chat view for monitoring
- Show sidebars when you need to navigate to different channels
- Toggle applies to all active instances simultaneously

## Notes

- Sessions are persisted, so you won't need to log in every time
- Each pane is completely independent with its own cookies and session data
- Resize the window and the panes will automatically adjust to fit
