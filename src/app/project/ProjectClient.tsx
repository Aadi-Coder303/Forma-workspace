'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DBData, Project, ProjectPhase, ChecklistItem } from '@/lib/types';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortablePhase({ phase, children }: { phase: ProjectPhase, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: phase.id,
    data: { type: 'Phase', phase }
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="min-w-[320px] max-w-[320px] flex flex-col bg-hover border border-border rounded-2xl p-4 max-h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4 px-1 group">
        <div>
          <h3 className="font-display font-medium text-primary">{phase.name}</h3>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] text-muted bg-hover px-1.5 py-0.5 rounded-sm">
              {phase.checklist.filter(i => i.isCompleted).length} / {phase.checklist.length} done
            </span>
            {phase.checklist.some(i => i.timeLogged) && (
              <span className="text-[10px] text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded-sm">
                {(phase.checklist.reduce((sum, i) => sum + (i.timeLogged || 0), 0) / 60).toFixed(1)}h logged
              </span>
            )}
          </div>
        </div>
        <div {...attributes} {...listeners} className="cursor-grab text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          <Icons.MoreVertical size={16} />
        </div>
      </div>
      {children}
    </div>
  );
}

function SortableItem({ item, project, phase, handleToggleItem, loadProject, onManualTimePrompt }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: 'Item', item, phaseId: phase.id }
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-start gap-2 p-3 rounded-xl border transition-all ${item.isCompleted ? 'bg-hover border-border opacity-60' : 'bg-hover border-border hover:border-accent'}`}>
      <div {...attributes} {...listeners} className="cursor-grab mt-0.5 text-muted opacity-50 hover:opacity-100">
        <Icons.MoreVertical size={14} />
      </div>
      <button onClick={() => handleToggleItem(phase.id, item)} className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${item.isCompleted ? 'bg-accent border-accent text-primary' : 'border-slate/50 hover:border-accent'}`}>
        {item.isCompleted && <Icons.Check size={14} strokeWidth={3} />}
      </button>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium ${item.isCompleted ? 'line-through text-muted' : 'text-primary'}`}>
          {item.title}
        </p>
        {item.subtasks?.length > 0 && (
          <p className="text-xs text-muted mt-1.5">
            {item.subtasks.filter((s: any) => s.isCompleted).length} of {item.subtasks.length} subtasks
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
            {item.priority === 'urgent' && !item.isCompleted && (
              <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-sm flex items-center">Urgent</span>
            )}
            {item.completedAt && (
              <span className="text-[10px] text-muted flex items-center">Done {new Date(item.completedAt).toLocaleDateString()}</span>
            )}
            
            {/* Time Tracking Controls */}
            <div className="flex items-center gap-1 ml-auto">
              {item.timeLogged !== undefined && item.timeLogged > 0 && (
                <span className="text-[10px] text-amber-500/80 font-medium mr-1">{Math.floor(item.timeLogged / 60)}h {item.timeLogged % 60}m</span>
              )}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (typeof window !== 'undefined' && window.electron) {
                    await window.electron.toggleTaskTimer(project.id, phase.id, item.id);
                    loadProject();
                  }
                }}
                className={`p-1 rounded transition-colors ${item.timeIsRunning ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'hover:bg-hover text-muted hover:text-primary'}`}
                title={item.timeIsRunning ? "Stop Timer" : "Start Timer"}
              >
                {item.timeIsRunning ? <Icons.StopCircle size={14} /> : <Icons.PlayCircle size={14} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onManualTimePrompt(phase.id, item.id);
                }}
                className="p-1 rounded hover:bg-hover text-muted hover:text-primary transition-colors"
                title="Add Time Manually"
              >
                <Icons.Plus size={14} />
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('id');
  const [db, setDb] = useState<DBData | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');
  
  // Custom prompt state for adding time
  const [timePrompt, setTimePrompt] = useState<{ phaseId: string, itemId: string } | null>(null);
  const [timeInput, setTimeInput] = useState('30');
  
  // Custom prompt state for saving template
  const [templatePrompt, setTemplatePrompt] = useState<boolean>(false);
  const [templateNameInput, setTemplateNameInput] = useState('');

  const loadProject = async () => {
    if (typeof window !== 'undefined' && window.electron && projectId) {
      try {
        const data = await window.electron.getDb();
        setDb(data);
        const p = data.projects.find((proj: Project) => proj.id === projectId);
        if (p) setProject(p);
        else setError('Project not found');
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  useEffect(() => {
    loadProject();
    const handleFocus = () => loadProject();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [projectId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<any>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveType(event.active.data.current?.type || null);
    setActiveData(event.active.data.current || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveType(null);
    setActiveData(null);
    const { active, over } = event;
    if (!over || !window.electron || !project) return;

    if (active.data.current?.type === 'Phase') {
      if (active.id !== over.id) {
        const oldIndex = project.phases.findIndex(p => p.id === active.id);
        const newIndex = project.phases.findIndex(p => p.id === over.id);
        const newOrder = arrayMove(project.phases, oldIndex, newIndex).map(p => p.id);
        setProject(prev => prev ? { ...prev, phases: arrayMove(prev.phases, oldIndex, newIndex) } : prev);
        await window.electron.reorderPhases(project.id, newOrder);
      }
    } else if (active.data.current?.type === 'Item') {
      const activePhaseId = active.data.current.phaseId;
      const overPhaseId = over.data.current?.type === 'Phase' ? over.id : over.data.current?.phaseId;
      if (!overPhaseId) return;

      if (activePhaseId === overPhaseId) {
         if (active.id !== over.id) {
           const phaseIndex = project.phases.findIndex(p => p.id === activePhaseId);
           const phase = project.phases[phaseIndex];
           const oldIndex = phase.checklist.findIndex(i => i.id === active.id);
           let newIndex = phase.checklist.findIndex(i => i.id === over.id);
           if (newIndex === -1) newIndex = phase.checklist.length;
           
           const newPhases = [...project.phases];
           newPhases[phaseIndex] = { ...phase, checklist: arrayMove(phase.checklist, oldIndex, newIndex) };
           setProject(prev => prev ? { ...prev, phases: newPhases } : prev);
           await window.electron.reorderChecklistItems(project.id, activePhaseId, overPhaseId as string, active.id as string, newIndex);
         }
      } else {
        const sourcePhaseIdx = project.phases.findIndex(p => p.id === activePhaseId);
        const targetPhaseIdx = project.phases.findIndex(p => p.id === overPhaseId);
        const sourcePhase = project.phases[sourcePhaseIdx];
        const targetPhase = project.phases[targetPhaseIdx];
        
        const oldIndex = sourcePhase.checklist.findIndex(i => i.id === active.id);
        let newIndex = targetPhase.checklist.findIndex(i => i.id === over.id);
        if (newIndex === -1) newIndex = targetPhase.checklist.length;
        
        const item = sourcePhase.checklist[oldIndex];
        const newPhases = [...project.phases];
        newPhases[sourcePhaseIdx] = { ...sourcePhase, checklist: sourcePhase.checklist.filter(i => i.id !== active.id) };
        const newTargetChecklist = [...targetPhase.checklist];
        newTargetChecklist.splice(newIndex, 0, item);
        newPhases[targetPhaseIdx] = { ...targetPhase, checklist: newTargetChecklist };
        setProject(prev => prev ? { ...prev, phases: newPhases } : prev);
        await window.electron.reorderChecklistItems(project.id, activePhaseId, overPhaseId as string, active.id as string, newIndex);
      }
    }
  };

  const handleOpenFolder = async () => {
    if (!project) return;
    try {
      // This requires exposing openExternal or similar in electron, or we can use shell.openPath in main.js
      // We don't have openPath exposed yet, but we can add it later if needed. For now, it's just a UI placeholder.
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleItem = async (phaseId: string, item: ChecklistItem) => {
    if (!window.electron || !project) return;
    const newVal = !item.isCompleted;
    
    // Optimistic update
    setProject(prev => {
      if (!prev) return prev;
      const newPhases = prev.phases.map(ph => {
        if (ph.id !== phaseId) return ph;
        return {
          ...ph,
          checklist: ph.checklist.map(i => i.id === item.id ? { ...i, isCompleted: newVal, completedAt: newVal ? new Date().toISOString() : undefined } : i)
        };
      });
      return { ...prev, phases: newPhases };
    });

    await window.electron.updateChecklistItem(project.id, phaseId, item.id, { 
      isCompleted: newVal, 
      completedAt: newVal ? new Date().toISOString() : undefined 
    });
  };

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas text-primary font-body">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="text-accent hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!project || !db) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas text-primary font-body">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-200" />
        </div>
      </div>
    );
  }

  const client = db.clients.find(c => c.id === project.clientId);

  const totalItems = project.phases.reduce((acc, ph) => acc + ph.checklist.length, 0);
  const completedItems = project.phases.reduce((acc, ph) => acc + ph.checklist.filter(i => i.isCompleted).length, 0);
  const progress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  const projectInvoices = db.invoices?.filter(i => i.projectId === project.id) || [];
  const totalInvoiced = projectInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = projectInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const balance = totalInvoiced - totalPaid;

  const handleSaveAsTemplate = () => {
    if (project) {
      setTemplateNameInput(`${project.name} Template`);
      setTemplatePrompt(true);
    }
  };

  const submitSaveAsTemplate = async () => {
    if (typeof window !== 'undefined' && window.electron && project && templateNameInput.trim()) {
      const templateData = {
        name: templateNameInput.trim(),
        phases: project.phases.map(ph => ({
          name: ph.name,
          items: ph.checklist.map(item => ({
            title: item.title,
            subtasks: item.subtasks.map(s => s.title)
          }))
        }))
      };

      try {
        await window.electron.createTemplate(templateData);
        alert('Template saved successfully!');
        setTemplatePrompt(false);
      } catch (err: any) {
        alert('Failed to save template: ' + err.message);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-canvas text-primary font-body overflow-hidden">
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

      {/* ── TOP NAV ── */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-hover drag-region">
        <div className="flex items-center gap-4 no-drag">
          <Link href="/" className="text-muted hover:text-primary transition-colors">
            <Icons.ArrowLeft size={20} />
          </Link>
          <div className="w-px h-6 bg-hover" />
          <div>
            <h1 className="font-display font-semibold text-lg leading-tight">{project.name}</h1>
            {client && <p className="text-xs text-muted">{client.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 no-drag">
          <div className="flex items-center gap-2 text-xs font-medium text-muted bg-hover px-3 py-1.5 rounded-full border border-border">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            {project.status}
          </div>
        </div>
      </header>

      {/* ── METADATA HEADER ── */}
      <div className="px-8 py-6 border-b border-border bg-hover flex items-center justify-between">
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-muted mb-1">Deadline</p>
            <p className="font-medium">{project.deadline || 'No deadline set'}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Total Invoiced</p>
            <p className="font-medium">${totalInvoiced.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Balance Due</p>
            <p className="font-medium text-accent">${balance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Priority</p>
            <p className="font-medium capitalize">{project.priority}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href={`/project/report?id=${project.id}`}
            target="_blank"
            className="flex items-center gap-2 text-muted hover:text-primary text-xs font-medium bg-hover hover:bg-hover px-3 py-1.5 rounded-lg border border-border transition-colors"
          >
            <Icons.FileText size={14} />
            Status Report
          </Link>
          <button 
            onClick={handleSaveAsTemplate}
            className="text-muted hover:text-primary text-xs font-medium bg-hover hover:bg-hover px-3 py-1.5 rounded-lg border border-border transition-colors"
          >
            Save as Template
          </button>
          <div className="flex items-center gap-4 border-l border-border pl-4">
            <div className="text-right">
              <p className="text-xs text-muted mb-1">Overall Progress</p>
              <p className="font-display font-bold text-lg text-accent">{progress}%</p>
            </div>
            <div className="w-32 h-2 bg-hover rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── KANBAN PHASES ── */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <main className="flex-1 overflow-x-auto p-8 flex gap-6 items-start">
          {project.phases.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center mt-20 text-muted">
              <p>No phases defined for this project.</p>
            </div>
          ) : (
            <SortableContext items={project.phases.map(p => p.id)} strategy={horizontalListSortingStrategy}>
              {project.phases.map(phase => (
                <SortablePhase key={phase.id} phase={phase}>
                  <SortableContext items={phase.checklist.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-3 min-h-[50px]">
                      {phase.checklist.map(item => (
                        <SortableItem key={item.id} item={item} project={project} phase={phase} handleToggleItem={handleToggleItem} loadProject={loadProject} onManualTimePrompt={(phId: string, iId: string) => setTimePrompt({ phaseId: phId, itemId: iId })} />
                      ))}
                    </div>
                  </SortableContext>
                </SortablePhase>
              ))}
            </SortableContext>
          )}
        </main>
        <DragOverlay>
          {activeId && activeType === 'Phase' ? (
            <div className="min-w-[320px] max-w-[320px] bg-hover border border-accent rounded-2xl p-4 opacity-80 scale-105 shadow-xl">
              <h3 className="font-display font-medium text-primary">{activeData.phase.name}</h3>
            </div>
          ) : null}
          {activeId && activeType === 'Item' ? (
            <div className="p-3 rounded-xl border bg-hover border-accent opacity-80 scale-105 shadow-lg">
              <p className="text-sm font-medium text-primary">{activeData.item.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Manual Time Prompt Modal */}
      {timePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-canvas border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-medium text-lg mb-2">Add Manual Time</h3>
            <p className="text-sm text-muted mb-4">Enter time to add (in minutes):</p>
            <input
              autoFocus
              type="number"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const mins = parseInt(timeInput);
                  if (!isNaN(mins) && mins > 0 && window.electron && project) {
                    await window.electron.addManualTime(project.id, timePrompt.phaseId, timePrompt.itemId, mins);
                    loadProject();
                  }
                  setTimePrompt(null);
                  setTimeInput('30');
                } else if (e.key === 'Escape') {
                  setTimePrompt(null);
                }
              }}
              className="w-full bg-hover border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTimePrompt(null)}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const mins = parseInt(timeInput);
                  if (!isNaN(mins) && mins > 0 && window.electron && project) {
                    await window.electron.addManualTime(project.id, timePrompt.phaseId, timePrompt.itemId, mins);
                    loadProject();
                  }
                  setTimePrompt(null);
                  setTimeInput('30');
                }}
                className="px-4 py-2 text-sm font-medium bg-accent text-canvas rounded-lg hover:bg-accent/90 transition-colors"
              >
                Add Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {templatePrompt && (
        <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border">
              <h3 className="font-display font-medium text-primary mb-2">Save as Template</h3>
              <p className="text-xs text-muted">Enter a name for this new template:</p>
            </div>
            <div className="p-5">
              <input 
                autoFocus
                type="text"
                className="w-full bg-hover border border-border rounded-lg px-4 py-2.5 text-sm text-primary outline-none focus:border-accent transition-colors"
                value={templateNameInput}
                onChange={e => setTemplateNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitSaveAsTemplate();
                  if (e.key === 'Escape') setTemplatePrompt(false);
                }}
              />
            </div>
            <div className="px-5 py-3 bg-hover border-t border-border flex justify-end gap-3">
              <button 
                onClick={() => setTemplatePrompt(false)}
                className="px-4 py-1.5 text-sm text-muted hover:text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={submitSaveAsTemplate}
                className="px-4 py-1.5 text-sm font-medium bg-accent text-canvas rounded-lg hover:bg-[#a65123] transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
