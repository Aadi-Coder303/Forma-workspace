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

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-web-design',
    name: 'Web Design Project',
    phases: [
      { name: 'Discovery', items: [
        { title: 'Kickoff call with client', subtasks: [] },
        { title: 'Define project scope & goals', subtasks: [] },
        { title: 'Gather brand assets & references', subtasks: [] },
        { title: 'Competitor analysis', subtasks: [] }
      ]},
      { name: 'Design', items: [
        { title: 'Wireframes (low-fidelity)', subtasks: [] },
        { title: 'Mood board / style direction', subtasks: [] },
        { title: 'Hi-fi mockups (desktop)', subtasks: [] },
        { title: 'Hi-fi mockups (mobile)', subtasks: [] },
        { title: 'Client design approval', subtasks: [] }
      ]},
      { name: 'Development', items: [
        { title: 'Set up repo & environment', subtasks: [] },
        { title: 'Build core page templates', subtasks: [] },
        { title: 'Responsive implementation', subtasks: [] },
        { title: 'CMS / content integration', subtasks: [] },
        { title: 'Cross-browser QA', subtasks: [] }
      ]},
      { name: 'Launch', items: [
        { title: 'Staging review with client', subtasks: [] },
        { title: 'SEO meta & sitemap setup', subtasks: [] },
        { title: 'Go-live deployment', subtasks: [] },
        { title: 'Post-launch check & handoff docs', subtasks: [] }
      ]}
    ]
  },
  {
    id: 'tpl-mobile-app',
    name: 'Mobile App Development',
    phases: [
      { name: 'Discovery & Planning', items: [
        { title: 'Define app concept & user personas', subtasks: [] },
        { title: 'Feature list & MVP scope', subtasks: [] },
        { title: 'Tech stack decision', subtasks: [] }
      ]},
      { name: 'Design', items: [
        { title: 'User flow diagrams', subtasks: [] },
        { title: 'Wireframes (all screens)', subtasks: [] },
        { title: 'Hi-fi UI kit', subtasks: [] },
        { title: 'Prototype & user testing', subtasks: [] }
      ]},
      { name: 'Development', items: [
        { title: 'Project scaffolding & CI setup', subtasks: [] },
        { title: 'Authentication flow', subtasks: [] },
        { title: 'Core feature development', subtasks: [] },
        { title: 'API integrations', subtasks: [] },
        { title: 'Push notifications', subtasks: [] }
      ]},
      { name: 'QA & Release', items: [
        { title: 'Internal testing (iOS + Android)', subtasks: [] },
        { title: 'Beta testing (TestFlight / Play Console)', subtasks: [] },
        { title: 'App Store submission', subtasks: [] },
        { title: 'Play Store submission', subtasks: [] }
      ]}
    ]
  },
  {
    id: 'tpl-brand-identity',
    name: 'Brand Identity Design',
    phases: [
      { name: 'Discovery', items: [
        { title: 'Brand questionnaire', subtasks: [] },
        { title: 'Competitor brand audit', subtasks: [] },
        { title: 'Moodboard creation', subtasks: [] }
      ]},
      { name: 'Concept', items: [
        { title: 'Logo concepts (3 directions)', subtasks: [] },
        { title: 'Colour palette selection', subtasks: [] },
        { title: 'Typography pairing', subtasks: [] },
        { title: 'Client concept presentation', subtasks: [] }
      ]},
      { name: 'Refinement', items: [
        { title: 'Logo revisions (Round 1)', subtasks: [] },
        { title: 'Logo revisions (Round 2)', subtasks: [] },
        { title: 'Final logo approval', subtasks: [] }
      ]},
      { name: 'Deliverables', items: [
        { title: 'Brand guidelines document', subtasks: [] },
        { title: 'Export logo in all formats', subtasks: [] },
        { title: 'Business card & stationery design', subtasks: [] },
        { title: 'Social media kit', subtasks: [] }
      ]}
    ]
  },
  {
    id: 'tpl-seo-campaign',
    name: 'SEO & Content Campaign',
    phases: [
      { name: 'Audit', items: [
        { title: 'Technical SEO audit', subtasks: [] },
        { title: 'Keyword research & gap analysis', subtasks: [] },
        { title: 'Backlink profile review', subtasks: [] }
      ]},
      { name: 'Strategy', items: [
        { title: 'Content calendar (3 months)', subtasks: [] },
        { title: 'On-page optimisation plan', subtasks: [] },
        { title: 'Link-building outreach list', subtasks: [] }
      ]},
      { name: 'Execution', items: [
        { title: 'Optimise existing pages', subtasks: [] },
        { title: 'Publish month-1 content', subtasks: [] },
        { title: 'Outreach & guest posts', subtasks: [] }
      ]},
      { name: 'Reporting', items: [
        { title: 'Monthly ranking report', subtasks: [] },
        { title: 'Traffic & conversion analysis', subtasks: [] },
        { title: 'Strategy review & next steps', subtasks: [] }
      ]}
    ]
  },
  {
    id: 'tpl-freelance-design',
    name: 'Freelance Design Workflow',
    phases: [
      { name: '1 · Onboarding Document', items: [
        { title: 'Collect brand information', subtasks: [] },
        { title: 'Define target audience', subtasks: [] },
        { title: 'Research competitors', subtasks: [] },
        { title: 'Gather reference / inspiration links', subtasks: [] },
        { title: 'Note colour preferences', subtasks: [] }
      ]},
      { name: '2 · Scope of Work', items: [
        { title: 'Write exact deliverables list before starting', subtasks: [] },
        { title: 'Confirm: Logo', subtasks: [] },
        { title: 'Confirm: Colour palette', subtasks: [] },
        { title: 'Confirm: Typography system', subtasks: [] },
        { title: 'Confirm: Brand guidelines', subtasks: [] },
        { title: 'Confirm: Social media templates', subtasks: [] },
        { title: 'Note: anything outside scope = extra service', subtasks: [] }
      ]},
      { name: '3 · Freelance Agreement', items: [
        { title: 'Scope of work documented', subtasks: [] },
        { title: 'Timeline & milestones agreed', subtasks: [] },
        { title: 'Number of revisions included', subtasks: [] },
        { title: 'Payment structure signed off', subtasks: [] },
        { title: 'File ownership clause included', subtasks: [] },
        { title: 'Cancellation terms included', subtasks: [] }
      ]},
      { name: '4 · Advance Payment', items: [
        { title: 'Advance payment received before starting work', subtasks: [] },
        { title: 'Payment structure confirmed (50/50 or 30/40/30)', subtasks: [] }
      ]},
      { name: '5 · File Delivery', items: [
        { title: 'Export final PNG', subtasks: [] },
        { title: 'Export final JPG', subtasks: [] },
        { title: 'Export final PDF', subtasks: [] },
        { title: 'Clarify editable files policy (AI / PSD / Figma)', subtasks: [] }
      ]},
      { name: '6 · Invoice', items: [
        { title: 'Your name / brand + GST + bank details on invoice', subtasks: [] },
        { title: 'Client name + GST & address on invoice', subtasks: [] },
        { title: 'Project description added', subtasks: [] },
        { title: 'Payment amount & date filled in', subtasks: [] },
        { title: 'Invoice number assigned', subtasks: [] }
      ]},
      { name: '7 · Kill Fee (Cancellation)', items: [
        { title: 'Kill fee clause added to agreement', subtasks: [] },
        { title: 'Rule: concept stage cancelled → 30% retained', subtasks: [] },
        { title: 'Rule: mid-project cancelled → 50% retained', subtasks: [] }
      ]}
    ]
  },
  {
    id: 'tpl-pre-launch',
    name: '🚀 Pre-Launch Checklist',
    phases: [
      { name: '⚖️ Legal', items: [
        { title: 'Privacy Policy published', subtasks: [] },
        { title: 'Terms & Conditions published', subtasks: [] },
        { title: 'Cookie consent banner live', subtasks: [] }
      ]},
      { name: '🔐 Auth & Security', items: [
        { title: 'Signup / login tested', subtasks: [] },
        { title: 'Email verification working', subtasks: [] },
        { title: 'Password reset working', subtasks: [] },
        { title: 'OAuth working (if added)', subtasks: [] },
        { title: 'Rate limiting on auth routes', subtasks: [] },
        { title: 'No API keys in frontend code', subtasks: [] },
        { title: 'ENV variables not exposed', subtasks: [] },
        { title: 'HTTPS / SSL active', subtasks: [] },
        { title: 'CORS configured', subtasks: [] }
      ]},
      { name: '💳 Payment', items: [
        { title: 'Success + failure flow tested', subtasks: [] },
        { title: 'Subscription upgrade / downgrade / cancel tested', subtasks: [] }
      ]},
      { name: '📊 Analytics', items: [
        { title: 'Page tracking set up', subtasks: [] },
        { title: 'User event tracking set up', subtasks: [] }
      ]},
      { name: '⚡ Performance', items: [
        { title: 'Lighthouse score checked', subtasks: [] },
        { title: 'Images optimised', subtasks: [] },
        { title: 'No console errors', subtasks: [] }
      ]},
      { name: '📱 UI & Device', items: [
        { title: 'Mobile responsive', subtasks: [] },
        { title: 'Tested on Safari + Chrome', subtasks: [] },
        { title: 'No broken links', subtasks: [] },
        { title: 'No placeholder / Lorem Ipsum text', subtasks: [] },
        { title: 'Custom 404 page', subtasks: [] },
        { title: 'Favicon set', subtasks: [] },
        { title: 'OG tags + social preview image', subtasks: [] }
      ]},
      { name: '📧 Emails', items: [
        { title: 'Transactional emails working', subtasks: [] },
        { title: 'Not landing in spam', subtasks: [] },
        { title: 'Unsubscribe in marketing emails', subtasks: [] }
      ]},
      { name: '📈 Marketing', items: [
        { title: 'Submitted to Google Search Console', subtasks: [] },
        { title: 'SEO basics checked', subtasks: [] }
      ]},
      { name: '🔁 Feedback', items: [
        { title: 'Support / contact email set up', subtasks: [] },
        { title: 'Bug report option added', subtasks: [] }
      ]},
      { name: '🛡️ Monitoring', items: [
        { title: 'Uptime monitoring set up', subtasks: [] },
        { title: 'Error logging (Sentry etc.) configured', subtasks: [] },
        { title: 'DB backups configured', subtasks: [] }
      ]},
      { name: '🌐 Domain & Deploy', items: [
        { title: 'Custom domain connected', subtasks: [] },
        { title: 'www redirect working', subtasks: [] },
        { title: 'CI/CD pipeline tested', subtasks: [] }
      ]}
    ]
  }
];

