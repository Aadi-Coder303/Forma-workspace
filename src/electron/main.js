const { app, BrowserWindow, ipcMain, dialog, protocol, net, Menu, shell } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs/promises');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');

let mainWindow;

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true } }
]);

const DB_FILE = path.join(app.getPath('userData'), 'projects.json');

async function getDb() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    let db = JSON.parse(data);

    if (!db.templates || !db.projects || (db.projects.length > 0 && !db.projects[0].phases) || !db.invoices || !db.activityLog) {
      db = { baseDirectory: db.baseDirectory || '', projects: db.projects || [], notes: db.notes || [], team: db.team || [], clients: db.clients || [], templates: db.templates || [], invoices: db.invoices || [], activityLog: db.activityLog || [], todayFocus: db.todayFocus || '' };
      await saveDb(db);
    }
    return db;
  } catch (error) {
    const defaultData = { baseDirectory: '', projects: [], notes: [], team: [], clients: [], templates: [], invoices: [], activityLog: [], todayFocus: '' };
    await saveDb(defaultData);
    return defaultData;
  }
}

async function saveDb(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function logActivity(db, action, details = '') {
  if (!db.activityLog) db.activityLog = [];
  db.activityLog.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    details
  });
  // Keep last 100 activities
  if (db.activityLog.length > 100) {
    db.activityLog = db.activityLog.slice(0, 100);
  }
}

