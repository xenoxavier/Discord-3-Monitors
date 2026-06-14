const { ipcRenderer } = require('electron');

// Show platform-correct shortcut hints
const isMac = process.platform === 'darwin';
const shortcutKey = document.getElementById('shortcut-key');
if (shortcutKey) {
  shortcutKey.textContent = isMac ? '⌘B' : 'Ctrl+B';
}
const paneShortcut = document.getElementById('pane-shortcut');
if (paneShortcut) {
  paneShortcut.textContent = isMac ? '⌘1-3' : 'Ctrl+1-3';
}

// Auto-hide toolbar: send hover events to main process
document.body.addEventListener('mouseenter', () => {
  ipcRenderer.send('toolbar-hover', true);
});
document.body.addEventListener('mouseleave', () => {
  ipcRenderer.send('toolbar-hover', false);
});

// Sidebar state indicator
const sidebarIndicator = document.getElementById('sidebar-indicator');
ipcRenderer.on('sidebar-state-changed', (event, hidden) => {
  if (sidebarIndicator) {
    sidebarIndicator.classList.toggle('hidden', hidden);
    sidebarIndicator.title = hidden ? 'Sidebars hidden' : 'Sidebars visible';
  }
});

// Per-pane connection status dots
const statusDots = document.querySelectorAll('.pane-status');
ipcRenderer.on('pane-status', (event, { pane, status }) => {
  const dot = statusDots[pane]?.querySelector('.status-dot');
  if (dot) {
    dot.classList.remove('loading', 'loaded', 'error');
    dot.classList.add(status);
  }
});

// Update visible status dots when visible panes change
function updateStatusDotsVisibility(panes) {
  statusDots.forEach((dot, i) => {
    dot.style.display = panes.includes(i) ? 'flex' : 'none';
  });
}

// Right-click on status dot to reload pane
statusDots.forEach((dot, i) => {
  dot.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    ipcRenderer.send('reload-pane', i);
  });
});

function bindPaneLabelEditing(label, paneIndex) {
  label.addEventListener('dblclick', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = label.textContent;
    input.style.cssText = 'width:40px;font-size:9px;font-weight:600;background:#161b27;color:#e2e8f0;border:1px solid #5865f2;border-radius:3px;padding:0 2px;outline:none;';
    label.replaceWith(input);
    input.focus();
    input.select();

    const save = () => {
      const newLabel = input.value.trim() || String(paneIndex + 1);
      const nextLabel = document.createElement('span');
      nextLabel.className = 'pane-status-label';
      nextLabel.textContent = newLabel;
      input.replaceWith(nextLabel);
      bindPaneLabelEditing(nextLabel, paneIndex);
      ipcRenderer.send('save-pane-label', { pane: paneIndex, label: newLabel });
    };

    input.addEventListener('blur', save, { once: true });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') {
        input.value = label.textContent;
        input.blur();
      }
    });
  });
}

// Double-click on pane status label to rename
statusDots.forEach((dot, i) => {
  const label = dot.querySelector('.pane-status-label');
  if (label) bindPaneLabelEditing(label, i);
});

// Load saved pane labels
ipcRenderer.send('get-pane-labels');
ipcRenderer.on('pane-labels', (event, labels) => {
  statusDots.forEach((dot, i) => {
    const label = dot.querySelector('.pane-status-label');
    if (labels[i]) label.textContent = labels[i];
  });
});

// Badge count display
ipcRenderer.on('badge-count', (event, count) => {
  let badge = document.getElementById('badge-count');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'badge-count';
      badge.style.cssText = 'font-size:10px;font-weight:700;color:#5865f2;margin-left:4px;';
      document.querySelector('.logo-text').after(badge);
    }
    badge.textContent = `(${count})`;
  } else if (badge) {
    badge.remove();
  }
});

// Pane toggle buttons (multi-select)
const buttons = document.querySelectorAll('.instance-btn');

function getVisiblePanes() {
  return Array.from(buttons)
    .filter(b => b.classList.contains('active'))
    .map(b => parseInt(b.dataset.pane, 10));
}

function syncVisibility() {
  const panes = getVisiblePanes();
  updateStatusDotsVisibility(panes);
  ipcRenderer.send('visible-panes-changed', panes);
}

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const paneIndex = parseInt(btn.dataset.pane, 10);
    const isActive = btn.classList.contains('active');

    // Prevent deactivating the last visible pane
    if (isActive && getVisiblePanes().length <= 1) return;

    btn.classList.toggle('active');
    btn.setAttribute('aria-pressed', !isActive);
    syncVisibility();
  });
});
