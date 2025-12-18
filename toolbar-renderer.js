// Toolbar renderer process script
const { ipcRenderer } = require('electron');

const selector = document.getElementById('instance-count');

// Send instance count change to main process
selector.addEventListener('change', (event) => {
  const count = parseInt(event.target.value, 10);
  ipcRenderer.send('instance-count-changed', count);
});
