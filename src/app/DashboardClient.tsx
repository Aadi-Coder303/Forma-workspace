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

  // Command Palette state
  const [searchQuery, setSearchQuery] = useState('');

  // Today state
  const [todayFocus, setTodayFocus] = useState('');
  const [focusSaved, setFocusSaved] = useState(false);

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
      
      if ((e.metaKey || e.ctrlKey) && e.key === '1') { e.preventDefault(); setActiveTab('Today'); }
      if ((e.metaKey || e.ctrlKey) && e.key === '2') { e.preventDefault(); setActiveTab('Projects'); }
      if ((e.metaKey || e.ctrlKey) && e.key === '3') { e.preventDefault(); setActiveTab('Clients'); }
      if ((e.metaKey || e.ctrlKey) && e.key === '4') { e.preventDefault(); setActiveTab('Invoices'); }
      if ((e.metaKey || e.ctrlKey) && e.key === '5') { e.preventDefault(); setActiveTab('Settings'); }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowWizard(true);
      }

      if (e.key === 'Escape') {
        setSearchOpen(false);
        setShowWizard(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Updater events
    let unsubs: (() => void)[] = [];
    if (window.electron && window.electron.updater) {
      window.electron.updater.getVersion().then(setAppVersion).catch(() => {});
      
      unsubs = [
        window.electron.updater.onEvent('updater:update-available', () => {
          setUpdaterStatus('available');
          // auto download is false, so we trigger download when user clicks a button, or we can just download right away
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
    const id = await window.electron.createProject(projectData);
    router.push(`/project?id=${id}`);
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

  const handleImportProject = async () => {
    if (!window.electron) return;
    setIsPending(true);
    try {
      setError('');
      const id = await window.electron.importProject();
      if (id) {
        await loadDb();
        router.push(`/project?id=${id}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
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
      <div className="flex-1 flex items-center justify-center text-slate font-body text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-ember border-t-transparent rounded-full animate-spin" />
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
  const [showArchived, setShowArchived] = useState(false);
  const activeProjects = safeDb.projects.filter(p => showArchived ? p.status === 'archived' : p.status !== 'archived');
  const recentProjects = safeDb.projects.filter(p => p.status !== 'archived').slice().reverse().slice(0, 5);

  return (
    <div className="flex flex-col w-full h-full bg-ink font-body">

      {/* ── Native Title Bar ── */}
      <div 
        style={{ WebkitAppRegion: 'drag' } as any} 
        className="h-10 shrink-0 flex items-center justify-between px-20"
      >
        <div className="flex items-center gap-4">
          <div style={{ WebkitAppRegion: 'no-drag' } as any} className="flex items-center gap-1">
            <button onClick={() => router.back()} className="text-slate hover:text-mist transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer">
              <Icons.ChevronLeft size={16} />
            </button>
            <button onClick={() => router.forward()} className="text-slate hover:text-mist transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer">
              <Icons.ChevronRight size={16} />
            </button>
          </div>
          <span className="text-slate text-xs font-medium tracking-wide">Forma Workspace</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Nav Rail / Sidebar ── */}
        <nav 
          data-tour="nav-rail" 
          className={`border-r border-[rgba(244,242,238,0.08)] flex flex-col py-6 shrink-0 transition-all duration-300 ${isSidebarExpanded ? 'w-56 px-4 items-stretch' : 'w-20 items-center'}`}
        >
          <div className={`mb-10 flex ${isSidebarExpanded ? 'justify-start px-2' : 'justify-center'} items-center`}>
            <div className="w-10 h-10 bg-ember rounded-xl flex items-center justify-center font-display font-bold text-mist text-lg shadow-lg shrink-0">
              F
            </div>
            {isSidebarExpanded && <span className="ml-3 font-display font-bold text-mist text-lg">Forma</span>}
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
                  className={`p-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center'} ${activeTab === tab ? 'bg-[rgba(244,242,238,0.1)] text-ember' : 'text-slate hover:text-mist hover:bg-[rgba(244,242,238,0.05)]'}`}
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
              className={`p-3 rounded-xl text-slate hover:text-mist hover:bg-[rgba(244,242,238,0.05)] transition-all duration-200 cursor-pointer flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}
            >
              {isSidebarExpanded ? <Icons.ArrowLeft size={20} strokeWidth={2} className="shrink-0" /> : <Icons.ChevronRight size={20} strokeWidth={2} className="shrink-0" />}
              {isSidebarExpanded && <span className="text-sm font-medium">Collapse</span>}
            </button>
            <button
              data-tour="search-btn"
              onClick={() => setSearchOpen(true)}
              title="Search  ⌘K"
              className={`p-3 rounded-xl text-slate hover:text-mist hover:bg-[rgba(244,242,238,0.05)] transition-all duration-200 cursor-pointer flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}
            >
              <Icons.Search size={20} strokeWidth={2} className="shrink-0" />
              {isSidebarExpanded && <span className="text-sm font-medium">Search</span>}
            </button>
            <button
              data-tour="tab-settings"
              onClick={() => setActiveTab('Settings')}
              title="Settings"
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center'} ${activeTab === 'Settings' ? 'bg-[rgba(244,242,238,0.1)] text-ember' : 'text-slate hover:text-mist hover:bg-[rgba(244,242,238,0.05)]'}`}
            >
              <Icons.Settings size={20} strokeWidth={activeTab === 'Settings' ? 2.5 : 2} className="shrink-0" />
              {isSidebarExpanded && <span className="text-sm font-medium">Settings</span>}
            </button>
            <button
              onClick={() => alert("The support ticketing portal is coming in a future update!")}
              title="Report a Bug (Coming Soon)"
              className={`p-3 rounded-xl text-slate hover:text-ember hover:bg-[rgba(199,98,42,0.1)] transition-all duration-200 cursor-pointer flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}
            >
              <Icons.Bug size={20} className="shrink-0" />
              {isSidebarExpanded && <span className="text-sm font-medium text-left">Report Bug</span>}
            </button>
          </div>
        </nav>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-8 border-b border-[rgba(244,242,238,0.08)]">
          <h1 className="font-display text-xl tracking-wide text-mist font-medium">{activeTab}</h1>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-slate hover:text-mist transition-colors duration-200 cursor-pointer text-sm bg-[rgba(244,242,238,0.05)] px-3 py-1.5 rounded-lg border border-[rgba(244,242,238,0.05)]"
          >
            <Icons.Search size={14} />
            <span>Search…</span>
            <kbd className="ml-4 font-mono text-xs bg-[rgba(244,242,238,0.1)] px-1.5 py-0.5 rounded">⌘ K</kbd>
          </button>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-8 mt-4 bg-[rgba(199,98,42,0.1)] border border-ember text-ember px-4 py-3 rounded-lg text-sm flex items-center gap-2 shrink-0">
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
              <div data-tour="new-project" className="bg-mist text-ink rounded-2xl p-6 shadow-sm border border-[rgba(26,26,46,0.05)]">
                <div className="flex items-center gap-2 mb-4">
                  <Icons.Plus size={18} strokeWidth={2.5} className="text-ember" />
                  <h2 className="font-display font-bold text-lg">New Project</h2>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={handleImportProject}
                      disabled={isPending}
                      title="Pick an existing folder on disk"
                      className="flex-1 flex items-center justify-center gap-2 border border-[rgba(26,26,46,0.15)] text-slate hover:text-ink hover:border-[rgba(26,26,46,0.3)] rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
                    >
                      <Icons.FolderOpen size={15} />
                      Import Existing
                    </button>
                    <button
                      onClick={() => setShowWizard(true)}
                      className="flex-1 bg-ember text-mist rounded-lg py-2.5 text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer shadow-sm"
                    >
                      + New Project
                    </button>
                  </div>
                </div>
              </div>

              {/* Workspace Dir */}
              <div className="bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2 text-mist">
                  <Icons.Projects size={18} className="text-slate" />
                  <h2 className="font-display font-medium text-lg">Local Directory</h2>
                </div>
                <p className="text-slate text-sm mb-4">Where your project folders live on disk.</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-lg px-4 py-2.5 text-sm text-mist outline-none focus:border-moss transition-colors font-mono"
                    value={dirInput}
                    onChange={e => setDirInput(e.target.value)}
                    placeholder="/Users/you/Projects"
                  />
                  <button
                    onClick={handlePickFolder}
                    title="Browse for folder"
                    className="bg-[rgba(244,242,238,0.07)] hover:bg-[rgba(244,242,238,0.12)] text-mist border border-[rgba(244,242,238,0.1)] rounded-lg px-3 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Icons.FolderOpen size={15} />
                    Browse
                  </button>
                  <button
                    onClick={handleSaveDir}
                    disabled={isPending}
                    className="bg-[rgba(244,242,238,0.1)] hover:bg-[rgba(244,242,238,0.15)] text-mist border border-[rgba(244,242,238,0.1)] rounded-lg px-4 text-sm font-medium transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl text-mist">Active Projects</h2>
              <span className="text-sm text-slate">{safeDb.projects.length} project{safeDb.projects.length !== 1 ? 's' : ''}</span>
            </div>

            {safeDb.projects.length === 0 ? (
              <div className="border border-dashed border-[rgba(244,242,238,0.1)] rounded-2xl py-16 flex flex-col items-center justify-center text-slate">
                <Icons.Projects size={32} className="mb-4 opacity-50" />
                <p>No active projects yet.</p>
                <p className="text-xs mt-1 opacity-70">Create one above or press ⌘K</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {activeProjects.slice().reverse().map(project => (
                  <div key={project.id} className="group bg-mist rounded-xl p-5 border border-[rgba(26,26,46,0.05)] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-moss opacity-80" />
                    <div className="flex justify-between items-start mb-4 mt-1">
                      <Link href={`/project?id=${project.id}`} className="hover:text-ember transition-colors">
                        <h3 className="font-display font-bold text-ink text-xl line-clamp-1">{project.name}</h3>
                      </Link>
                      <div className="flex items-center justify-end">
                        {showArchived ? (
                          <button onClick={() => {
                            if(window.electron) {
                              window.electron.updateProject(project.id, { status: 'active' }).then(() => loadDb());
                            }
                          }} className="text-slate hover:text-moss transition-colors cursor-pointer p-1 -mr-1" title="Restore">
                            <Icons.FolderOpen size={16} />
                          </button>
                        ) : (
                          <button onClick={() => {
                            if(window.electron) {
                              window.electron.updateProject(project.id, { status: 'archived' }).then(() => loadDb());
                            }
                          }} className="text-slate hover:text-ember transition-colors cursor-pointer p-1 -mr-1" title="Archive">
                            <Icons.Close size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate font-mono mb-6 truncate" title={project.folderPath}>
                      {project.folderPath.split('/').slice(-2).join('/')}
                    </p>
                    <div className="mt-auto flex justify-between items-center border-t border-[rgba(26,26,46,0.05)] pt-4">
                      <div className="flex items-center gap-1.5 text-moss text-xs font-medium">
                        <div className={`w-2 h-2 rounded-full ${showArchived ? 'bg-slate' : 'bg-moss animate-pulse'}`} />
                        {showArchived ? 'Archived' : 'Active'}
                      </div>
                      <Link href={`/project?id=${project.id}`} className="text-ember hover:text-ink text-sm font-medium flex items-center gap-1 transition-colors cursor-pointer">
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
              <p className="text-slate text-sm mb-1">{today}</p>
              <h2 className="font-display text-3xl text-mist font-medium mb-8">Good morning.</h2>
              
              {deadlineAlerts.length > 0 && (
                <div className="mb-8 flex flex-col gap-3">
                  {deadlineAlerts.map(alert => {
                    const isOverdue = alert.daysDiff < 0;
                    return (
                      <div key={alert.project.id} className={`p-4 rounded-xl border flex items-center justify-between ${isOverdue ? 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]' : 'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]'}`}>
                        <div className="flex flex-col">
                          <span className={`font-medium ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                            {isOverdue ? '⚠️ Overdue Project' : '⏳ Upcoming Deadline'}
                          </span>
                          <span className="text-mist text-sm mt-1">{alert.project.name} is {isOverdue ? `overdue by ${Math.abs(alert.daysDiff)} days` : `due in ${alert.daysDiff} days`}</span>
                        </div>
                        <button 
                          onClick={() => { setActiveTab('Projects'); router.push(`/project?id=${alert.project.id}`); }} 
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isOverdue ? 'bg-[rgba(239,68,68,0.2)] text-red-300 hover:bg-[rgba(239,68,68,0.3)]' : 'bg-[rgba(245,158,11,0.2)] text-amber-300 hover:bg-[rgba(245,158,11,0.3)]'}`}
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
                  <h3 className="text-mist font-medium mb-3">Today's Focus</h3>
                  <div className="relative">
                    <textarea
                      value={todayFocus}
                      onChange={e => setTodayFocus(e.target.value)}
                      placeholder="What is the one thing you need to accomplish today?"
                      className="w-full bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-xl p-5 text-sm text-mist outline-none focus:border-ember transition-colors resize-none h-40 font-body leading-relaxed"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-3">
                      {focusSaved && <span className="text-xs text-moss animate-fade-in">Saved</span>}
                      <button
                        onClick={handleSaveFocus}
                        className="bg-ember text-mist px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-[#a65123] transition-colors cursor-pointer"
                      >
                        Commit
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-mist font-medium mb-3">Due Soon</h3>
                  <div className="bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-xl p-5 flex flex-col gap-3 min-h-[10rem]">
                    {safeDb.projects.filter(p => p.deadline && p.status !== 'completed' && p.status !== 'archived').length === 0 ? (
                      <p className="text-slate text-sm">No projects have upcoming deadlines.</p>
                    ) : (
                      safeDb.projects
                        .filter(p => p.deadline && p.status !== 'completed' && p.status !== 'archived')
                        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
                        .slice(0, 5)
                        .map(p => (
                          <Link key={p.id} href={`/project?id=${p.id}`} className="flex justify-between items-center p-3 border border-[rgba(244,242,238,0.05)] rounded-lg hover:border-ember transition-colors">
                            <span className="text-mist text-sm font-medium">{p.name}</span>
                            <span className="text-xs text-slate">{new Date(p.deadline!).toLocaleDateString()}</span>
                          </Link>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-mist">Recent Projects</h3>
              <button onClick={() => setActiveTab('Projects')} className="text-xs text-ember hover:underline cursor-pointer">View all →</button>
            </div>
            {recentProjects.length === 0 ? (
              <p className="text-slate text-sm">No projects yet. <button className="text-ember hover:underline cursor-pointer" onClick={() => setActiveTab('Projects')}>Create one.</button></p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentProjects.map(p => (
                  <Link key={p.id} href={`/project?id=${p.id}`}>
                    <div className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[rgba(244,242,238,0.04)] transition-colors group cursor-pointer">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(199,98,42,0.15)] flex items-center justify-center">
                        <Icons.Projects size={14} className="text-ember" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-mist text-sm font-medium truncate">{p.name}</p>
                        <p className="text-slate text-xs truncate">{p.folderPath}</p>
                      </div>
                      <Icons.ChevronRight size={14} className="text-slate group-hover:text-ember transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Activity Log */}
            <div className="mt-12 mb-4">
              <h3 className="font-display text-lg text-mist">Recent Activity</h3>
            </div>
            {(!safeDb.activityLog || safeDb.activityLog.length === 0) ? (
              <p className="text-slate text-sm">No activity recorded yet.</p>
            ) : (
              <div className="flex flex-col">
                {safeDb.activityLog.slice(0, 10).map((activity, index) => (
                  <div key={activity.id} className="relative flex gap-4 pb-6">
                    {/* Timeline line */}
                    {index !== Math.min(safeDb.activityLog.length, 10) - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-[rgba(244,242,238,0.1)]"></div>
                    )}
                    <div className="w-6 h-6 rounded-full bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] flex items-center justify-center shrink-0 mt-0.5 z-10">
                      <div className="w-2 h-2 rounded-full bg-slate" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-mist font-medium">{activity.action}</p>
                      {activity.details && <p className="text-xs text-slate mt-1">{activity.details}</p>}
                      <p className="text-xs text-slate/50 mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
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
            <div className="w-64 shrink-0 border-r border-[rgba(244,242,238,0.08)] flex flex-col">
              <div className="p-4 border-b border-[rgba(244,242,238,0.08)]">
                <button
                  onClick={handleNewNote}
                  className="w-full bg-ember text-mist rounded-lg py-2 text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Icons.Plus size={14} />
                  New Note
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {safeNotes.length === 0 ? (
                  <p className="text-slate text-xs text-center p-6">No notes yet. Create one!</p>
                ) : (
                  safeNotes.slice().reverse().map(note => (
                    <div
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className={`px-4 py-3 cursor-pointer border-b border-[rgba(244,242,238,0.04)] hover:bg-[rgba(244,242,238,0.04)] transition-colors group relative ${selectedNote?.id === note.id ? 'bg-[rgba(199,98,42,0.08)] border-l-2 border-l-ember' : ''}`}
                    >
                      <p className="text-mist text-sm font-medium truncate">{note.title || 'Untitled'}</p>
                      <p className="text-slate text-xs mt-0.5 truncate">{note.content?.slice(0, 50) || 'Empty note'}</p>
                      <p className="text-slate text-xs mt-1 opacity-60">{new Date(note.updatedAt).toLocaleDateString()}</p>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }}
                        className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate hover:text-ember cursor-pointer"
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
                <div className="px-8 py-4 border-b border-[rgba(244,242,238,0.08)] flex items-center justify-between">
                  <input
                    className="bg-transparent text-mist font-display text-xl outline-none flex-1 placeholder:text-slate"
                    value={noteTitle}
                    onChange={e => setNoteTitle(e.target.value)}
                    placeholder="Note title…"
                  />
                  <button
                    onClick={handleSaveNote}
                    className={`ml-4 text-xs px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${noteSaving ? 'opacity-50' : 'bg-[rgba(244,242,238,0.1)] text-mist hover:bg-[rgba(244,242,238,0.15)]'}`}
                  >
                    {noteSaving ? 'Saving…' : 'Save  ⌘S'}
                  </button>
                </div>
                <textarea
                  className="flex-1 bg-transparent text-mist text-sm resize-none outline-none p-8 leading-relaxed placeholder:text-slate"
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
              <div className="flex-1 flex flex-col items-center justify-center text-slate">
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
                <h2 className="font-display text-2xl text-mist font-medium">Your Team</h2>
                <p className="text-slate text-sm mt-1">{safeTeam.length} collaborator{safeTeam.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => setShowAddMember(true)}
                className="bg-ember text-mist px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer flex items-center gap-2"
              >
                <Icons.Plus size={14} />
                Add Member
              </button>
            </div>

            {/* Add member form */}
            {showAddMember && (
              <div className="bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.12)] rounded-2xl p-6 mb-8">
                <h3 className="font-display text-lg text-mist mb-4">Add a Collaborator</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    className="bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-lg px-4 py-2.5 text-sm text-mist outline-none focus:border-ember transition-colors"
                    placeholder="Full Name *"
                    value={newMember.name}
                    onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))}
                  />
                  <input
                    className="bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-lg px-4 py-2.5 text-sm text-mist outline-none focus:border-ember transition-colors"
                    placeholder="Role (e.g. Designer)"
                    value={newMember.role}
                    onChange={e => setNewMember(m => ({ ...m, role: e.target.value }))}
                  />
                  <input
                    className="bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-lg px-4 py-2.5 text-sm text-mist outline-none focus:border-ember transition-colors"
                    placeholder="Email"
                    type="email"
                    value={newMember.email}
                    onChange={e => setNewMember(m => ({ ...m, email: e.target.value }))}
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-slate text-xs">Colour:</span>
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
                  <button onClick={() => setShowAddMember(false)} className="text-slate text-sm hover:text-mist cursor-pointer px-4 py-2">Cancel</button>
                  <button
                    onClick={handleAddMember}
                    disabled={!newMember.name}
                    className="bg-ember text-mist px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {safeTeam.length === 0 ? (
              <div className="border border-dashed border-[rgba(244,242,238,0.1)] rounded-2xl py-16 flex flex-col items-center justify-center text-slate">
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
                    <div key={member.id} className="group bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-xl p-5 flex items-start gap-4 hover:border-[rgba(244,242,238,0.15)] transition-colors relative">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-mist font-display font-bold text-sm shrink-0" style={{ backgroundColor: member.color }}>
                        {member.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-mist font-medium truncate">{member.name}</p>
                        <p className="text-slate text-xs mt-0.5">{member.role || 'No role set'}</p>
                        {member.email && (
                          <a href={`mailto:${member.email}`} className="text-xs text-ember hover:underline mt-1 block truncate">{member.email}</a>
                        )}
                        <p className="text-xs text-slate mt-2">
                          <span className={activeTasks > 0 ? 'text-ember font-medium' : ''}>{activeTasks}</span> active task{activeTasks !== 1 && 's'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate hover:text-ember cursor-pointer"
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
              <h2 className="font-display text-2xl text-mist font-medium mb-8">Settings</h2>

              {/* Workspace */}
              <section className="mb-10">
                <h3 className="text-xs text-slate uppercase tracking-widest font-semibold mb-4">Workspace</h3>
                <div className="bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-2xl divide-y divide-[rgba(244,242,238,0.06)]">
                  <div className="p-5">
                    <label className="block text-mist text-sm font-medium mb-2">Base Directory</label>
                    <p className="text-slate text-xs mb-3">Root folder where all your project folders are created.</p>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-lg px-4 py-2.5 text-sm text-mist outline-none focus:border-moss transition-colors font-mono"
                        value={dirInput}
                        onChange={e => setDirInput(e.target.value)}
                      />
                      <button
                        onClick={handleSaveDir}
                        disabled={isPending}
                        className="bg-moss text-mist border border-[rgba(46,94,78,0.4)] rounded-lg px-5 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Application & Updates */}
              <section className="mb-10">
                <h3 className="text-xs text-slate uppercase tracking-widest font-semibold mb-4">Application</h3>
                <div className="bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-2xl divide-y divide-[rgba(244,242,238,0.06)]">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-mist text-sm font-medium">Version</p>
                      <p className="text-slate text-xs mt-0.5">v{appVersion || '1.0.0'}</p>
                    </div>
                    
                    {updaterStatus === 'idle' || updaterStatus === 'not-available' ? (
                      <button 
                        onClick={() => {
                          setUpdaterStatus('checking');
                          window.electron?.updater?.check();
                        }}
                        className="bg-[rgba(244,242,238,0.05)] text-slate border border-[rgba(244,242,238,0.1)] rounded-lg px-4 py-2 text-xs font-medium hover:text-mist transition-colors cursor-pointer"
                      >
                        {updaterStatus === 'not-available' ? 'Up to date' : 'Check for Updates'}
                      </button>
                    ) : updaterStatus === 'checking' ? (
                      <div className="text-slate text-xs flex items-center gap-2">
                        <Icons.Search size={14} className="animate-pulse" /> Checking...
                      </div>
                    ) : updaterStatus === 'downloading' || updaterStatus === 'available' ? (
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-stone rounded-full overflow-hidden">
                          <div className="h-full bg-moss transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                        </div>
                        <span className="text-slate text-xs w-8 text-right">{Math.round(downloadProgress)}%</span>
                      </div>
                    ) : updaterStatus === 'downloaded' ? (
                      <button 
                        onClick={() => window.electron?.updater?.install()}
                        className="bg-ember text-mist border border-[rgba(215,80,61,0.4)] rounded-lg px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer animate-pulse"
                      >
                        Restart to Update
                      </button>
                    ) : updaterStatus === 'error' ? (
                      <div className="text-ember text-xs max-w-[150px] truncate" title={updaterError}>
                        Update Error
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              {/* Data */}
              <section className="mb-10">
                <h3 className="text-xs text-slate uppercase tracking-widest font-semibold mb-4">Data</h3>
                <div className="bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-2xl divide-y divide-[rgba(244,242,238,0.06)]">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-mist text-sm font-medium">Projects</p>
                      <p className="text-slate text-xs mt-0.5">{safeDb.projects.length} total</p>
                    </div>
                    <Icons.Projects size={18} className="text-slate" />
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-mist text-sm font-medium">Notes</p>
                      <p className="text-slate text-xs mt-0.5">{safeNotes.length} total</p>
                    </div>
                    <Icons.Notes size={18} className="text-slate" />
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-mist text-sm font-medium">Team Members</p>
                      <p className="text-slate text-xs mt-0.5">{safeTeam.length} total</p>
                    </div>
                    <Icons.Team size={18} className="text-slate" />
                  </div>
                </div>
              </section>

              {/* About */}
              <section>
                <h3 className="text-xs text-slate uppercase tracking-widest font-semibold mb-4">About</h3>
                <div className="bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-2xl divide-y divide-[rgba(244,242,238,0.06)]">
                  <div className="p-5 flex items-center justify-between">
                    <p className="text-slate text-sm">Version</p>
                    <p className="text-mist text-sm font-mono">1.0.0</p>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <p className="text-slate text-sm">App</p>
                    <p className="text-mist text-sm">Forma Workspace</p>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-mist text-sm font-medium">App Tour</p>
                      <p className="text-slate text-xs mt-0.5">Walk through every feature step by step</p>
                    </div>
                    <button
                      onClick={() => setShowTour(true)}
                      className="text-xs bg-ember text-mist px-4 py-2 rounded-lg hover:bg-[#a65123] transition-colors cursor-pointer font-medium"
                    >
                      Take the Tour
                    </button>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    <a
                      href="https://formadigital.in"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ember text-sm hover:underline"
                    >
                      Visit formadigital.in →
                    </a>
                    <button
                      onClick={() => alert("The support ticketing portal is coming in a future update!")}
                      className="text-slate text-sm hover:text-ember transition-colors text-left"
                    >
                      Report a bug (Coming Soon) →
                    </button>
                  </div>
                </div>

                <div className="bg-[rgba(244,242,238,0.02)] border border-[rgba(244,242,238,0.1)] rounded-2xl overflow-hidden mt-6">
                  <div className="p-5 border-b border-[rgba(244,242,238,0.1)] flex justify-between items-center">
                    <h3 className="text-mist font-medium">Checklist Templates</h3>
                    <button
                      onClick={handleCreateTemplate}
                      className="text-xs bg-mist text-ink px-3 py-1.5 rounded-lg font-medium"
                    >
                      + New Template
                    </button>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    {safeDb.templates?.length === 0 ? (
                      <p className="text-slate text-sm">No templates defined.</p>
                    ) : (
                      safeDb.templates?.map(t => (
                        <div key={t.id} className="flex justify-between items-center text-sm border border-[rgba(244,242,238,0.1)] rounded-lg p-3">
                          <span className="text-mist">{t.name}</span>
                          <span className="text-slate text-xs">{t.phases.length} phases</span>
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
        <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
          <div className="bg-mist w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate/20" onClick={e => e.stopPropagation()}>
            <div className="flex items-center px-4 border-b border-slate/20">
              <Icons.Search size={18} className="text-slate" />
              <input
                autoFocus
                className="w-full bg-transparent px-4 py-4 text-ink outline-none text-lg font-body placeholder:text-slate"
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
                        <div className="px-3 py-2 text-xs font-semibold text-slate uppercase tracking-wider">Projects</div>
                        {pResults.slice().reverse().map(p => (
                          <Link key={p.id} href={`/project?id=${p.id}`} onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                            <div className="px-3 py-2.5 hover:bg-[rgba(26,26,46,0.05)] rounded-lg cursor-pointer flex items-center gap-3 text-ink transition-colors">
                              <Icons.Projects size={15} className="text-ember" />
                              <span className="text-sm">{p.name}</span>
                            </div>
                          </Link>
                        ))}
                      </>
                    )}
                    {cResults.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-slate uppercase tracking-wider mt-1">Clients</div>
                        {cResults.slice().reverse().map(c => (
                          <div key={c.id} onClick={() => { setActiveTab('Clients'); setSearchOpen(false); setSearchQuery(''); }} className="px-3 py-2.5 hover:bg-[rgba(26,26,46,0.05)] rounded-lg cursor-pointer flex items-center gap-3 text-ink transition-colors">
                            <Icons.Team size={15} className="text-[#8b5cf6]" />
                            <span className="text-sm">{c.name}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {nResults.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-slate uppercase tracking-wider mt-1">Notes</div>
                        {nResults.slice().reverse().map(n => (
                          <div key={n.id} onClick={() => { setActiveTab('Notes'); handleSelectNote(n); setSearchOpen(false); setSearchQuery(''); }} className="px-3 py-2.5 hover:bg-[rgba(26,26,46,0.05)] rounded-lg cursor-pointer flex items-center gap-3 text-ink transition-colors">
                            <Icons.Notes size={15} className="text-moss" />
                            <span className="text-sm">{n.title}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {pResults.length === 0 && cResults.length === 0 && nResults.length === 0 && (
                      <div className="px-3 py-4 text-sm text-slate text-center">Nothing found for "{searchQuery}"</div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
