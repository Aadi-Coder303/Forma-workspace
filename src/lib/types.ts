// Pure type definitions — no Node.js imports. Safe to use in client components.

export type ChecklistItem = {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  assigneeId?: string;
  subtasks: { id: string; title: string; isCompleted: boolean }[];
  priority: 'low' | 'normal' | 'urgent';
  createdAt: string;
  timeLogged?: number;
  timeIsRunning?: boolean;
  timeStartedAt?: string;
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

export type TeamTask = {
  id: string;
  title: string;
  assigneeId: string;
  isCompleted: boolean;
  completedAt?: string;
  priority: 'low' | 'normal' | 'urgent';
  dueDate?: string;
  projectId?: string;
  note?: string;
  createdAt: string;
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

export interface FocusItem {
  id: string;
  text: string;
}

export type DBData = {
  baseDirectory: string;
  projects: Project[];
  notes: Note[];
  team: TeamMember[];
  teamTasks: TeamTask[];
  clients: Client[];
  templates: ChecklistTemplate[];
  invoices: Invoice[];
  todayFocus?: string; // deprecated
  todayFocuses: FocusItem[];
  mainFocusId: string | null;
  activityLog: Activity[];
};
