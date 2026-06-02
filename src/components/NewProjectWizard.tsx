import { useState } from 'react';
import { Icons } from './ui/icons';
import { Client, ChecklistTemplate, ProjectPhase } from '@/lib/db';

type WizardProps = {
  clients: Client[];
  templates: ChecklistTemplate[];
  onClose: () => void;
  onSubmit: (projectData: any) => Promise<void>;
};

export default function NewProjectWizard({ clients, templates, onClose, onSubmit }: WizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    deadline: '',
    budget: '',
    priority: 'normal',
    templateId: ''
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!formData.name) {
      setError('Project name is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      let phases: ProjectPhase[] = [];
      if (formData.templateId) {
        const tmpl = templates.find(t => t.id === formData.templateId);
        if (tmpl) {
          phases = tmpl.phases.map(p => ({
            id: crypto.randomUUID(),
            name: p.name,
            status: 'pending',
            checklist: p.items.map(i => ({
              id: crypto.randomUUID(),
              title: i.title,
              isCompleted: false,
              priority: 'normal',
              subtasks: i.subtasks.map(st => ({ id: crypto.randomUUID(), title: st, isCompleted: false })),
              createdAt: new Date().toISOString()
            }))
          }));
        }
      }

      await onSubmit({ ...formData, phases });
      onClose();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4 font-body">
      <div className="bg-ink border border-[rgba(244,242,238,0.1)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[rgba(244,242,238,0.1)] bg-[rgba(244,242,238,0.02)]">
          <div>
            <h2 className="text-xl font-display font-semibold text-mist">New Project</h2>
            <p className="text-slate text-sm">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-slate hover:text-mist">
            <Icons.Close size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg text-mist mb-2">Select a Client</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormData(f => ({ ...f, clientId: '' }))}
                  className={`p-4 rounded-xl border text-left transition-all ${!formData.clientId ? 'border-ember bg-[rgba(199,98,42,0.1)]' : 'border-[rgba(244,242,238,0.1)] hover:border-[rgba(244,242,238,0.3)]'}`}
                >
                  <div className="font-medium text-mist">Internal / No Client</div>
                  <div className="text-sm text-slate mt-1">Personal project</div>
                </button>
                {clients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setFormData(f => ({ ...f, clientId: c.id }))}
                    className={`p-4 rounded-xl border text-left transition-all ${formData.clientId === c.id ? 'border-ember bg-[rgba(199,98,42,0.1)]' : 'border-[rgba(244,242,238,0.1)] hover:border-[rgba(244,242,238,0.3)]'}`}
                  >
                    <div className="font-medium text-mist">{c.name}</div>
                    <div className="text-sm text-slate mt-1">{c.company || 'Independent'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg text-mist mb-2">Project Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Acme Website Redesign"
                    className="w-full bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-xl px-4 py-3 text-mist focus:outline-none focus:border-ember transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate mb-1">Deadline</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))}
                      className="w-full bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-xl px-4 py-3 text-mist focus:outline-none focus:border-ember transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate mb-1">Budget</label>
                    <input
                      type="text"
                      value={formData.budget}
                      onChange={e => setFormData(f => ({ ...f, budget: e.target.value }))}
                      placeholder="e.g. $5,000"
                      className="w-full bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-xl px-4 py-3 text-mist focus:outline-none focus:border-ember transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate mb-1">Priority</label>
                  <div className="flex gap-2">
                    {['low', 'normal', 'urgent'].map(p => (
                      <button
                        key={p}
                        onClick={() => setFormData(f => ({ ...f, priority: p as any }))}
                        className={`flex-1 py-2 rounded-lg border capitalize transition-colors ${formData.priority === p ? 'bg-mist text-ink border-mist' : 'border-[rgba(244,242,238,0.1)] text-slate hover:text-mist'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg text-mist mb-2">Select a Framework Template</h3>
              <p className="text-sm text-slate">This will pre-fill your project with standard phases and task checklists.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormData(f => ({ ...f, templateId: '' }))}
                  className={`p-4 rounded-xl border text-left transition-all ${!formData.templateId ? 'border-ember bg-[rgba(199,98,42,0.1)]' : 'border-[rgba(244,242,238,0.1)] hover:border-[rgba(244,242,238,0.3)]'}`}
                >
                  <div className="font-medium text-mist">Blank Project</div>
                  <div className="text-sm text-slate mt-1">Start from scratch</div>
                </button>
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFormData(f => ({ ...f, templateId: t.id }))}
                    className={`p-4 rounded-xl border text-left transition-all ${formData.templateId === t.id ? 'border-ember bg-[rgba(199,98,42,0.1)]' : 'border-[rgba(244,242,238,0.1)] hover:border-[rgba(244,242,238,0.3)]'}`}
                  >
                    <div className="font-medium text-mist">{t.name}</div>
                    <div className="text-sm text-slate mt-1">{t.phases.length} phases</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[rgba(244,242,238,0.1)] flex justify-between bg-[rgba(244,242,238,0.02)]">
          {step > 1 ? (
            <button onClick={prevStep} className="px-6 py-2 rounded-lg text-slate hover:text-mist transition-colors">
              Back
            </button>
          ) : <div></div>}
          
          {step < 3 ? (
            <button onClick={nextStep} className="px-6 py-2 bg-mist text-ink font-medium rounded-lg hover:bg-white transition-colors">
              Continue
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="px-6 py-2 bg-ember text-mist font-medium rounded-lg hover:bg-[#a65123] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
