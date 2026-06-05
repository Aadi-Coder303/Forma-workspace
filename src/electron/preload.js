const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getDb: () => ipcRenderer.invoke('get-db'),
  setBaseDirectory: (dir) => ipcRenderer.invoke('set-base-directory', dir),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  importProject: () => ipcRenderer.invoke('import-project'),
  syncLocalDirectory: () => ipcRenderer.invoke('sync-local-directory'),
  
  onMenuAction: (callback) => {
    ipcRenderer.on('menu:action', (_event, action) => callback(action));
  },

  // Projects
  createProject: (projectData) => ipcRenderer.invoke('create-project', projectData),
  updateProject: (id, fields) => ipcRenderer.invoke('update-project', id, fields),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
  reorderPhases: (projectId, newPhasesOrder) => ipcRenderer.invoke('reorder-phases', projectId, newPhasesOrder),
  reorderChecklistItems: (projectId, sourcePhaseId, targetPhaseId, itemId, newIndex) => ipcRenderer.invoke('reorder-checklist-items', projectId, sourcePhaseId, targetPhaseId, itemId, newIndex),
  updateChecklistItem: (pId, phId, iId, fields) => ipcRenderer.invoke('update-checklist-item', pId, phId, iId, fields),
  toggleTaskTimer: (pId, phId, iId) => ipcRenderer.invoke('toggle-task-timer', pId, phId, iId),
  addManualTime: (pId, phId, iId, minutes) => ipcRenderer.invoke('add-manual-time', pId, phId, iId, minutes),

  // Templates
  createTemplate: (templateData) => ipcRenderer.invoke('create-template', templateData),
  updateTemplate: (templateId, templateData) => ipcRenderer.invoke('update-template', templateId, templateData),
  deleteTemplate: (templateId) => ipcRenderer.invoke('delete-template', templateId),

  // Notes
  createNote: (title, content, projectId) => ipcRenderer.invoke('create-note', title, content, projectId),
  updateNote: (noteId, title, content) => ipcRenderer.invoke('update-note', noteId, title, content),
  deleteNote: (noteId) => ipcRenderer.invoke('delete-note', noteId),

  // Team
  createTeamMember: (name, role, email, color) => ipcRenderer.invoke('create-team-member', name, role, email, color),
  deleteTeamMember: (memberId) => ipcRenderer.invoke('delete-team-member', memberId),
  createTeamTask: (fields) => ipcRenderer.invoke('create-team-task', fields),
  updateTeamTask: (taskId, fields) => ipcRenderer.invoke('update-team-task', taskId, fields),
  deleteTeamTask: (taskId) => ipcRenderer.invoke('delete-team-task', taskId),

  // Clients
  createClient: (fields) => ipcRenderer.invoke('create-client', fields),
  updateClient: (clientId, fields) => ipcRenderer.invoke('update-client', clientId, fields),
  deleteClient: (clientId) => ipcRenderer.invoke('delete-client', clientId),
  addClientLog: (clientId, log) => ipcRenderer.invoke('add-client-log', clientId, log),

  // Today Focus
  setTodayFocus: (text) => ipcRenderer.invoke('set-today-focus', text), // deprecated
  setTodayFocuses: (focuses) => ipcRenderer.invoke('set-today-focuses', focuses),
  setMainFocus: (id) => ipcRenderer.invoke('set-main-focus', id),

  // Invoices
  createInvoice: (fields) => ipcRenderer.invoke('create-invoice', fields),
  updateInvoice: (invoiceId, fields) => ipcRenderer.invoke('update-invoice', invoiceId, fields),
  deleteInvoice: (id) => ipcRenderer.invoke('delete-invoice', id),

  // Email Integration & Diagnostics
  updateEmailSettings: (apiKey, fromEmail) => ipcRenderer.invoke('update-email-settings', apiKey, fromEmail),
  sendEmail: (to, subject, html) => ipcRenderer.invoke('send-email', to, subject, html),
  getAppDiagnostics: () => ipcRenderer.invoke('get-app-diagnostics'),

  // Auto Updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    onEvent: (channel, callback) => {
      const validChannels = [
        'updater:checking-for-update',
        'updater:update-available',
        'updater:update-not-available',
        'updater:download-progress',
        'updater:update-downloaded',
        'updater:error'
      ];
      if (validChannels.includes(channel)) {
        // Strip out the event object from IPC, return only args
        const newCb = (_, ...args) => callback(...args);
        ipcRenderer.on(channel, newCb);
        return () => ipcRenderer.removeListener(channel, newCb);
      }
    }
  }
});
