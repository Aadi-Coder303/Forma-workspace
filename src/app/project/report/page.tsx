'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DBData, Project } from '@/lib/db';
import Link from 'next/link';

function ReportContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.getDb().then((db: DBData) => {
        const found = db.projects.find(p => p.id === id);
        if (found) {
          setProject(found);
          // Wait a tick for render, then open print dialog
          setTimeout(() => {
            window.print();
          }, 500);
        } else {
          setError('Project not found');
        }
      }).catch(err => {
        setError(err.message);
      });
    }
  }, [id]);

  if (error) {
    return <div className="p-10 text-red-500">{error}</div>;
  }

  if (!project) {
    return <div className="p-10 text-slate-500">Loading Report...</div>;
  }

  // Calculate Progress
  let totalTasks = 0;
  let completedTasks = 0;
  project.phases.forEach(ph => {
    totalTasks += ph.checklist.length;
    completedTasks += ph.checklist.filter(i => i.isCompleted).length;
  });
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="max-w-4xl mx-auto p-12 font-sans bg-white text-black min-h-screen">
      {/* ── No Print Navigation ── */}
      <div className="mb-8 print:hidden">
        <Link href={`/project?id=${project.id}`} className="text-blue-500 hover:underline">
          &larr; Back to Project
        </Link>
        <button onClick={() => window.print()} className="ml-4 px-4 py-2 bg-blue-600 text-white rounded">
          Print / Save PDF
        </button>
      </div>

      {/* ── Report Header ── */}
      <header className="border-b-2 border-gray-200 pb-8 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">{project.name}</h1>
          <p className="text-xl text-gray-500">Project Status Report</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Generated</p>
          <p className="text-gray-900 font-medium">{new Date().toLocaleDateString()}</p>
        </div>
      </header>

      {/* ── Meta Summary ── */}
      <section className="grid grid-cols-3 gap-8 mb-12">
        <div className="bg-gray-50 p-6 rounded-xl">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Overall Progress</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{progress}%</span>
            <span className="text-gray-500 mb-1">completed</span>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Deadline</p>
          <p className="text-2xl font-bold text-gray-900">{project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
          <p className="text-2xl font-bold text-gray-900 capitalize">{project.status}</p>
        </div>
      </section>

      {/* ── Phases Breakdown ── */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Phase Breakdown</h2>
        <div className="space-y-8">
          {project.phases.map(phase => {
            const phaseTotal = phase.checklist.length;
            const phaseCompleted = phase.checklist.filter(i => i.isCompleted).length;
            const phaseProgress = phaseTotal === 0 ? 0 : Math.round((phaseCompleted / phaseTotal) * 100);

            return (
              <div key={phase.id} className="border border-gray-200 rounded-xl p-6 page-break-inside-avoid">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                  <h3 className="text-lg font-bold text-gray-900">{phase.name}</h3>
                  <span className="text-sm font-medium text-gray-500">{phaseProgress}% Complete</span>
                </div>
                <ul className="space-y-3">
                  {phase.checklist.map(item => (
                    <li key={item.id} className="flex items-start gap-3">
                      <div className={`mt-1 flex-shrink-0 w-4 h-4 rounded-sm border flex items-center justify-center ${item.isCompleted ? 'bg-black border-black text-white' : 'border-gray-300'}`}>
                        {item.isCompleted && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </div>
                      <div>
                        <p className={`text-gray-900 font-medium ${item.isCompleted ? 'line-through text-gray-400' : ''}`}>{item.title}</p>
                        {item.timeLogged !== undefined && item.timeLogged > 0 && (
                          <p className="text-sm text-gray-500">Time Logged: {Math.floor(item.timeLogged / 60)}h {item.timeLogged % 60}m</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
        Generated by Forma Workspace
      </footer>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportContent />
    </Suspense>
  );
}