function createWindow() {
  const isDev = !app.isPackaged && !process.env.TEST_PACKAGED;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  if (process.env.TEST_PACKAGED) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message} (${sourceId}:${line})`);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL('app://-/');
  }
}

app.whenReady().then(() => {
  const appRoot = app.getAppPath();
  const outDir = path.join(appRoot, 'out');
  console.log('[MAIN] appRoot:', appRoot, 'outDir:', outDir);

  protocol.handle('app', (request) => {
    let urlPath = request.url.slice('app://-'.length);
    if (!urlPath || urlPath === '/') urlPath = '/index.html';
    
    // Extract query string
    const queryIndex = urlPath.indexOf('?');
    const queryString = queryIndex !== -1 ? urlPath.substring(queryIndex) : '';
    urlPath = urlPath.split('?')[0];
    
    // Decode URI component (e.g. %20 -> space)
    urlPath = decodeURIComponent(urlPath);
    
    // Next.js App Router RSC payload workaround:
    // If the request has ?_rsc=... or HTTP Headers include RSC: 1, Next.js might be requesting RSC payload.
    // However, on static export, Next.js usually requests .txt files. Let's just log it.
    console.log(`[PROTOCOL] Request: ${request.url} | method: ${request.method} | path: ${urlPath}`);
    
    let filePath = path.join(outDir, urlPath);
    
    // Use synchronous fs to avoid ASAR bugs with fs/promises
    const fsSync = require('fs');
    try {
      if (fsSync.existsSync(filePath)) {
        const stat = fsSync.statSync(filePath);
        if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
      } else {
        if (!path.extname(filePath)) filePath += '.html';
      }
    } catch (e) {
      // Fallback
      if (!path.extname(filePath)) filePath += '.html';
    }
    
    try {
      const data = fsSync.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.ico': 'image/x-icon',
        '.txt': 'text/x-component',
        '.map': 'application/json',
      };
      return new Response(data, { headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' } });
    } catch (e) {
      console.error('[PROTOCOL ERROR] Failed to load:', filePath, e.message);
      return new Response('Not Found: ' + filePath, { status: 404 });
    }
  });

  const isMac = process.platform === 'darwin';
  const sendAction = (action) => {
    if (mainWindow) mainWindow.webContents.send('menu:action', action);
  };

  const menuTemplate = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: 'About Forma Workspace' },
        { label: 'Check for Updates', click: () => sendAction('show-updates') },
        { type: 'separator' },
        { label: 'Preferences', accelerator: 'CmdOrCtrl+,', click: () => sendAction('preferences') },
        { type: 'separator' },
        { role: 'hide', label: 'Hide Forma Workspace' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Forma Workspace' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => sendAction('new-project') },
        { label: 'Import Existing Project', accelerator: 'CmdOrCtrl+Shift+N', click: () => sendAction('import-project') },
        { type: 'separator' },
        { label: 'Export Project Data', accelerator: 'CmdOrCtrl+E', click: () => sendAction('export-project') },
        { type: 'separator' },
        { role: 'close', label: 'Close Window' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => sendAction('find') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendAction('toggle-sidebar') },
        { label: 'Collapse Sidebar to Icons', accelerator: 'CmdOrCtrl+Shift+[', click: () => sendAction('collapse-sidebar') },
        { type: 'separator' },
        { label: 'Light Mode / Dark Mode', accelerator: 'CmdOrCtrl+Shift+L', click: () => sendAction('toggle-theme') },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Projects', accelerator: 'CmdOrCtrl+1', click: () => sendAction('nav-projects') },
        { label: 'Clients', accelerator: 'CmdOrCtrl+2', click: () => sendAction('nav-clients') },
        { label: 'Team', accelerator: 'CmdOrCtrl+3', click: () => sendAction('nav-team') },
        { label: 'Notes', accelerator: 'CmdOrCtrl+4', click: () => sendAction('nav-notes') },
        { label: 'Today', accelerator: 'CmdOrCtrl+5', click: () => sendAction('nav-today') },
        { type: 'separator' },
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+K', click: () => sendAction('command-palette') },
        { label: 'Back', accelerator: 'CmdOrCtrl+[', click: () => sendAction('nav-back') },
        { label: 'Forward', accelerator: 'CmdOrCtrl+]', click: () => sendAction('nav-forward') }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'front', label: 'Bring All to Front' },
        { type: 'separator' },
        { role: 'window' }
      ]
    },
    {
      role: 'help',
      submenu: [
        { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: () => sendAction('keyboard-shortcuts') },
        { label: 'Getting Started Guide', click: () => sendAction('getting-started') },
        { type: 'separator' },
        { label: 'Send Feedback', click: () => shell.openExternal('mailto:hello@formadigital.in?subject=Forma%20Workspace%20Feedback') },
        { label: 'Report a Bug', click: () => shell.openExternal('mailto:hello@formadigital.in?subject=Forma%20Workspace%20Bug%20Report') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  createWindow();
  
  // -- AUTO UPDATER CONFIG --
  autoUpdater.autoDownload = false; // Check auto, install manually
  
  autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('updater:checking-for-update');
  });

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater:update-available', info);
  });
  
  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater:update-not-available', info);
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) mainWindow.webContents.send('updater:download-progress', progressObj);
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater:update-downloaded', info);
  });
  
  autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('updater:error', err.message);
  });

  // Silent check on boot
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 5000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC: Auto Updater
ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates());
ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate());
ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall());
ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('get-db', async () => await getDb());

  ipcMain.handle('set-base-directory', async (_, directory) => {
    const db = await getDb();
    db.baseDirectory = directory;
    await saveDb(db);
    return db;
  });

  // Folder pickers
  ipcMain.handle('pick-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('import-project', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    
    const folderPath = result.filePaths[0];
    const name = path.basename(folderPath);
    const db = await getDb();
    
    const newProject = {
      id: crypto.randomUUID(),
      name,
      folderPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      phases: []
    };
    
    db.projects.push(newProject);
    logActivity(db, 'Imported project folder', folderPath);
    await saveDb(db);
    return newProject.id;
  });

  ipcMain.handle('sync-local-directory', async () => {
    const db = await getDb();
    if (!db.baseDirectory) return 0;
    
    try {
      const items = await fs.readdir(db.baseDirectory, { withFileTypes: true });
      let addedCount = 0;
      
      for (const item of items) {
        if (item.isDirectory()) {
          const folderPath = path.join(db.baseDirectory, item.name);
          const exists = db.projects.some(p => p.folderPath === folderPath);
          
          if (!exists) {
            const newProject = {
              id: crypto.randomUUID(),
              name: item.name,
              folderPath,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              status: 'active',
              phases: []
            };
            db.projects.push(newProject);
            addedCount++;
          }
        }
      }
      
      if (addedCount > 0) {
        logActivity(db, 'Synced local directory', `Imported ${addedCount} missing folders`);
        await saveDb(db);
      }
      
      return addedCount;
    } catch (e) {
      console.error("Failed to sync local directory", e);
      return 0;
    }
  });

  // Projects
  ipcMain.handle('create-project', async (_, projectData) => {
    const db = await getDb();
    if (!db.baseDirectory) throw new Error("Base directory is not set.");
    if (!projectData.name.trim()) throw new Error("Project name is required");

    const folderName = projectData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const folderPath = path.join(db.baseDirectory, folderName);

    try {
      await fs.mkdir(db.baseDirectory, { recursive: true });
      await fs.mkdir(folderPath, { recursive: true });
      await fs.mkdir(path.join(folderPath, 'Design'), { recursive: true });
      await fs.mkdir(path.join(folderPath, 'Code'), { recursive: true });
      await fs.mkdir(path.join(folderPath, 'Assets'), { recursive: true });
      await fs.mkdir(path.join(folderPath, 'Invoices'), { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create local folders: ${error.message}`);
    }

    const newProject = {
      id: crypto.randomUUID(),
      name: projectData.name,
      clientId: projectData.clientId || null,
      deadline: projectData.deadline || null,
      budget: projectData.budget || null,
      status: projectData.status || 'backlog',
      priority: projectData.priority || 'normal',
      folderPath,
      createdAt: new Date().toISOString(),
      phases: projectData.phases || []
    };

    db.projects.push(newProject);
    logActivity(db, 'Created project', newProject.name);
    await saveDb(db);
    return newProject.id;
  });

  ipcMain.handle('update-project', async (_, projectId, fields) => {
    const db = await getDb();
    const p = db.projects.find(p => p.id === projectId);
    if (!p) throw new Error('Project not found');
    Object.assign(p, fields);
    await saveDb(db);
    return p;
  });

  ipcMain.handle('delete-project', async (_, projectId) => {
    const db = await getDb();
    db.projects = db.projects.filter(p => p.id !== projectId);
    logActivity(db, 'Deleted project', projectId);
    await saveDb(db);
    return true;
  });

  ipcMain.handle('reorder-phases', async (_, projectId, newPhasesOrder) => {
    const db = await getDb();
    const p = db.projects.find(x => x.id === projectId);
    if (!p) return false;
    
    // newPhasesOrder should be an array of phase IDs in the new order
    const phasesMap = new Map(p.phases.map(ph => [ph.id, ph]));
    const reorderedPhases = newPhasesOrder.map(id => phasesMap.get(id)).filter(Boolean);
    
    if (reorderedPhases.length === p.phases.length) {
      p.phases = reorderedPhases;
      await saveDb(db);
      return true;
    }
    return false;
  });

  ipcMain.handle('reorder-checklist-items', async (_, projectId, sourcePhaseId, targetPhaseId, itemId, newIndex) => {
    const db = await getDb();
    const p = db.projects.find(x => x.id === projectId);
    if (!p) return false;
    
    const sourcePhase = p.phases.find(x => x.id === sourcePhaseId);
    const targetPhase = p.phases.find(x => x.id === targetPhaseId);
    if (!sourcePhase || !targetPhase) return false;

    const itemIndex = sourcePhase.checklist.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return false;

    const [item] = sourcePhase.checklist.splice(itemIndex, 1);
    
    // Insert into target phase at newIndex
    targetPhase.checklist.splice(newIndex, 0, item);
    
    logActivity(db, 'Reordered task', `"${item.title}" in project "${p.name}"`);
    await saveDb(db);
    return true;
  });

  // Checklists
  ipcMain.handle('update-checklist-item', async (_, projectId, phaseId, itemId, fields) => {
    const db = await getDb();
    const p = db.projects.find(p => p.id === projectId);
    if (!p) return false;
    const phase = p.phases.find(ph => ph.id === phaseId);
    if (!phase) return false;
    const item = phase.checklist.find(i => i.id === itemId);
    if (item) {
      const wasCompleted = item.isCompleted;
      Object.assign(item, fields);
      if (fields.isCompleted && !wasCompleted) {
        if (item.timeIsRunning) {
          // Auto-stop timer on completion
          const start = new Date(item.timeStartedAt).getTime();
          const now = new Date().getTime();
          const elapsedMins = Math.round((now - start) / 60000);
          item.timeLogged = (item.timeLogged || 0) + elapsedMins;
          item.timeIsRunning = false;
          item.timeStartedAt = undefined;
        }
        logActivity(db, 'Completed task', `"${item.title}" in project "${p.name}"`);
      }
      await saveDb(db);
      return true;
    }
    return false;
  });

  ipcMain.handle('toggle-task-timer', async (_, projectId, phaseId, itemId) => {
    const db = await getDb();
    const p = db.projects.find(x => x.id === projectId);
    if (!p) return false;
    const phase = p.phases.find(x => x.id === phaseId);
    if (!phase) return false;
    const item = phase.checklist.find(i => i.id === itemId);
    if (!item) return false;

    if (item.timeIsRunning) {
      // Stop timer
      const start = new Date(item.timeStartedAt).getTime();
      const now = new Date().getTime();
      const elapsedMins = Math.round((now - start) / 60000);
      item.timeLogged = (item.timeLogged || 0) + elapsedMins;
      item.timeIsRunning = false;
      item.timeStartedAt = undefined;
      logActivity(db, 'Stopped timer', `Logged ${elapsedMins}m on "${item.title}"`);
    } else {
      // Start timer
      item.timeIsRunning = true;
      item.timeStartedAt = new Date().toISOString();
    }
    await saveDb(db);
    return item;
  });

  ipcMain.handle('add-manual-time', async (_, projectId, phaseId, itemId, minutes) => {
    const db = await getDb();
    const p = db.projects.find(x => x.id === projectId);
    if (!p) return false;
    const phase = p.phases.find(x => x.id === phaseId);
    if (!phase) return false;
    const item = phase.checklist.find(i => i.id === itemId);
    if (!item) return false;

    item.timeLogged = (item.timeLogged || 0) + parseInt(minutes, 10);
    logActivity(db, 'Added manual time', `Added ${minutes}m to "${item.title}"`);
    await saveDb(db);
    return item;
  });

  // Templates
  ipcMain.handle('create-template', async (_, templateData) => {
    const db = await getDb();
    const tmpl = {
      id: crypto.randomUUID(),
      name: templateData.name,
      phases: templateData.phases || []
    };
    db.templates.push(tmpl);
    await saveDb(db);
    return tmpl;
  });

  ipcMain.handle('delete-template', async (_, templateId) => {
    const db = await getDb();
    db.templates = db.templates.filter(t => t.id !== templateId);
    await saveDb(db);
    return true;
  });

  // Notes
  ipcMain.handle('create-note', async (_, title, content, projectId) => {
    const db = await getDb();
    const note = {
      id: crypto.randomUUID(),
      title: title || 'Untitled',
      content: content || '',
      projectId: projectId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.notes.push(note);
    await saveDb(db);
    return note;
  });

  ipcMain.handle('update-note', async (_, noteId, title, content) => {
    const db = await getDb();
    const note = db.notes.find(n => n.id === noteId);
    if (!note) throw new Error('Note not found');
    note.title = title;
    note.content = content;
    note.updatedAt = new Date().toISOString();
    await saveDb(db);
    return note;
  });

  ipcMain.handle('delete-note', async (_, noteId) => {
    const db = await getDb();
    db.notes = db.notes.filter(n => n.id !== noteId);
    await saveDb(db);
    return true;
  });

  // Team
  ipcMain.handle('create-team-member', async (_, name, role, email, color) => {
    const db = await getDb();
    const member = { id: crypto.randomUUID(), name, role, email, color };
    db.team.push(member);
    await saveDb(db);
    return member;
  });

  ipcMain.handle('delete-team-member', async (_, memberId) => {
    const db = await getDb();
    db.team = db.team.filter(m => m.id !== memberId);
    await saveDb(db);
    return true;
  });

  // Clients
  ipcMain.handle('create-client', async (_, fields) => {
    const db = await getDb();
    const client = {
      id: crypto.randomUUID(),
      name: fields.name || '',
      company: fields.company || '',
      email: fields.email || '',
      phone: fields.phone || '',
      website: fields.website || '',
      country: fields.country || '',
      currency: fields.currency || 'USD',
      status: fields.status || 'lead',
      invoiceStatus: fields.invoiceStatus || 'none',
      deliverables: fields.deliverables || '',
      notes: fields.notes || '',
      logs: [],
      createdAt: new Date().toISOString(),
    };
    db.clients.push(client);
    logActivity(db, 'Added new client', client.name);
    await saveDb(db);
    return client;
  });

  ipcMain.handle('update-client', async (_, clientId, fields) => {
    const db = await getDb();
    const client = db.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Client not found');
    Object.assign(client, fields);
    await saveDb(db);
    return client;
  });

  ipcMain.handle('delete-client', async (_, clientId) => {
    const db = await getDb();
    db.clients = db.clients.filter(c => c.id !== clientId);
    await saveDb(db);
    return true;
  });

  ipcMain.handle('add-client-log', async (_, clientId, log) => {
    const db = await getDb();
    const client = db.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Client not found');
    client.logs.push({
      id: crypto.randomUUID(),
      ...log
    });
    await saveDb(db);
    return true;
  });

  // Today Focus
  ipcMain.handle('set-today-focus', async (_, text) => {
    const db = await getDb();
    db.todayFocus = text;
    await saveDb(db);
    return true;
  });

  // Invoices
  ipcMain.handle('create-invoice', async (_, fields) => {
    const db = await getDb();
    const newInvoice = {
      id: crypto.randomUUID(),
      ...fields
    };
    db.invoices.push(newInvoice);
    logActivity(db, 'Created invoice', `${newInvoice.invoiceNumber} for $${newInvoice.amount}`);
    await saveDb(db);
    return true;
  });

  ipcMain.handle('update-invoice', async (_, invoiceId, fields) => {
    const db = await getDb();
    const idx = db.invoices.findIndex(i => i.id === invoiceId);
    if (idx !== -1) {
      db.invoices[idx] = { ...db.invoices[idx], ...fields };
      await saveDb(db);
    }
    return true;
  });

  ipcMain.handle('delete-invoice', async (_, invoiceId) => {
    const db = await getDb();
    db.invoices = db.invoices.filter(i => i.id !== invoiceId);
    await saveDb(db);
    return true;
  });


app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
