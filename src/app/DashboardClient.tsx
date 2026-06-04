'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DBData, Note, TeamMember, Client } from '@/lib/db';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import ClientsTab from '@/components/ClientsTab';
import WalkthroughOverlay from '@/components/WalkthroughOverlay';
import NewProjectWizard from '@/components/NewProjectWizard';
import InvoicesTab from '@/components/InvoicesTab';
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

  // Sidebar state
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Command Palette state
  const [searchQuery, setSearchQuery] = useState('');

  // Today state
  const [todayFocus, setTodayFocus] = useState('');
  const [focusSaved, setFocusSaved] = useState(false);

  // Archive state
  const [showArchived, setShowArchived] = useState(false);

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
        setTodayFocus(data.todayFocus || '');
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
        setShowWizard(true);
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
        if (action === 'new-project') setShowWizard(true);
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
          // Let's just download it right away since the user wanted it
          window.electron.updater.download();
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
  const handleSaveDir = async () => {
    if (!window.electron) return;
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

  const handleCreateTemplate = async () => {
    if (!window.electron) return;
    const name = prompt('Template Name (e.g. Web App Starter):');
    if (!name) return;
    
    // Example default phases
    const defaultPhases = [
      { name: 'Discovery', items: [{ title: 'Kickoff Call', subtasks: [] }] },
      { name: 'Design', items: [{ title: 'Wireframes', subtasks: [] }] },
      { name: 'Development', items: [{ title: 'Setup Repo', subtasks: [] }] }
    ];
    
    await window.electron.createTemplate({ name, phases: defaultPhases });
    await loadDb();
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
    await window.electron.createTeamMember(newMember.name, newMember.role, newMember.email, newMember.color);
    setNewMember({ name: '', role: '', email: '', color: MEMBER_COLORS[0] });
    setShowAddMember(false);
    await loadDb();
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.electron) return;
    await window.electron.deleteTeamMember(memberId);
    await loadDb();
  };

  // ─── Today ─────────────────────────────────────────────────────────────────
  const handleSaveFocus = async () => {
    if (!window.electron) return;
    await window.electron.setTodayFocus(todayFocus);
    setFocusSaved(true);
    setTimeout(() => setFocusSaved(false), 2000);
  };

  // ─── Render guards ─────────────────────────────────────────────────────────
  // Normalise: old projects.json may not have notes / team / todayFocus
  const safeDb = db
    ? { ...db, notes: db.notes ?? [], team: db.team ?? [], todayFocus: db.todayFocus ?? '' }
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
              onClick={() => alert("The support ticketing portal is coming in a future update!")}
              title="Report a Bug (Coming Soon)"
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
                      onClick={() => setShowWizard(true)}
                      className="flex-1 bg-accent text-canvas rounded-lg py-2.5 text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer shadow-sm"
                    >
                      + New Project
                    </button>
                  </div>
                </div>
              </div>

              {/* Workspace Dir */}
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
                  <div className="relative">
                    <textarea
                      value={todayFocus}
                      onChange={e => setTodayFocus(e.target.value)}
                      placeholder="What is the one thing you need to accomplish today?"
                      className="w-full bg-hover border border-border rounded-xl p-5 text-sm text-primary outline-none focus:border-accent transition-colors resize-none h-40 font-body leading-relaxed"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-3">
                      {focusSaved && <span className="text-xs text-accent animate-fade-in">Saved</span>}
                      <button
                        onClick={handleSaveFocus}
                        className="bg-accent text-canvas px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-[#a65123] transition-colors cursor-pointer"
                      >
                        Commit
                      </button>
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
          <main className="flex-1 overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-2xl text-primary font-medium">Your Team</h2>
                <p className="text-muted text-sm mt-1">{safeTeam.length} collaborator{safeTeam.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => setShowAddMember(true)}
                className="bg-accent text-canvas px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer flex items-center gap-2"
              >
                <Icons.Plus size={14} />
                Add Member
              </button>
            </div>

            {/* Add member form */}
            {showAddMember && (
              <div className="bg-hover border border-border rounded-2xl p-6 mb-8">
                <h3 className="font-display text-lg text-primary mb-4">Add a Collaborator</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    className="bg-hover border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors"
                    placeholder="Full Name *"
                    value={newMember.name}
                    onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))}
                  />
                  <input
                    className="bg-hover border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors"
                    placeholder="Role (e.g. Designer)"
                    value={newMember.role}
                    onChange={e => setNewMember(m => ({ ...m, role: e.target.value }))}
                  />
                  <input
                    className="bg-hover border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors"
                    placeholder="Email"
                    type="email"
                    value={newMember.email}
                    onChange={e => setNewMember(m => ({ ...m, email: e.target.value }))}
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-muted text-xs">Colour:</span>
                    <div className="flex gap-2">
                      {MEMBER_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewMember(m => ({ ...m, color: c }))}
                          className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${newMember.color === c ? 'scale-125 ring-2 ring-mist ring-offset-1 ring-offset-ink' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowAddMember(false)} className="text-muted text-sm hover:text-primary cursor-pointer px-4 py-2">Cancel</button>
                  <button
                    onClick={handleAddMember}
                    disabled={!newMember.name}
                    className="bg-accent text-canvas px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {safeTeam.length === 0 ? (
              <div className="border border-dashed border-border rounded-2xl py-16 flex flex-col items-center justify-center text-muted">
                <Icons.Team size={32} className="mb-4 opacity-50" />
                <p>No collaborators yet.</p>
                <p className="text-xs mt-1 opacity-70">Add your first team member above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {safeTeam.map((member: TeamMember) => {
                  const activeTasks = safeDb.projects.flatMap(p => 
                    p.phases.flatMap(ph => 
                      ph.checklist.filter(i => i.assigneeId === member.id && !i.isCompleted)
                    )
                  ).length;

                  return (
                    <div key={member.id} className="group bg-hover border border-border rounded-xl p-5 flex items-start gap-4 hover:border-border transition-colors relative">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary font-display font-bold text-sm shrink-0" style={{ backgroundColor: member.color }}>
                        {member.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-primary font-medium truncate">{member.name}</p>
                        <p className="text-muted text-xs mt-0.5">{member.role || 'No role set'}</p>
                        {member.email && (
                          <a href={`mailto:${member.email}`} className="text-xs text-accent hover:underline mt-1 block truncate">{member.email}</a>
                        )}
                        <p className="text-xs text-muted mt-2">
                          <span className={activeTasks > 0 ? 'text-accent font-medium' : ''}>{activeTasks}</span> active task{activeTasks !== 1 && 's'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-accent cursor-pointer"
                      >
                        <Icons.Close size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
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
                    ) : updaterStatus === 'downloading' || updaterStatus === 'available' ? (
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
                      onClick={handleCreateTemplate}
                      className="text-xs bg-card text-primary px-3 py-1.5 rounded-lg font-medium"
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
                          <span className="text-primary">{t.name}</span>
                          <span className="text-muted text-xs">{t.phases.length} phases</span>
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
      </div>
    </div>
  );
}
