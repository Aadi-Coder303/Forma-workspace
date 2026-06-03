import fs from 'fs/promises';
import path from 'path';

export type ChecklistItem = {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  assigneeId?: string;
  subtasks: { id: string; title: string; isCompleted: boolean }[];
  priority: 'low' | 'normal' | 'urgent';
  createdAt: string;
  timeLogged?: number; // Total minutes spent on this task
  timeIsRunning?: boolean;
  timeStartedAt?: string; // ISO string of when the timer started
};

export type ProjectPhase = {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed';
  checklist: ChecklistItem[];
};

export type Project = {
  id: string;
  name: string;
  clientId?: string;
  deadline?: string;
  budget?: string;
  status: 'active' | 'on-hold' | 'completed' | 'backlog' | 'archived';
  priority: 'normal' | 'urgent' | 'low';
  folderPath: string;
  createdAt: string;
  phases: ProjectPhase[];
};

export type ChecklistTemplate = {
  id: string;
  name: string;
  phases: {
    name: string;
    items: { title: string; subtasks: string[] }[];
  }[];
};

export type CommunicationLog = {
  id: string;
  date: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  summary: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  color: string;
};

export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  currency: string;
  status: 'active' | 'completed' | 'paused' | 'lead';
  invoiceStatus: 'paid' | 'pending' | 'overdue' | 'none';
  deliverables: string;
  logs: CommunicationLog[];
  notes: string;
  createdAt: string;
};

export type Invoice = {
  id: string;
  projectId: string;
  clientId?: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  sentDate?: string;
  paidDate?: string;
  title: string;
};

export type Activity = {
  id: string;
  timestamp: string;
  action: string;
  details?: string;
};

export type DBData = {
  baseDirectory: string;
  projects: Project[];
  notes: Note[];
  team: TeamMember[];
  clients: Client[];
  templates: ChecklistTemplate[];
  invoices: Invoice[];
  todayFocus: string;
  activityLog: Activity[];
};

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
