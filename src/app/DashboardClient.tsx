'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DBData, Note, TeamMember, TeamTask, Client } from '@/lib/types';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import ClientsTab from '@/components/ClientsTab';
import WalkthroughOverlay from '@/components/WalkthroughOverlay';
import NewProjectWizard from '@/components/NewProjectWizard';
import InvoicesTab from '@/components/InvoicesTab';
import LegalModal from '@/components/LegalModal';
import { useTheme } from "next-themes";

// ─── Tab types ───────────────────────────────────────────────────────────────
type Tab = 'Projects' | 'Today' | 'Notes' | 'Team' | 'Clients' | 'Invoices' | 'Settings';

const MEMBER_COLORS = ['#C7622A','#2E5E4E','#6B6F7A','#8B5CF6','#0891B2','#DC2626'];

export default function DashboardClient() {
  const router = useRouter();
  const [db, setDb] = useState<DBData | null>(null);
  const [dirInput, setDirInput] = useState('');
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Projects');
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const deadlineAlerts = useMemo(() => {
    if (!db?.projects) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const alerts: { project: any, daysDiff: number }[] = [];
    
    db.projects.forEach(p => {
      if (p.deadline && p.status !== 'completed') {
        const dDate = new Date(p.deadline);
        const diffTime = dDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) {
          alerts.push({ project: p, daysDiff: diffDays });
        }
      }
    });
    return alerts.sort((a, b) => a.daysDiff - b.daysDiff);
  }, [db?.projects]);

  const hasOverdue = deadlineAlerts.some(a => a.daysDiff < 0);
  const [showTour, setShowTour] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Notes state
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // Team state
  const [newMember, setNewMember] = useState({ name: '', role: '', email: '', color: MEMBER_COLORS[0] });
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [teamTaskFilter, setTeamTaskFilter] = useState<'all' | 'active' | 'done'>('active');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'normal' as 'low' | 'normal' | 'urgent', dueDate: '', note: '', projectId: '' });
  const [sendTaskEmail, setSendTaskEmail] = useState(false);

  // Email & Feedback state
  const [emailSettings, setEmailSettings] = useState({ apiKey: '', fromEmail: '' });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

  // Sidebar state
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Command Palette state
  const [searchQuery, setSearchQuery] = useState('');

  // Today state
  const [newFocusInput, setNewFocusInput] = useState('');
  const [focusSaved, setFocusSaved] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | 'data' | null>(null);

  // Archive state
  const [showArchived, setShowArchived] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  interface EditingTemplate {
    id: string;
    name: string;
    phases: {
      id: string;
      name: string;
      items: {
        id: string;
        title: string;
        isCompleted: boolean;
      }[];
    }[];
  }

  // Template state
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);

  // Updater state
  const [appVersion, setAppVersion] = useState('');
  const [updaterStatus, setUpdaterStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updaterError, setUpdaterError] = useState('');

  const loadDb = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electron) {
      try {
        const data = await window.electron.getDb();
        setDb(data);
        setDirInput(data.baseDirectory);
        setEmailSettings({ apiKey: data.resendApiKey || '', fromEmail: data.resendFromEmail || '' });
      } catch (err: any) {
        setError(err.message);
      }
    }
  }, []);

  useEffect(() => {
    // First-launch tour
    if (!localStorage.getItem('forma-tour-done')) {
      setShowTour(true);
    }
    
    if (localStorage.getItem('forma-has-synced') === '1') {
      setHasSynced(true);
    }

    loadDb();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setActiveTab('Settings');
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === '1') { e.preventDefault(); setActiveTab('Projects'); }
      if ((e.metaKey || e.ctrlKey) && e.key === '2') { e.preventDefault(); setActiveTab('Clients'); }
      if ((e.metaKey || e.ctrlKey) && e.key === '3') { e.preventDefault(); setActiveTab('Team'); }
      if ((e.metaKey || e.ctrlKey) && e.key === '4') { e.preventDefault(); setActiveTab('Notes'); }
      if ((e.metaKey || e.ctrlKey) && e.key === '5') { e.preventDefault(); setActiveTab('Today'); }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleOpenWizard();
      }

      if (e.key === 'Escape') {
        setSearchOpen(false);
        setShowWizard(false);
        setShowShortcutsModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // IPC Menu actions
    if (window.electron && window.electron.onMenuAction) {
      window.electron.onMenuAction((action) => {
        if (action === 'preferences') setActiveTab('Settings');
        if (action === 'new-project') handleOpenWizard();
        if (action === 'import-project') handleImportProject();
        if (action === 'export-project') handleExportProject();
        if (action === 'find') setSearchOpen(true);
        if (action === 'toggle-sidebar') setIsSidebarVisible(prev => !prev);
        if (action === 'collapse-sidebar') setIsSidebarExpanded(prev => !prev);
        if (action === 'toggle-theme') setTheme(prev => prev === 'dark' ? 'light' : 'dark');
        if (action === 'nav-projects') setActiveTab('Projects');
        if (action === 'nav-clients') setActiveTab('Clients');
        if (action === 'nav-team') setActiveTab('Team');
        if (action === 'nav-notes') setActiveTab('Notes');
        if (action === 'nav-today') setActiveTab('Today');
        if (action === 'command-palette') setSearchOpen(true);
        if (action === 'nav-back') router.back();
        if (action === 'nav-forward') router.forward();
        if (action === 'keyboard-shortcuts') setShowShortcutsModal(true);
        if (action === 'getting-started') setShowTour(true);
        if (action === 'preferences' || action === 'show-updates') {
          setActiveTab('Settings');
          if (action === 'show-updates' && window.electron?.updater) {
            setUpdaterStatus('checking');
            window.electron.updater.check();
          }
        }
      });
    }

    // Updater events
    let unsubs: (() => void)[] = [];
    if (window.electron && window.electron.updater) {
      window.electron.updater.getVersion().then(setAppVersion).catch(() => {});
      
      unsubs = [
        window.electron.updater.onEvent('updater:checking-for-update', () => {
          setUpdaterStatus('checking');
        }),
        window.electron.updater.onEvent('updater:update-available', () => {
          setUpdaterStatus('available');
        }),
        window.electron.updater.onEvent('updater:update-not-available', () => {
          setUpdaterStatus('not-available');
          setTimeout(() => setUpdaterStatus('idle'), 3000);
        }),
        window.electron.updater.onEvent('updater:download-progress', (prog: any) => {
          setUpdaterStatus('downloading');
          setDownloadProgress(prog.percent || 0);
        }),
        window.electron.updater.onEvent('updater:update-downloaded', () => {
          setUpdaterStatus('downloaded');
        }),
        window.electron.updater.onEvent('updater:error', (err: string) => {
          setUpdaterStatus('error');
          setUpdaterError(err);
          setTimeout(() => setUpdaterStatus('idle'), 5000);
        })
      ];
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsubs.forEach(unsub => unsub && unsub());
    };
  }, [loadDb]);

  // ─── Projects ──────────────────────────────────────────────────────────────
  const handleOpenWizard = () => {
    if (db && !db.baseDirectory) {
      alert("Please set your base directory first.");
      return;
    }
    setShowWizard(true);
  };

  const handleSaveDir = async () => {
    if (!window.electron) return;
    if (!dirInput.startsWith('/')) {
      alert("Please enter a valid absolute path (e.g., /Users/yourname/Projects) or use the Browse button.");
      return;
    }
    setIsPending(true);
    try {
      setError('');
      const newDb = await window.electron.setBaseDirectory(dirInput);
      setDb(newDb);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleCreateProject = async (projectData: any) => {
    if (!window.electron) return;
    try {
      const pid = await window.electron.createProject(projectData);
      router.push(`/project?id=${pid}`);
    } catch (err: any) {
      alert('Failed to create project: ' + err.message);
    }
  };

  const handleImportProject = async () => {
    if (!window.electron) return;
    try {
      const pid = await window.electron.importProject();
      if (pid) {
        await loadDb(); // reload db to show new project
        router.push(`/project?id=${pid}`);
      }
    } catch (err: any) {
      alert('Failed to import project: ' + err.message);
    }
  };

  const handleSyncLocalDirectory = async () => {
    if (!window.electron) return;
    setIsPending(true);
    try {
      // @ts-ignore
      const addedCount = await window.electron.syncLocalDirectory();
      await loadDb(); // reload db to show new projects
      localStorage.setItem('forma-has-synced', '1');
      setHasSynced(true);
      alert(`Successfully synced and imported ${addedCount} project(s)!`);
    } catch (err: any) {
      alert('Failed to sync directory: ' + err.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleExportProject = () => {
    alert("Export Project feature is a stub! Ready to serialize to JSON.");
  };

  const handleCreateTemplateSubmit = async () => {
    if (!window.electron || !newTemplateName.trim()) return;
    const defaultPhases = [
      { id: Date.now().toString(), name: 'Discovery', items: [{ id: Date.now().toString() + '1', title: 'Kickoff Call', isCompleted: false }] },
      { id: (Date.now() + 1).toString(), name: 'Design', items: [{ id: (Date.now() + 1).toString() + '1', title: 'Wireframes', isCompleted: false }] }
    ];
    await window.electron.createTemplate({ name: newTemplateName.trim(), phases: defaultPhases });
    setNewTemplateName('');
    setShowNewTemplateModal(false);
    await loadDb();
  };

  const handleSaveEditedTemplate = async () => {
    if (!window.electron || !editingTemplate) return;
    await window.electron.updateTemplate(editingTemplate.id, {
      name: editingTemplate.name,
      phases: editingTemplate.phases
    });
    setEditingTemplate(null);
    await loadDb();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.electron) return;
    if (confirm('Are you sure you want to delete this template?')) {
      await window.electron.deleteTemplate(id);
      await loadDb();
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.electron) return;
    if (confirm('Archive this project? (It will be hidden from the active list)')) {
      try {
        await window.electron.updateProject(id, { status: 'archived' });
        await loadDb();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handlePickFolder = async () => {
    if (!window.electron) return;
    const chosen = await window.electron.pickFolder();
    if (chosen) setDirInput(chosen);
  };

  // ─── Notes ─────────────────────────────────────────────────────────────────
  const handleNewNote = async () => {
    if (!window.electron) return;
    const note = await window.electron.createNote('Untitled Note', '', undefined);
    await loadDb();
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const handleSaveNote = async () => {
    if (!window.electron || !selectedNote) return;
    setNoteSaving(true);
    try {
      const updated = await window.electron.updateNote(selectedNote.id, noteTitle, noteContent);
      setSelectedNote(updated);
      await loadDb();
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.electron) return;
    await window.electron.deleteNote(noteId);
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setNoteTitle('');
      setNoteContent('');
    }
    await loadDb();
  };

  // ─── Team ──────────────────────────────────────────────────────────────────
  const handleAddMember = async () => {
    if (!window.electron || !newMember.name) return;
    const m = await window.electron.createTeamMember(newMember.name, newMember.role, newMember.email, newMember.color);
    setNewMember({ name: '', role: '', email: '', color: MEMBER_COLORS[0] });
    setShowAddMember(false);
    await loadDb();
    setSelectedMember(m);
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.electron) return;
    if (!confirm('Remove this team member? Their tasks will also be deleted.')) return;
    await window.electron.deleteTeamMember(memberId);
    // also delete their tasks
    const tasks = (db as any)?.teamTasks as TeamTask[] ?? [];
    for (const t of tasks.filter((x: TeamTask) => x.assigneeId === memberId)) {
      await window.electron.deleteTeamTask(t.id);
    }
    if (selectedMember?.id === memberId) setSelectedMember(null);
    await loadDb();
  };

  const handleAddTask = async () => {
    if (!window.electron || !selectedMember || !newTask.title.trim()) return;
    await window.electron.createTeamTask({
      title: newTask.title.trim(),
      assigneeId: selectedMember.id,
      priority: newTask.priority,
      dueDate: newTask.dueDate || undefined,
      note: newTask.note || undefined,
      projectId: newTask.projectId || undefined,
    });
    
    if (sendTaskEmail) {
      if (!emailSettings.apiKey || !emailSettings.fromEmail) {
        alert("Cannot send email: Please configure Resend API Key in Settings first.");
      } else {
        const projName = newTask.projectId ? safeDb?.projects.find(p => p.id === newTask.projectId)?.name || 'N/A' : 'N/A';
        const html = `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>New Task Assigned: ${newTask.title.trim()}</h2>
            <p><strong>Priority:</strong> ${newTask.priority}</p>
            <p><strong>Due Date:</strong> ${newTask.dueDate || 'No due date'}</p>
            <p><strong>Project:</strong> ${projName}</p>
            ${newTask.note ? `<p><strong>Notes:</strong> ${newTask.note}</p>` : ''}
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Sent from Forma Workspace</p>
          </div>
        `;
        const res = await window.electron.sendEmail(selectedMember.email, `New Task: ${newTask.title.trim()}`, html);
        if (!res.success) {
          alert("Failed to send email to " + selectedMember.email + ": " + res.error);
        }
      }
    }

    setNewTask({ title: '', priority: 'normal', dueDate: '', note: '', projectId: '' });
    setSendTaskEmail(false);
    setShowAddTask(false);
    await loadDb();
  };

  const handleFeedbackSubmit = async () => {
    if (!window.electron || !feedbackText.trim()) return;
    setFeedbackSending(true);

    try {
      const diag = await window.electron.getAppDiagnostics();
      const subject = encodeURIComponent('Forma Workspace - In-App Feedback');
      
      const bodyText = `
Message:
${feedbackText.trim()}

---
Diagnostics:
${JSON.stringify(diag, null, 2)}
      `.trim();
      
      const body = encodeURIComponent(bodyText);
      
      // Open the user's default email client
      window.location.href = `mailto:hello@formadigital.in?subject=${subject}&body=${body}`;
      
      // Close modal and reset
      setFeedbackText('');
      setShowFeedbackModal(false);
    } catch (err: any) {
      alert("An error occurred: " + err.message);
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleToggleTask = async (taskId: string, current: boolean) => {
    if (!window.electron) return;
    await window.electron.updateTeamTask(taskId, { isCompleted: !current });
    await loadDb();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.electron) return;
    await window.electron.deleteTeamTask(taskId);
    await loadDb();
  };

  // ─── Today ─────────────────────────────────────────────────────────────────
  const handleAddFocus = async () => {
    if (!window.electron || !safeDb || !newFocusInput.trim()) return;
    const newItem = { id: Date.now().toString(), text: newFocusInput.trim() };
    const updated = [...safeDb.todayFocuses, newItem];
    await window.electron.setTodayFocuses(updated);
    if (!safeDb.mainFocusId) {
      await window.electron.setMainFocus(newItem.id);
    }
    setNewFocusInput('');
    setFocusSaved(true);
    setTimeout(() => setFocusSaved(false), 2000);
    await loadDb();
  };

  const handleDeleteFocus = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.electron || !safeDb) return;
    const updated = safeDb.todayFocuses.filter(f => f.id !== id);
    await window.electron.setTodayFocuses(updated);
    if (safeDb.mainFocusId === id) {
      await window.electron.setMainFocus(updated.length > 0 ? updated[0].id : null);
    }
    await loadDb();
  };

  const handleSetMainFocus = async (id: string) => {
    if (!window.electron || !safeDb) return;
    await window.electron.setMainFocus(id);
    await loadDb();
  };

  // ─── Render guards ─────────────────────────────────────────────────────────
  // Normalise: old projects.json may not have notes / team / todayFocuses
  const safeDb = db
    ? { ...db, notes: db.notes ?? [], team: db.team ?? [], teamTasks: (db as any).teamTasks ?? [], todayFocuses: db.todayFocuses ?? [], mainFocusId: db.mainFocusId ?? null }
    : null;

  if (!safeDb) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted font-body text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span>Initializing Workspace…</span>
        </div>
      </div>
    );
  }

  // Use safeDb from here on so notes/team/todayFocus/clients are always arrays
  const safeNotes   = safeDb.notes;
  const safeTeam    = safeDb.team;
  const safeClients = (safeDb as any).clients as Client[] ?? [];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  
  const activeProjects = safeDb.projects.filter(p => showArchived ? p.status === 'archived' : p.status !== 'archived');
  const recentProjects = safeDb.projects.filter(p => p.status !== 'archived').slice().reverse().slice(0, 5);

  return (
    <div className="flex flex-col w-full h-full bg-canvas font-body">

      {/* ── Native Title Bar ── */}
      <div 
        style={{ WebkitAppRegion: 'drag' } as any} 
        className="h-10 shrink-0 flex items-center justify-between px-20"
      >
        <div className="flex items-center gap-4">
          <div style={{ WebkitAppRegion: 'no-drag' } as any} className="flex items-center gap-1">
            <button onClick={() => router.back()} className="text-muted hover:text-primary transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer">
              <Icons.ChevronLeft size={16} />
            </button>
            <button onClick={() => router.forward()} className="text-muted hover:text-primary transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer">
              <Icons.ChevronRight size={16} />
            </button>
          </div>
          <span className="text-muted text-xs font-medium tracking-wide">Forma Workspace</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        {isSidebarVisible && (
          <nav
            data-tour="sidebar-nav"
            className={`bg-sidebar border-r border-border flex flex-col py-6 shrink-0 transition-all duration-300 ${isSidebarExpanded ? 'w-56 px-4 items-stretch' : 'w-20 items-center'}`}
          >
          <div className={`mb-10 flex ${isSidebarExpanded ? 'justify-start px-2' : 'justify-center'} items-center`}>
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-display font-bold text-primary text-lg shadow-lg shrink-0">
              F
            </div>
            {isSidebarExpanded && <span className="ml-3 font-display font-bold text-primary text-lg">Forma</span>}
          </div>

          <div className="flex-1 flex flex-col gap-1">
            {(['Projects', 'Today', 'Notes', 'Team', 'Clients', 'Invoices'] as Tab[]).map(tab => {
              const IconComp = Icons[tab as keyof typeof Icons];
              return (
                <button
                  key={tab}
                  data-tour={`tab-${tab.toLowerCase()}`}
                  onClick={() => setActiveTab(tab)}
                  title={tab}
                  className={`p-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center'} ${activeTab === tab ? 'bg-hover text-accent' : 'text-muted hover:text-primary hover:bg-hover'}`}
                >
                  <div className="relative shrink-0">
                    <IconComp size={20} strokeWidth={activeTab === tab ? 2.5 : 2} />
                    {tab === 'Projects' && hasOverdue && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] border border-ink" />
                    )}
                  </div>
                  {isSidebarExpanded && <span className="text-sm font-medium">{tab}</span>}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1 mt-auto">
            <button
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              title="Toggle Sidebar"
              className={`p-3 rounded-xl text-muted hover:text-primary hover:bg-hover transition-all duration-200 cursor-pointer flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}
            >
              {isSidebarExpanded ? <Icons.ArrowLeft size={20} strokeWidth={2} className="shrink-0" /> : <Icons.ChevronRight size={20} strokeWidth={2} className="shrink-0" />}
              {isSidebarExpanded && <span className="text-sm font-medium">Collapse</span>}
            </button>
            <button
              data-tour="search-btn"
              onClick={() => setSearchOpen(true)}
              title="Search  ⌘K"
              className={`p-3 rounded-xl text-muted hover:text-primary hover:bg-hover transition-all duration-200 cursor-pointer flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}
            >
              <Icons.Search size={20} strokeWidth={2} className="shrink-0" />
              {isSidebarExpanded && <span className="text-sm font-medium">Search</span>}
            </button>
            <button
              data-tour="tab-settings"
              onClick={() => setActiveTab('Settings')}
              title="Settings"
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center'} ${activeTab === 'Settings' ? 'bg-hover text-accent' : 'text-muted hover:text-primary hover:bg-hover'}`}
            >
              <Icons.Settings size={20} strokeWidth={activeTab === 'Settings' ? 2.5 : 2} className="shrink-0" />
              {isSidebarExpanded && <span className="text-sm font-medium">Settings</span>}
            </button>
            <button
              onClick={() => setShowFeedbackModal(true)}
              title="Report a Bug / Feedback"
              className={`p-3 rounded-xl text-muted hover:text-accent hover:bg-hover transition-all duration-200 cursor-pointer flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}
            >
              <Icons.Bug size={20} className="shrink-0" />
              {isSidebarExpanded && <span className="text-sm font-medium text-left">Report Bug</span>}
            </button>
          </div>
        </nav>
        )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-8 border-b border-border">
          <h1 className="font-display text-xl tracking-wide text-primary font-medium">{activeTab}</h1>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-muted hover:text-primary transition-colors duration-200 cursor-pointer text-sm bg-hover px-3 py-1.5 rounded-lg border border-border"
          >
            <Icons.Search size={14} />
            <span>Search…</span>
            <kbd className="ml-4 font-mono text-xs bg-hover px-1.5 py-0.5 rounded">⌘ K</kbd>
          </button>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-8 mt-4 bg-hover border border-accent text-accent px-4 py-3 rounded-lg text-sm flex items-center gap-2 shrink-0">
            <Icons.Close size={16} />
            {error}
            <button className="ml-auto" onClick={() => setError('')}><Icons.Close size={14} /></button>
          </div>
        )}

        {/* ── PROJECTS TAB ── */}
        {activeTab === 'Projects' && (
          <main className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Quick Create */}
              <div data-tour="new-project" className="bg-card text-primary rounded-2xl p-6 shadow-sm border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Icons.Plus size={18} strokeWidth={2.5} className="text-accent" />
                  <h2 className="font-display font-bold text-lg">New Project</h2>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={handleImportProject}
                      disabled={isPending}
                      title="Pick an existing folder on disk"
                      className="flex-1 flex items-center justify-center gap-2 border border-border text-muted hover:text-primary hover:border-border rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
                    >
                      <Icons.FolderOpen size={15} />
                      Import Existing
                    </button>
                    <button
                      onClick={handleOpenWizard}
                      className="flex-1 bg-accent text-canvas rounded-lg py-2.5 text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer shadow-sm"
                    >
                      + New Project
                    </button>
                  </div>
                </div>
              </div>

              {/* Today's Focus */}
              {safeDb.todayFocuses.length > 0 && safeDb.mainFocusId && (
                <div className="bg-hover border border-accent/20 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <Icons.Today size={16} className="text-accent" />
                    <h3 className="text-accent text-sm font-medium uppercase tracking-wider">Today's Focus</h3>
                  </div>
                  <p className="text-primary font-display text-2xl leading-snug whitespace-pre-wrap">
                    {safeDb.todayFocuses.find(f => f.id === safeDb.mainFocusId)?.text || safeDb.todayFocuses[0].text}
                  </p>
                </div>
              )}

              {/* Workspace Dir (Only show if not synced OR if base directory is missing) */}
              {(!hasSynced || !safeDb.baseDirectory) && (
                <div className="bg-hover border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <Icons.Projects size={18} className="text-muted" />
                    <h2 className="font-display font-medium text-lg">Local Directory</h2>
                  </div>
                  <p className="text-muted text-sm mb-4">Where your project folders live on disk.</p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-hover border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors font-mono"
                      value={dirInput}
                      onChange={e => setDirInput(e.target.value)}
                      placeholder="/Users/you/Projects"
                    />
                    <button
                      onClick={handlePickFolder}
                      title="Browse for folder"
                      className="bg-hover hover:bg-hover text-primary border border-border rounded-lg px-3 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Icons.FolderOpen size={15} />
                      Browse
                    </button>
                    <button
                      onClick={handleSaveDir}
                      disabled={isPending}
                      className="bg-hover hover:bg-hover text-primary border border-border rounded-lg px-4 text-sm font-medium transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleSyncLocalDirectory}
                      disabled={isPending}
                      title="Scan this directory and auto-import missing folders as projects"
                      className="bg-accent hover:bg-[#a65123] text-canvas border border-transparent rounded-lg px-4 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Icons.FolderOpen size={15} />
                      Sync
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl text-primary">{showArchived ? 'Archived Projects' : 'Active Projects'}</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-xs text-muted hover:text-accent transition-colors cursor-pointer border border-border px-3 py-1 rounded-full"
                >
                  {showArchived ? 'View Active' : 'View Archived'}
                </button>
                <span className="text-sm text-muted">{safeDb.projects.length} project{safeDb.projects.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {safeDb.projects.length === 0 ? (
              <div className="border border-dashed border-border rounded-2xl py-16 flex flex-col items-center justify-center text-muted">
                <Icons.Projects size={32} className="mb-4 opacity-50" />
                <p>No active projects yet.</p>
                <p className="text-xs mt-1 opacity-70">Create one above or press ⌘K</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {activeProjects.slice().reverse().map(project => (
                  <div key={project.id} className="group bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-accent opacity-80" />
                    <div className="flex justify-between items-start mb-4 mt-1">
                      <Link href={`/project?id=${project.id}`} className="hover:text-accent transition-colors">
                        <h3 className="font-display font-bold text-primary text-xl line-clamp-1">{project.name}</h3>
                      </Link>
                      <div className="flex items-center justify-end">
                        {showArchived ? (
                          <button onClick={() => {
                            if(window.electron) {
                              window.electron.updateProject(project.id, { status: 'active' }).then(() => loadDb());
                            }
                          }} className="text-muted hover:text-accent transition-colors cursor-pointer p-1 -mr-1" title="Restore">
                            <Icons.FolderOpen size={16} />
                          </button>
                        ) : (
                          <button onClick={() => {
                            if(window.electron) {
                              window.electron.updateProject(project.id, { status: 'archived' }).then(() => loadDb());
                            }
                          }} className="text-muted hover:text-accent transition-colors cursor-pointer p-1 -mr-1" title="Archive">
                            <Icons.Close size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted font-mono mb-6 truncate" title={project.folderPath}>
                      {project.folderPath.split('/').slice(-2).join('/')}
                    </p>
                    <div className="mt-auto flex justify-between items-center border-t border-border pt-4">
                      <div className="flex items-center gap-1.5 text-accent text-xs font-medium">
                        <div className={`w-2 h-2 rounded-full ${showArchived ? 'bg-slate' : 'bg-accent animate-pulse'}`} />
                        {showArchived ? 'Archived' : 'Active'}
                      </div>
                      <Link href={`/project?id=${project.id}`} className="text-accent hover:text-primary text-sm font-medium flex items-center gap-1 transition-colors cursor-pointer">
                        Open <Icons.ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}

        {/* ── TODAY TAB ── */}
        {activeTab === 'Today' && (
          <main className="flex-1 overflow-y-auto p-8">
            <div className="mb-8">
              <p className="text-muted text-sm mb-1">{today}</p>
              <h2 className="font-display text-3xl text-primary font-medium mb-8">Good morning.</h2>
              
              {deadlineAlerts.length > 0 && (
                <div className="mb-8 flex flex-col gap-3">
                  {deadlineAlerts.map(alert => {
                    const isOverdue = alert.daysDiff < 0;
                    return (
                      <div key={alert.project.id} className={`p-4 rounded-xl border flex items-center justify-between ${isOverdue ? 'bg-hover border-border' : 'bg-hover border-border'}`}>
                        <div className="flex flex-col">
                          <span className={`font-medium ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                            {isOverdue ? '⚠️ Overdue Project' : '⏳ Upcoming Deadline'}
                          </span>
                          <span className="text-primary text-sm mt-1">{alert.project.name} is {isOverdue ? `overdue by ${Math.abs(alert.daysDiff)} days` : `due in ${alert.daysDiff} days`}</span>
                        </div>
                        <button 
                          onClick={() => { setActiveTab('Projects'); router.push(`/project?id=${alert.project.id}`); }} 
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isOverdue ? 'bg-hover text-red-300 hover:bg-hover' : 'bg-hover text-amber-300 hover:bg-hover'}`}
                        >
                          View Project
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-primary font-medium mb-3">Today's Focus</h3>
                  <div className="flex flex-col gap-3">
                    {/* Render the focus items */}
                    {safeDb.todayFocuses.length > 0 && (
                      <div className="flex flex-col gap-3">
                        {/* Render Main Focus */}
                        {safeDb.todayFocuses.map((focus) => {
                          const isMain = focus.id === (safeDb.mainFocusId || safeDb.todayFocuses[0].id);
                          if (!isMain) return null;
                          return (
                            <div key={focus.id} className="relative group bg-hover border border-accent/40 shadow-sm rounded-xl p-6 transition-all">
                              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => handleDeleteFocus(focus.id, e)} className="text-muted hover:text-red-400 p-1 bg-card rounded-md border border-border">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Icons.Today size={14} className="text-accent" />
                                <span className="text-xs uppercase tracking-wider text-accent font-bold">Main Focus</span>
                              </div>
                              <p className="text-primary font-display text-2xl leading-snug whitespace-pre-wrap pr-8">{focus.text}</p>
                            </div>
                          );
                        })}

                        {/* Render Other Focuses (Pills) */}
                        {safeDb.todayFocuses.map((focus) => {
                          const isMain = focus.id === (safeDb.mainFocusId || safeDb.todayFocuses[0].id);
                          if (isMain) return null;
                          return (
                            <div 
                              key={focus.id} 
                              onClick={() => handleSetMainFocus(focus.id)}
                              className="group bg-hover/50 hover:bg-hover border border-border rounded-lg p-3 pr-4 flex items-center justify-between cursor-pointer transition-all"
                            >
                              <p className="text-muted group-hover:text-primary text-sm line-clamp-2 pr-4">{focus.text}</p>
                              <button onClick={(e) => handleDeleteFocus(focus.id, e)} className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add New Focus Input */}
                    <div className="relative mt-2">
                      <input
                        value={newFocusInput}
                        onChange={e => setNewFocusInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddFocus();
                          }
                        }}
                        placeholder={safeDb.todayFocuses.length === 0 ? "What's your main focus today?" : "Add another focus..."}
                        className={`w-full bg-hover border border-border rounded-lg pl-4 pr-20 py-3 text-sm text-primary outline-none focus:border-accent transition-colors ${safeDb.todayFocuses.length === 0 ? 'h-16 text-lg font-display' : ''}`}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {focusSaved && <span className="text-[10px] text-accent animate-fade-in uppercase font-bold tracking-wider">Added</span>}
                        <button
                          onClick={handleAddFocus}
                          className="bg-accent text-canvas w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#a65123] transition-colors cursor-pointer disabled:opacity-50"
                          disabled={!newFocusInput.trim()}
                        >
                          <Icons.Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-primary font-medium mb-3">Due Soon</h3>
                  <div className="bg-hover border border-border rounded-xl p-5 flex flex-col gap-3 min-h-[10rem]">
                    {safeDb.projects.filter(p => p.deadline && p.status !== 'completed' && p.status !== 'archived').length === 0 ? (
                      <p className="text-muted text-sm">No projects have upcoming deadlines.</p>
                    ) : (
                      safeDb.projects
                        .filter(p => p.deadline && p.status !== 'completed' && p.status !== 'archived')
                        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
                        .slice(0, 5)
                        .map(p => (
                          <Link key={p.id} href={`/project?id=${p.id}`} className="flex justify-between items-center p-3 border border-border rounded-lg hover:border-accent transition-colors">
                            <span className="text-primary text-sm font-medium">{p.name}</span>
                            <span className="text-xs text-muted">{new Date(p.deadline!).toLocaleDateString()}</span>
                          </Link>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-primary">Recent Projects</h3>
              <button onClick={() => setActiveTab('Projects')} className="text-xs text-accent hover:underline cursor-pointer">View all →</button>
            </div>
            {recentProjects.length === 0 ? (
              <p className="text-muted text-sm">No projects yet. <button className="text-accent hover:underline cursor-pointer" onClick={() => setActiveTab('Projects')}>Create one.</button></p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentProjects.map(p => (
                  <Link key={p.id} href={`/project?id=${p.id}`}>
                    <div className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-hover transition-colors group cursor-pointer">
                      <div className="w-8 h-8 rounded-lg bg-hover flex items-center justify-center">
                        <Icons.Projects size={14} className="text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-primary text-sm font-medium truncate">{p.name}</p>
                        <p className="text-muted text-xs truncate">{p.folderPath}</p>
                      </div>
                      <Icons.ChevronRight size={14} className="text-muted group-hover:text-accent transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Activity Log */}
            <div className="mt-12 mb-4">
              <h3 className="font-display text-lg text-primary">Recent Activity</h3>
            </div>
            {(!safeDb.activityLog || safeDb.activityLog.length === 0) ? (
              <p className="text-muted text-sm">No activity recorded yet.</p>
            ) : (
              <div className="flex flex-col">
                {safeDb.activityLog.slice(0, 10).map((activity, index) => (
                  <div key={activity.id} className="relative flex gap-4 pb-6">
                    {/* Timeline line */}
                    {index !== Math.min(safeDb.activityLog.length, 10) - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-hover"></div>
                    )}
                    <div className="w-6 h-6 rounded-full bg-hover border border-border flex items-center justify-center shrink-0 mt-0.5 z-10">
                      <div className="w-2 h-2 rounded-full bg-slate" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-primary font-medium">{activity.action}</p>
                      {activity.details && <p className="text-xs text-muted mt-1">{activity.details}</p>}
                      <p className="text-xs text-muted/50 mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === 'Notes' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 shrink-0 border-r border-border flex flex-col">
              <div className="p-4 border-b border-border">
                <button
                  onClick={handleNewNote}
                  className="w-full bg-accent text-canvas rounded-lg py-2 text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Icons.Plus size={14} />
                  New Note
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {safeNotes.length === 0 ? (
                  <p className="text-muted text-xs text-center p-6">No notes yet. Create one!</p>
                ) : (
                  safeNotes.slice().reverse().map(note => (
                    <div
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className={`px-4 py-3 cursor-pointer border-b border-border hover:bg-hover transition-colors group relative ${selectedNote?.id === note.id ? 'bg-hover border-l-2 border-l-ember' : ''}`}
                    >
                      <p className="text-primary text-sm font-medium truncate">{note.title || 'Untitled'}</p>
                      <p className="text-muted text-xs mt-0.5 truncate">{note.content?.slice(0, 50) || 'Empty note'}</p>
                      <p className="text-muted text-xs mt-1 opacity-60">{new Date(note.updatedAt).toLocaleDateString()}</p>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }}
                        className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-accent cursor-pointer"
                      >
                        <Icons.Close size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Editor */}
            {selectedNote ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-8 py-4 border-b border-border flex items-center justify-between">
                  <input
                    className="bg-transparent text-primary font-display text-xl outline-none flex-1 placeholder:text-muted"
                    value={noteTitle}
                    onChange={e => setNoteTitle(e.target.value)}
                    placeholder="Note title…"
                  />
                  <button
                    onClick={handleSaveNote}
                    className={`ml-4 text-xs px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${noteSaving ? 'opacity-50' : 'bg-hover text-primary hover:bg-hover'}`}
                  >
                    {noteSaving ? 'Saving…' : 'Save  ⌘S'}
                  </button>
                </div>
                <textarea
                  className="flex-1 bg-transparent text-primary text-sm resize-none outline-none p-8 leading-relaxed placeholder:text-muted"
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Start writing…"
                  onKeyDown={e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                      e.preventDefault();
                      handleSaveNote();
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted">
                <Icons.Notes size={36} className="opacity-30 mb-4" />
                <p className="text-sm">Select a note or create a new one</p>
              </div>
            )}
          </div>
        )}

        {/* ── TEAM TAB ── */}
        {activeTab === 'Team' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Member List */}
            <div className="w-72 shrink-0 border-r border-border flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <span className="text-xs text-muted uppercase tracking-widest font-semibold">Team</span>
                <button
                  onClick={() => setShowAddMember(v => !v)}
                  className="flex items-center gap-1.5 text-xs bg-accent text-canvas px-3 py-1.5 rounded-lg hover:bg-[#a65123] transition-colors cursor-pointer font-medium"
                >
                  <Icons.Plus size={12} />
                  Add
                </button>
              </div>

              {/* Add member inline form */}
              {showAddMember && (
                <div className="p-4 border-b border-border bg-hover">
                  <p className="text-xs text-muted mb-3 font-medium uppercase tracking-wider">New Collaborator</p>
                  <div className="flex flex-col gap-2">
                    <input
                      className="bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent transition-colors"
                      placeholder="Full Name *"
                      value={newMember.name}
                      autoFocus
                      onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); if (e.key === 'Escape') setShowAddMember(false); }}
                    />
                    <input
                      className="bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent transition-colors"
                      placeholder="Role"
                      value={newMember.role}
                      onChange={e => setNewMember(m => ({ ...m, role: e.target.value }))}
                    />
                    <input
                      className="bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent transition-colors"
                      placeholder="Email"
                      type="email"
                      value={newMember.email}
                      onChange={e => setNewMember(m => ({ ...m, email: e.target.value }))}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-muted text-xs">Color:</span>
                      <div className="flex gap-1.5">
                        {MEMBER_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setNewMember(m => ({ ...m, color: c }))}
                            className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${newMember.color === c ? 'scale-125 ring-2 ring-white/40 ring-offset-1 ring-offset-hover' : ''}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => setShowAddMember(false)} className="flex-1 text-muted text-sm hover:text-primary cursor-pointer py-1.5 border border-border rounded-lg transition-colors">Cancel</button>
                      <button
                        onClick={handleAddMember}
                        disabled={!newMember.name}
                        className="flex-1 bg-accent text-canvas text-sm py-1.5 rounded-lg hover:bg-[#a65123] transition-colors cursor-pointer disabled:opacity-40 font-medium"
                      >Add</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Member list */}
              <div className="flex-1 overflow-y-auto">
                {safeTeam.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted py-12">
                    <Icons.Team size={28} className="opacity-30 mb-3" />
                    <p className="text-xs">No team members yet.</p>
                  </div>
                ) : (
                  safeTeam.map((member: TeamMember) => {
                    const memberTasks = ((safeDb as any).teamTasks as TeamTask[] ?? []).filter((t: TeamTask) => t.assigneeId === member.id);
                    const activeCnt = memberTasks.filter((t: TeamTask) => !t.isCompleted).length;
                    const isSelected = selectedMember?.id === member.id;
                    return (
                      <button
                        key={member.id}
                        onClick={() => { setSelectedMember(member); setShowAddTask(false); }}
                        className={`w-full text-left px-4 py-3.5 border-b border-border flex items-center gap-3 transition-colors cursor-pointer ${
                          isSelected ? 'bg-hover border-l-2 border-l-accent' : 'hover:bg-hover'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-white" style={{ backgroundColor: member.color }}>
                          {member.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-primary text-sm font-medium truncate">{member.name}</p>
                          <p className="text-muted text-xs truncate">{member.role || 'No role'}</p>
                        </div>
                        {activeCnt > 0 && (
                          <span className="text-xs font-medium bg-accent/20 text-accent px-2 py-0.5 rounded-full shrink-0">{activeCnt}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Member Detail Panel */}
            {selectedMember ? (() => {
              const memberTasks = ((safeDb as any).teamTasks as TeamTask[] ?? []).filter((t: TeamTask) => t.assigneeId === selectedMember.id);
              const projectTasks = safeDb.projects.flatMap(p =>
                p.phases.flatMap(ph =>
                  ph.checklist
                    .filter(i => i.assigneeId === selectedMember.id)
                    .map(i => ({ ...i, projectName: p.name, projectId: p.id, phaseId: ph.id, phaseName: ph.name }))
                )
              );

              const filteredTasks = memberTasks.filter((t: TeamTask) =>
                teamTaskFilter === 'all' ? true :
                teamTaskFilter === 'done' ? t.isCompleted :
                !t.isCompleted
              );
              const filteredProjectTasks = projectTasks.filter(t =>
                teamTaskFilter === 'all' ? true :
                teamTaskFilter === 'done' ? t.isCompleted :
                !t.isCompleted
              );

              const PRIORITY_COLORS: Record<string, string> = { urgent: 'text-red-400', normal: 'text-amber-400', low: 'text-muted' };
              const PRIORITY_LABELS: Record<string, string> = { urgent: 'Urgent', normal: 'Normal', low: 'Low' };

              return (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Member header */}
                  <div className="px-8 py-5 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md" style={{ backgroundColor: selectedMember.color }}>
                        {selectedMember.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-display text-xl text-primary font-semibold">{selectedMember.name}</h2>
                        <div className="flex items-center gap-3 mt-0.5">
                          {selectedMember.role && <span className="text-muted text-xs">{selectedMember.role}</span>}
                          {selectedMember.email && (
                            <a href={`mailto:${selectedMember.email}`} className="text-xs text-accent hover:underline">{selectedMember.email}</a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setShowAddTask(v => !v); }}
                        className="flex items-center gap-2 bg-accent text-canvas text-sm px-4 py-2 rounded-lg hover:bg-[#a65123] transition-colors cursor-pointer font-medium"
                      >
                        <Icons.Plus size={14} />
                        Assign Task
                      </button>
                      <button
                        onClick={() => handleDeleteMember(selectedMember.id)}
                        className="text-muted hover:text-red-400 transition-colors cursor-pointer p-2 rounded-lg hover:bg-hover"
                        title="Remove member"
                      >
                        <Icons.Close size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Assign task form */}
                  {showAddTask && (
                    <div className="mx-8 mt-5 bg-hover border border-border rounded-xl p-5 shrink-0">
                      <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-4">New Task for {selectedMember.name}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input
                          className="bg-canvas border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors col-span-full"
                          placeholder="Task title *"
                          autoFocus
                          value={newTask.title}
                          onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setShowAddTask(false); }}
                        />
                        <select
                          className="bg-canvas border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors"
                          value={newTask.priority}
                          onChange={e => setNewTask(t => ({ ...t, priority: e.target.value as 'low' | 'normal' | 'urgent' }))}
                        >
                          <option value="low">🟢 Low priority</option>
                          <option value="normal">🟡 Normal priority</option>
                          <option value="urgent">🔴 Urgent</option>
                        </select>
                        <input
                          type="date"
                          className="bg-canvas border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors"
                          value={newTask.dueDate}
                          onChange={e => setNewTask(t => ({ ...t, dueDate: e.target.value }))}
                        />
                        <select
                          className="bg-canvas border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors col-span-full"
                          value={newTask.projectId}
                          onChange={e => setNewTask(t => ({ ...t, projectId: e.target.value }))}
                        >
                          <option value="">— No linked project —</option>
                          {safeDb.projects.filter(p => p.status !== 'archived').map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <textarea
                          className="bg-canvas border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors col-span-full resize-none h-16"
                          placeholder="Notes (optional)"
                          value={newTask.note}
                          onChange={e => setNewTask(t => ({ ...t, note: e.target.value }))}
                        />
                        <div className="col-span-full flex items-center gap-2 mt-1 mb-2">
                          <input 
                            type="checkbox" 
                            id="sendTaskEmail"
                            checked={sendTaskEmail}
                            onChange={e => setSendTaskEmail(e.target.checked)}
                            className="accent-accent cursor-pointer"
                          />
                          <label htmlFor="sendTaskEmail" className="text-xs text-muted cursor-pointer hover:text-primary transition-colors">
                            Send email notification to assignee
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAddTask(false)} className="text-muted text-sm hover:text-primary cursor-pointer px-4 py-2">Cancel</button>
                        <button
                          onClick={handleAddTask}
                          disabled={!newTask.title.trim()}
                          className="bg-accent text-canvas px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer disabled:opacity-40"
                        >Assign Task</button>
                      </div>
                    </div>
                  )}

                  {/* Stats bar */}
                  <div className="px-8 py-4 border-b border-border flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-2xl font-display font-bold text-primary">{memberTasks.filter(t => !t.isCompleted).length}</p>
                      <p className="text-xs text-muted mt-0.5">Active</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="text-2xl font-display font-bold text-primary">{memberTasks.filter(t => t.isCompleted).length}</p>
                      <p className="text-xs text-muted mt-0.5">Completed</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="text-2xl font-display font-bold text-primary">{projectTasks.filter(t => !t.isCompleted).length}</p>
                      <p className="text-xs text-muted mt-0.5">Project Tasks</p>
                    </div>
                    <div className="ml-auto flex items-center bg-hover border border-border rounded-lg overflow-hidden">
                      {(['active', 'all', 'done'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setTeamTaskFilter(f)}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer capitalize ${
                            teamTaskFilter === f ? 'bg-primary text-canvas' : 'text-muted hover:text-primary'
                          }`}
                        >{f}</button>
                      ))}
                    </div>
                  </div>

                  {/* Task lists */}
                  <div className="flex-1 overflow-y-auto p-8 pt-5">

                    {/* Standalone team tasks */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs text-muted uppercase tracking-widest font-semibold">Assigned Tasks</h3>
                        <span className="text-xs text-muted">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}</span>
                      </div>

                      {filteredTasks.length === 0 ? (
                        <div className="border border-dashed border-border rounded-xl py-8 flex flex-col items-center justify-center text-muted">
                          <Icons.Team size={22} className="opacity-30 mb-2" />
                          <p className="text-xs">
                            {teamTaskFilter === 'done' ? 'No completed tasks yet.' : 'No active tasks. Click "Assign Task" to add one.'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {filteredTasks.map((task: TeamTask) => {
                            const isOverdue = task.dueDate && !task.isCompleted && new Date(task.dueDate) < new Date();
                            const linkedProject = task.projectId ? safeDb.projects.find(p => p.id === task.projectId) : null;
                            return (
                              <div
                                key={task.id}
                                className={`group flex items-start gap-3 p-4 rounded-xl border transition-all ${
                                  task.isCompleted
                                    ? 'border-border bg-hover opacity-60'
                                    : 'border-border bg-card hover:border-accent/40'
                                }`}
                              >
                                <button
                                  onClick={() => handleToggleTask(task.id, task.isCompleted)}
                                  className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                    task.isCompleted
                                      ? 'bg-accent border-accent text-canvas'
                                      : 'border-border hover:border-accent'
                                  }`}
                                >
                                  {task.isCompleted && <Icons.Check size={10} strokeWidth={3} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${ task.isCompleted ? 'line-through text-muted' : 'text-primary' }`}>{task.title}</p>
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                                    {task.dueDate && (
                                      <span className={`text-xs ${ isOverdue ? 'text-red-400' : 'text-muted' }`}>
                                        {isOverdue ? '⚠️ Overdue · ' : '📅 '}
                                        {new Date(task.dueDate).toLocaleDateString()}
                                      </span>
                                    )}
                                    {linkedProject && (
                                      <Link href={`/project?id=${linkedProject.id}`} className="text-xs text-accent hover:underline">📁 {linkedProject.name}</Link>
                                    )}
                                  </div>
                                  {task.note && <p className="text-xs text-muted mt-1.5 italic">{task.note}</p>}
                                  {task.isCompleted && task.completedAt && (
                                    <p className="text-xs text-muted/50 mt-1">✓ Done {new Date(task.completedAt).toLocaleDateString()}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-400 cursor-pointer p-1 shrink-0"
                                  title="Delete task"
                                >
                                  <Icons.Close size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Project tasks */}
                    {filteredProjectTasks.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs text-muted uppercase tracking-widest font-semibold">Project Tasks</h3>
                          <span className="text-xs text-muted">{filteredProjectTasks.length} task{filteredProjectTasks.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {filteredProjectTasks.map((task: any) => (
                            <div
                              key={task.id}
                              className={`group flex items-start gap-3 p-4 rounded-xl border transition-all ${
                                task.isCompleted
                                  ? 'border-border bg-hover opacity-60'
                                  : 'border-border bg-card hover:border-accent/40'
                              }`}
                            >
                              <button
                                onClick={async () => {
                                  if (!window.electron) return;
                                  await window.electron.updateChecklistItem(task.projectId, task.phaseId, task.id, { isCompleted: !task.isCompleted });
                                  await loadDb();
                                }}
                                className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                  task.isCompleted
                                    ? 'bg-accent border-accent text-canvas'
                                    : 'border-border hover:border-accent'
                                }`}
                              >
                                {task.isCompleted && <Icons.Check size={10} strokeWidth={3} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${ task.isCompleted ? 'line-through text-muted' : 'text-primary' }`}>{task.title}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <Link href={`/project?id=${task.projectId}`} className="text-xs text-accent hover:underline">📁 {task.projectName}</Link>
                                  <span className="text-xs text-muted">{task.phaseName}</span>
                                  {task.priority && task.priority !== 'normal' && (
                                    <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted">
                <Icons.Team size={40} className="opacity-20 mb-4" />
                <p className="text-sm">Select a team member to view their tasks</p>
                {safeTeam.length === 0 && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="mt-4 text-xs text-accent hover:underline cursor-pointer"
                  >Add your first team member →</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CLIENTS TAB ── */}
        {activeTab === 'Clients' && (
          <ClientsTab
            clients={safeClients}
            projects={safeDb.projects.map(p => ({ id: p.id, name: p.name }))}
            onRefresh={loadDb}
          />
        )}

        {activeTab === 'Invoices' && (
          <InvoicesTab db={safeDb} onRefresh={loadDb} />
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'Settings' && (
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl text-primary font-medium mb-8">Settings</h2>

              {/* Workspace */}
              <section className="mb-10">
                <h3 className="text-xs text-muted uppercase tracking-widest font-semibold mb-4">Workspace</h3>
                <div className="bg-hover border border-border rounded-2xl divide-y divide-[rgba(244,242,238,0.06)]">
                  <div className="p-5">
                    <label className="block text-primary text-sm font-medium mb-2">Base Directory</label>
                    <p className="text-muted text-xs mb-3">Root folder where all your project folders are created.</p>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-hover border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors font-mono"
                        value={dirInput}
                        onChange={e => setDirInput(e.target.value)}
                      />
                      <button
                        onClick={handleSaveDir}
                        disabled={isPending}
                        className="bg-accent text-canvas border border-border rounded-lg px-5 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Email Integration */}
              <section className="mb-10">
                <h3 className="text-xs text-muted uppercase tracking-widest font-semibold mb-4">Email Integration (Resend)</h3>
                <div className="bg-hover border border-border rounded-2xl divide-y divide-[rgba(244,242,238,0.06)]">
                  <div className="p-5">
                    <label className="block text-primary text-sm font-medium mb-2">Resend API Key</label>
                    <input
                      type="password"
                      className="w-full bg-hover border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors font-mono mb-4"
                      value={emailSettings.apiKey}
                      onChange={e => setEmailSettings({ ...emailSettings, apiKey: e.target.value })}
                      placeholder="re_..."
                    />
                    <label className="block text-primary text-sm font-medium mb-2">From Email</label>
                    <input
                      className="w-full bg-hover border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors font-mono mb-4"
                      value={emailSettings.fromEmail}
                      onChange={e => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                      placeholder="notifications@yourdomain.com"
                    />
                    <button
                      onClick={async () => {
                        if (window.electron) {
                          await window.electron.updateEmailSettings(emailSettings.apiKey, emailSettings.fromEmail);
                          alert("Email settings saved!");
                          await loadDb();
                        }
                      }}
                      className="bg-accent text-canvas border border-border rounded-lg px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Save Email Settings
                    </button>
                  </div>
                </div>
              </section>

              {/* Application & Updates */}
              <section className="mb-10">
                <h3 className="text-xs text-muted uppercase tracking-widest font-semibold mb-4">Application</h3>
                <div className="bg-hover border border-border rounded-2xl divide-y divide-[rgba(244,242,238,0.06)]">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-primary text-sm font-medium">Theme</p>
                      <p className="text-muted text-xs mt-0.5">Choose your visual aesthetic</p>
                    </div>
                    <div className="flex bg-[rgba(244,242,238,0.03)] border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setTheme('light')}
                        className={`px-4 py-2 text-xs font-medium transition-colors ${theme === 'light' ? 'bg-primary text-canvas' : 'text-muted hover:text-primary'}`}
                      >
                        Light
                      </button>
                      <div className="w-px bg-border"></div>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`px-4 py-2 text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-primary text-canvas' : 'text-muted hover:text-primary'}`}
                      >
                        Dark
                      </button>
                      <div className="w-px bg-border"></div>
                      <button
                        onClick={() => setTheme('system')}
                        className={`px-4 py-2 text-xs font-medium transition-colors ${theme === 'system' ? 'bg-primary text-canvas' : 'text-muted hover:text-primary'}`}
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-primary text-sm font-medium">Version</p>
                      <p className="text-muted text-xs mt-0.5">v{appVersion || '1.0.0'}</p>
                    </div>
                    
                    {updaterStatus === 'idle' || updaterStatus === 'not-available' ? (
                      <button 
                        onClick={() => {
                          setUpdaterStatus('checking');
                          window.electron?.updater?.check();
                        }}
                        className="bg-hover text-muted border border-border rounded-lg px-4 py-2 text-xs font-medium hover:text-primary transition-colors cursor-pointer"
                      >
                        {updaterStatus === 'not-available' ? 'Up to date' : 'Check for Updates'}
                      </button>
                    ) : updaterStatus === 'checking' ? (
                      <div className="text-muted text-xs flex items-center gap-2">
                        <Icons.Search size={14} className="animate-pulse" /> Checking...
                      </div>
                    ) : updaterStatus === 'available' ? (
                      <a 
                        href="https://github.com/Aadi-Coder303/Forma-workspace/releases/latest"
                        target="_blank"
                        rel="noreferrer"
                        className="bg-accent text-canvas border border-border rounded-lg px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Download Update
                      </a>
                    ) : updaterStatus === 'downloading' ? (
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-sidebar rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                        </div>
                        <span className="text-muted text-xs w-8 text-right">{Math.round(downloadProgress)}%</span>
                      </div>
                    ) : updaterStatus === 'downloaded' ? (
                      <button 
                        onClick={() => window.electron?.updater?.install()}
                        className="bg-accent text-canvas border border-border rounded-lg px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer animate-pulse"
                      >
                        Restart to Update
                      </button>
                    ) : updaterStatus === 'error' ? (
                      <div className="text-accent text-xs max-w-[150px] truncate" title={updaterError}>
                        Update Error
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              {/* Data */}
              <section className="mb-10">
                <h3 className="text-xs text-muted uppercase tracking-widest font-semibold mb-4">Data</h3>
                <div className="bg-hover border border-border rounded-2xl divide-y divide-[rgba(244,242,238,0.06)]">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-primary text-sm font-medium">Projects</p>
                      <p className="text-muted text-xs mt-0.5">{safeDb.projects.length} total</p>
                    </div>
                    <Icons.Projects size={18} className="text-muted" />
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-primary text-sm font-medium">Notes</p>
                      <p className="text-muted text-xs mt-0.5">{safeNotes.length} total</p>
                    </div>
                    <Icons.Notes size={18} className="text-muted" />
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-primary text-sm font-medium">Team Members</p>
                      <p className="text-muted text-xs mt-0.5">{safeTeam.length} total</p>
                    </div>
                    <Icons.Team size={18} className="text-muted" />
                  </div>
                </div>
              </section>

              {/* Legal & Privacy */}
              <section className="mb-10">
                <h3 className="text-xs text-muted uppercase tracking-widest font-semibold mb-4">Legal & Privacy</h3>
                <div className="bg-hover border border-border rounded-2xl divide-y divide-[rgba(244,242,238,0.06)]">
                  <div className="p-5 flex items-center justify-between group cursor-pointer hover:bg-hover/80 transition-colors" onClick={() => setLegalDoc('terms')}>
                    <div>
                      <p className="text-primary text-sm font-medium">Terms of Use</p>
                      <p className="text-muted text-xs mt-0.5">Rules and guidelines for using Forma Workspace</p>
                    </div>
                    <Icons.ChevronRight size={16} className="text-muted group-hover:text-accent transition-colors" />
                  </div>
                  <div className="p-5 flex items-center justify-between group cursor-pointer hover:bg-hover/80 transition-colors" onClick={() => setLegalDoc('privacy')}>
                    <div>
                      <p className="text-primary text-sm font-medium">Privacy Policy</p>
                      <p className="text-muted text-xs mt-0.5">How your data is handled locally</p>
                    </div>
                    <Icons.ChevronRight size={16} className="text-muted group-hover:text-accent transition-colors" />
                  </div>
                  <div className="p-5 flex items-center justify-between group cursor-pointer hover:bg-hover/80 transition-colors" onClick={() => setLegalDoc('data')}>
                    <div>
                      <p className="text-primary text-sm font-medium">Data Compliance</p>
                      <p className="text-muted text-xs mt-0.5">Information on GDPR, CCPA, and data sovereignty</p>
                    </div>
                    <Icons.ChevronRight size={16} className="text-muted group-hover:text-accent transition-colors" />
                  </div>
                </div>
              </section>

              {/* About */}
              <section>
                <h3 className="text-xs text-muted uppercase tracking-widest font-semibold mb-4">About</h3>
                <div className="bg-hover border border-border rounded-2xl divide-y divide-[rgba(244,242,238,0.06)]">
                  <div className="p-5 flex items-center justify-between">
                    <p className="text-muted text-sm">Version</p>
                    <p className="text-primary text-sm font-mono">{appVersion || '1.0.0'}</p>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <p className="text-muted text-sm">App</p>
                    <p className="text-primary text-sm">Forma Workspace</p>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-primary text-sm font-medium">App Tour</p>
                      <p className="text-muted text-xs mt-0.5">Walk through every feature step by step</p>
                    </div>
                    <button
                      onClick={() => setShowTour(true)}
                      className="text-xs bg-accent text-canvas px-4 py-2 rounded-lg hover:bg-[#a65123] transition-colors cursor-pointer font-medium"
                    >
                      Take the Tour
                    </button>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    <a
                      href="https://formadigital.in"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent text-sm hover:underline"
                    >
                      Visit formadigital.in →
                    </a>
                    <button
                      onClick={() => alert("The support ticketing portal is coming in a future update!")}
                      className="text-muted text-sm hover:text-accent transition-colors text-left"
                    >
                      Report a bug (Coming Soon) →
                    </button>
                  </div>
                </div>

                <div className="bg-hover border border-border rounded-2xl overflow-hidden mt-6">
                  <div className="p-5 border-b border-border flex justify-between items-center">
                    <h3 className="text-primary font-medium">Checklist Templates</h3>
                    <button
                      onClick={() => setShowNewTemplateModal(true)}
                      className="text-xs bg-card text-primary px-3 py-1.5 rounded-lg font-medium cursor-pointer hover:bg-border transition-colors"
                    >
                      + New Template
                    </button>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    {safeDb.templates?.length === 0 ? (
                      <p className="text-muted text-sm">No templates defined.</p>
                    ) : (
                      safeDb.templates?.map(t => (
                        <div key={t.id} className="flex justify-between items-center text-sm border border-border rounded-lg p-3">
                          <div>
                            <span className="text-primary font-medium block">{t.name}</span>
                            <span className="text-muted text-xs">{t.phases.length} phases</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingTemplate(JSON.parse(JSON.stringify(t)))}
                              className="px-3 py-1 text-xs bg-hover text-primary rounded border border-border hover:border-accent transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(t.id)}
                              className="px-3 py-1 text-xs bg-hover text-red-400 rounded border border-border hover:border-red-400/50 transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          </main>
        )}
      </div>

      {showWizard && (
        <NewProjectWizard
          clients={safeDb.clients}
          templates={safeDb.templates || []}
          onClose={() => setShowWizard(false)}
          onSubmit={handleCreateProject}
        />
      )}

      {/* ── Walkthrough Overlay ── */}
      {showTour && (
        <WalkthroughOverlay
          onClose={() => {
            setShowTour(false);
            localStorage.setItem('forma-tour-done', '1');
          }}
          onTabChange={(tab) => setActiveTab(tab as Tab)}
        />
      )}

      {/* ── Command Palette ── */}
      {searchOpen && (
        <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
          <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate/20" onClick={e => e.stopPropagation()}>
            <div className="flex items-center px-4 border-b border-slate/20">
              <Icons.Search size={18} className="text-muted" />
              <input
                autoFocus
                className="w-full bg-transparent px-4 py-4 text-primary outline-none text-lg font-body placeholder:text-muted"
                placeholder="Search projects, clients, notes… (Esc to close)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && (() => { setSearchOpen(false); setSearchQuery(''); })()}
              />
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              {(() => {
                const lowerSearch = searchQuery.toLowerCase();
                const pResults = safeDb.projects.filter(p => p.name.toLowerCase().includes(lowerSearch));
                const cResults = safeClients.filter(c => c.name.toLowerCase().includes(lowerSearch));
                const nResults = safeNotes.filter(n => n.title.toLowerCase().includes(lowerSearch) || n.content.toLowerCase().includes(lowerSearch));
                
                return (
                  <>
                    {pResults.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Projects</div>
                        {pResults.slice().reverse().map(p => (
                          <Link key={p.id} href={`/project?id=${p.id}`} onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                            <div className="px-3 py-2.5 hover:bg-hover rounded-lg cursor-pointer flex items-center gap-3 text-primary transition-colors">
                              <Icons.Projects size={15} className="text-accent" />
                              <span className="text-sm">{p.name}</span>
                            </div>
                          </Link>
                        ))}
                      </>
                    )}
                    {cResults.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider mt-1">Clients</div>
                        {cResults.slice().reverse().map(c => (
                          <div key={c.id} onClick={() => { setActiveTab('Clients'); setSearchOpen(false); setSearchQuery(''); }} className="px-3 py-2.5 hover:bg-hover rounded-lg cursor-pointer flex items-center gap-3 text-primary transition-colors">
                            <Icons.Team size={15} className="text-[#8b5cf6]" />
                            <span className="text-sm">{c.name}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {nResults.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider mt-1">Notes</div>
                        {nResults.slice().reverse().map(n => (
                          <div key={n.id} onClick={() => { setActiveTab('Notes'); handleSelectNote(n); setSearchOpen(false); setSearchQuery(''); }} className="px-3 py-2.5 hover:bg-hover rounded-lg cursor-pointer flex items-center gap-3 text-primary transition-colors">
                            <Icons.Notes size={15} className="text-accent" />
                            <span className="text-sm">{n.title}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {pResults.length === 0 && cResults.length === 0 && nResults.length === 0 && (
                      <div className="px-3 py-4 text-sm text-muted text-center">Nothing found for "{searchQuery}"</div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Shortcuts Modal ── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShortcutsModal(false)}>
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-medium text-primary">Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcutsModal(false)} className="text-muted hover:text-primary">
                <Icons.Search size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <h3 className="text-xs text-muted uppercase tracking-widest font-semibold mb-4">Navigation</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center"><span className="text-primary">Projects</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ 1</kbd></li>
                  <li className="flex justify-between items-center"><span className="text-primary">Clients</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ 2</kbd></li>
                  <li className="flex justify-between items-center"><span className="text-primary">Team</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ 3</kbd></li>
                  <li className="flex justify-between items-center"><span className="text-primary">Notes</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ 4</kbd></li>
                  <li className="flex justify-between items-center"><span className="text-primary">Today</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ 5</kbd></li>
                  <li className="flex justify-between items-center"><span className="text-primary">Command Palette</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ K</kbd></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xs text-muted uppercase tracking-widest font-semibold mb-4">Application</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center"><span className="text-primary">New Project</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ N</kbd></li>
                  <li className="flex justify-between items-center"><span className="text-primary">Preferences</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ ,</kbd></li>
                  <li className="flex justify-between items-center"><span className="text-primary">Toggle Sidebar</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ ⇧ S</kbd></li>
                  <li className="flex justify-between items-center"><span className="text-primary">Collapse Sidebar</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ ⇧ [</kbd></li>
                  <li className="flex justify-between items-center"><span className="text-primary">Toggle Theme</span> <kbd className="font-mono text-muted bg-hover px-2 py-0.5 rounded border border-border">⌘ ⇧ L</kbd></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 text-center text-xs text-faint">
              Press <kbd className="font-mono bg-hover px-1 rounded">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}

      {legalDoc && (
        <LegalModal docType={legalDoc} onClose={() => setLegalDoc(null)} />
      )}
        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Bug size={18} className="text-accent" />
                  <h2 className="font-display font-medium text-primary">Report a Bug / Feedback</h2>
                </div>
                <button onClick={() => setShowFeedbackModal(false)} className="text-muted hover:text-primary transition-colors cursor-pointer p-1">
                  <Icons.Close size={16} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-muted mb-4">
                  Found a bug or have a feature request? Let us know! Your app version and basic OS diagnostics will be automatically included.
                </p>
                <textarea
                  className="w-full bg-hover border border-border rounded-lg px-4 py-3 text-sm text-primary outline-none focus:border-accent transition-colors resize-none h-32 mb-2"
                  placeholder="Describe the issue or feedback..."
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  disabled={feedbackSending}
                />
                {!emailSettings.apiKey && (
                  <p className="text-xs text-amber-400 mb-2">⚠️ You need to configure your Resend API Key in Settings first.</p>
                )}
              </div>
              <div className="px-6 py-4 bg-hover border-t border-border flex justify-end gap-3">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 text-sm text-muted hover:text-primary transition-colors cursor-pointer"
                  disabled={feedbackSending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackSending || !feedbackText.trim()}
                  className="px-5 py-2 text-sm font-medium bg-accent text-canvas rounded-lg hover:bg-[#a65123] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {feedbackSending ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* New Template Modal */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-display font-medium text-primary">New Template</h2>
              <button onClick={() => setShowNewTemplateModal(false)} className="text-muted hover:text-primary transition-colors cursor-pointer">
                <Icons.Close size={16} />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">Template Name</label>
              <input
                className="w-full bg-hover border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors"
                placeholder="e.g. Web App Starter"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateTemplateSubmit();
                  if (e.key === 'Escape') setShowNewTemplateModal(false);
                }}
              />
            </div>
            <div className="px-6 py-4 bg-hover border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowNewTemplateModal(false)} className="px-4 py-2 text-sm text-muted hover:text-primary cursor-pointer">Cancel</button>
              <button
                onClick={handleCreateTemplateSubmit}
                disabled={!newTemplateName.trim()}
                className="px-5 py-2 text-sm font-medium bg-accent text-canvas rounded-lg hover:bg-[#a65123] transition-colors cursor-pointer disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex-1">
                <input
                  className="bg-transparent text-xl font-display font-medium text-primary outline-none border-b border-transparent focus:border-border w-full transition-colors"
                  value={editingTemplate.name}
                  onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Template Name"
                />
              </div>
              <button onClick={() => setEditingTemplate(null)} className="text-muted hover:text-primary transition-colors cursor-pointer p-2">
                <Icons.Close size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-hover">
              <div className="space-y-6">
                {editingTemplate.phases.map((phase, pIdx) => (
                  <div key={phase.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-[rgba(244,242,238,0.02)] flex items-center gap-3">
                      <div className="cursor-move text-muted/50"><Icons.MoreVertical size={14} /></div>
                      <input
                        className="flex-1 bg-transparent text-sm font-medium text-primary outline-none"
                        value={phase.name}
                        onChange={e => {
                          const newPhases = [...editingTemplate.phases];
                          newPhases[pIdx].name = e.target.value;
                          setEditingTemplate({ ...editingTemplate, phases: newPhases });
                        }}
                        placeholder="Phase Name"
                      />
                      <button
                        onClick={() => {
                          const newPhases = editingTemplate.phases.filter((_, i) => i !== pIdx);
                          setEditingTemplate({ ...editingTemplate, phases: newPhases });
                        }}
                        className="text-muted hover:text-red-400 p-1 cursor-pointer transition-colors"
                      >
                        <Icons.Close size={14} />
                      </button>
                    </div>
                    <div className="p-3">
                      {phase.items.map((item, iIdx) => (
                        <div key={item.id} className="flex items-center gap-3 py-1.5 px-2 hover:bg-hover rounded group">
                          <div className="cursor-move text-muted/30 opacity-0 group-hover:opacity-100 transition-opacity"><Icons.MoreVertical size={12} /></div>
                          <div className="w-4 h-4 rounded border-2 border-border flex items-center justify-center shrink-0"></div>
                          <input
                            className="flex-1 bg-transparent text-sm text-primary outline-none focus:border-b focus:border-border"
                            value={item.title}
                            onChange={e => {
                              const newPhases = [...editingTemplate.phases];
                              newPhases[pIdx].items[iIdx].title = e.target.value;
                              setEditingTemplate({ ...editingTemplate, phases: newPhases });
                            }}
                            placeholder="Task title"
                          />
                          <button
                            onClick={() => {
                              const newPhases = [...editingTemplate.phases];
                              newPhases[pIdx].items = newPhases[pIdx].items.filter((_, i) => i !== iIdx);
                              setEditingTemplate({ ...editingTemplate, phases: newPhases });
                            }}
                            className="text-muted hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                          >
                            <Icons.Close size={12} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newPhases = [...editingTemplate.phases];
                          newPhases[pIdx].items.push({ id: crypto.randomUUID(), title: '', isCompleted: false });
                          setEditingTemplate({ ...editingTemplate, phases: newPhases });
                        }}
                        className="mt-2 text-xs text-muted hover:text-primary flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
                      >
                        <Icons.Plus size={12} /> Add Task
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    setEditingTemplate({
                      ...editingTemplate,
                      phases: [...editingTemplate.phases, { id: crypto.randomUUID(), name: 'New Phase', items: [] }]
                    });
                  }}
                  className="w-full py-4 border-2 border-dashed border-border rounded-xl text-sm text-muted hover:text-primary hover:border-accent/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icons.Plus size={16} /> Add Phase
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border bg-card flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 text-sm text-muted hover:text-primary cursor-pointer transition-colors">Cancel</button>
              <button
                onClick={handleSaveEditedTemplate}
                className="px-6 py-2 text-sm font-medium bg-accent text-canvas rounded-lg hover:bg-[#a65123] transition-colors cursor-pointer"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