async function getDb() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    let db = JSON.parse(data);
    let dirty = false;

    if (!db.templates || !db.projects || (db.projects.length > 0 && !db.projects[0].phases) || !db.invoices || !db.activityLog) {
      db = { baseDirectory: db.baseDirectory || '', projects: db.projects || [], notes: db.notes || [], team: db.team || [], teamTasks: db.teamTasks || [], clients: db.clients || [], templates: db.templates || [], invoices: db.invoices || [], activityLog: db.activityLog || [], todayFocus: db.todayFocus || '' };
      dirty = true;
    }

    if (!db.teamTasks) { db.teamTasks = []; dirty = true; }
    if (!db.templates || db.templates.length === 0) {
      db.templates = DEFAULT_TEMPLATES;
      dirty = true;
    }

    if (dirty) await saveDb(db);
    return db;
  } catch (error) {
    const defaultData = { baseDirectory: '', projects: [], notes: [], team: [], teamTasks: [], clients: [], templates: DEFAULT_TEMPLATES, invoices: [], activityLog: [], todayFocus: '' };
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

  // Team Tasks
  ipcMain.handle('create-team-task', async (_, fields) => {
    const db = await getDb();
    if (!db.teamTasks) db.teamTasks = [];
    const task = {
      id: crypto.randomUUID(),
      title: fields.title || 'Untitled Task',
      assigneeId: fields.assigneeId,
      isCompleted: false,
      priority: fields.priority || 'normal',
      dueDate: fields.dueDate || null,
      projectId: fields.projectId || null,
      note: fields.note || '',
      createdAt: new Date().toISOString(),
    };
    db.teamTasks.push(task);
    const member = db.team.find(m => m.id === fields.assigneeId);
    logActivity(db, 'Assigned task', `"${task.title}" → ${member ? member.name : 'Unknown'}`);
    await saveDb(db);
    return task;
  });

  ipcMain.handle('update-team-task', async (_, taskId, fields) => {
    const db = await getDb();
    if (!db.teamTasks) db.teamTasks = [];
    const task = db.teamTasks.find(t => t.id === taskId);
    if (!task) return false;
    const wasCompleted = task.isCompleted;
    Object.assign(task, fields);
    if (fields.isCompleted && !wasCompleted) {
      task.completedAt = new Date().toISOString();
      logActivity(db, 'Completed team task', `"${task.title}"`);
    }
    await saveDb(db);
    return task;
  });

  ipcMain.handle('delete-team-task', async (_, taskId) => {
    const db = await getDb();
    if (!db.teamTasks) db.teamTasks = [];
    db.teamTasks = db.teamTasks.filter(t => t.id !== taskId);
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
