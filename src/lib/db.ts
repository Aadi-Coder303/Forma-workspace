import fs from 'fs/promises';
import path from 'path';

// Re-export all types from the shared types file (no Node.js deps there)
export type {
  ChecklistItem,
  ProjectPhase,
  Project,
  ChecklistTemplate,
  CommunicationLog,
  Note,
  TeamMember,
  TeamTask,
  Client,
  Invoice,
  Activity,
  DBData,
} from './types';

import type { DBData } from './types';

const DB_FILE = path.join(process.cwd(), 'projects.json');

export async function getDb(): Promise<DBData> {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    const defaultData: DBData = {
      baseDirectory: '',
      projects: [],
      notes: [],
      team: [],
      teamTasks: [],
      clients: [],
      templates: [],
      invoices: [],
      todayFocus: '',
      activityLog: [],
    };
    await saveDb(defaultData);
    return defaultData;
  }
}

export async function saveDb(data: DBData): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
