import { DBData, Client, TeamMember, Note, Template, Project, CommunicationLog, Invoice } from "./lib/db";

declare global {
  interface Window {
    electron: {
      getDb: () => Promise<DBData>;
      setBaseDirectory: (dir: string) => Promise<DBData>;
      
      // Folder pickers
      pickFolder: () => Promise<string | null>;
      importProject: () => Promise<string | null>;
      
      // IPC Menu Events
      onMenuAction: (callback: (action: string) => void) => void;

      // Projects
      createProject: (projectData: any) => Promise<string>;
      updateProject: (id: string, fields: Partial<import('./lib/db').Project>) => Promise<boolean>;
      deleteProject: (id: string) => Promise<boolean>;
      reorderPhases: (projectId: string, newPhasesOrder: string[]) => Promise<boolean>;
      reorderChecklistItems: (projectId: string, sourcePhaseId: string, targetPhaseId: string, itemId: string, newIndex: number) => Promise<boolean>;
      
      // Checklists
      updateChecklistItem: (projectId: string, phaseId: string, itemId: string, fields: any) => Promise<boolean>;
      toggleTaskTimer: (projectId: string, phaseId: string, itemId: string) => Promise<any>;
      addManualTime: (projectId: string, phaseId: string, itemId: string, minutes: number) => Promise<any>;

      // Templates
      createTemplate: (templateData: any) => Promise<Template>;
      deleteTemplate: (templateId: string) => Promise<boolean>;
      
      // Notes
      createNote: (title?: string, content?: string, projectId?: string | null) => Promise<Note>;
      updateNote: (noteId: string, title: string, content: string) => Promise<Note>;
      deleteNote: (noteId: string) => Promise<boolean>;
      
      // Team
      createTeamMember: (name: string, role: string, email: string, color: string) => Promise<TeamMember>;
      deleteTeamMember: (memberId: string) => Promise<boolean>;
      
      // Clients
      createClient: (fields: Omit<Client, 'id' | 'createdAt' | 'logs'>) => Promise<Client>;
      updateClient: (clientId: string, fields: Partial<Client>) => Promise<Client>;
      deleteClient: (clientId: string) => Promise<boolean>;
      addClientLog: (clientId: string, log: Omit<CommunicationLog, 'id'>) => Promise<boolean>;
      
      // Today
      setTodayFocus: (text: string) => Promise<void>;

      // Invoices
      createInvoice: (fields: Omit<Invoice, 'id'>) => Promise<boolean>;
      updateInvoice: (invoiceId: string, fields: Partial<Invoice>) => Promise<boolean>;
      deleteInvoice: (id: string) => Promise<boolean>;

      // Updater
      updater: {
        check: () => Promise<any>;
        download: () => Promise<any>;
        install: () => Promise<any>;
        getVersion: () => Promise<string>;
        onEvent: (channel: string, callback: (...args: any[]) => void) => () => void;
      };
    };
  }
}

export {};
