'use client';

import { useState } from 'react';
import { Client, CommunicationLog } from '@/lib/db';
import { Icons } from '@/components/ui/icons';

const STATUS_COLORS: Record<string, string> = {
  lead:      'rgba(107,111,122,0.2)',
  active:    'rgba(199,98,42,0.15)',
  paused:    'rgba(212,183,18,0.15)',
  completed: 'rgba(46,94,78,0.2)',
};

const STATUS_TEXT: Record<string, string> = {
  lead:      'text-slate',
  active:    'text-ember',
  paused:    'text-yellow-400',
  completed: 'text-moss',
};

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead', active: 'Active', paused: 'Paused', completed: 'Completed',
};

const INVOICE_LABELS: Record<string, string> = {
  none: 'None', pending: 'Pending', paid: 'Paid', overdue: 'Overdue'
};

const BLANK: Omit<Client, 'id' | 'createdAt' | 'logs'> = {
  name: '', company: '', email: '', phone: '', website: '',
  country: '', currency: 'USD', status: 'lead', invoiceStatus: 'none',
  deliverables: '', notes: '',
};

interface Props {
  clients: Client[];
  projects: { id: string; name: string; clientId?: string }[];
  onRefresh: () => void;
}

export default function ClientsTab({ clients, projects, onRefresh }: Props) {
  const [selected, setSelected] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Log Form State
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState<Omit<CommunicationLog, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    type: 'note',
    summary: ''
  });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm({ ...BLANK }); setEditing(false); setShowForm(true); setSelected(null); };

  const openEdit = (c: Client) => {
    setForm({
      name: c.name, company: c.company, email: c.email, phone: c.phone,
      website: c.website, country: c.country, currency: c.currency,
      status: c.status, invoiceStatus: c.invoiceStatus, deliverables: c.deliverables, notes: c.notes,
    });
    setEditing(true);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!window.electron || !form.name) return;
    setSaving(true);
    try {
      if (editing && selected) {
        const updated = await window.electron.updateClient(selected.id, form);
        setSelected(updated);
      } else {
        const newC = await window.electron.createClient(form);
        setSelected(newC);
      }
      setShowForm(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.electron) return;
    if (!confirm('Delete this client? This cannot be undone.')) return;
    await window.electron.deleteClient(id);
    if (selected?.id === id) setSelected(null);
    onRefresh();
  };

  const handleAddLog = async () => {
    if (!window.electron || !selected || !logForm.summary) return;
    await window.electron.addClientLog(selected.id, logForm);
    setLogForm({ date: new Date().toISOString().split('T')[0], type: 'note', summary: '' });
    setShowLogForm(false);
    
    // Refresh local state to immediately show the new log
    const updatedClient = {
      ...selected, 
      logs: [...(selected.logs || []), { id: crypto.randomUUID(), ...logForm }]
    };
    setSelected(updatedClient);
    onRefresh();
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Left: Client List ── */}
      <div className="w-72 shrink-0 border-r border-[rgba(244,242,238,0.08)] flex flex-col">
        <div className="p-4 space-y-3 border-b border-[rgba(244,242,238,0.08)]">
          <button
            onClick={openNew}
            className="w-full bg-ember text-mist rounded-lg py-2 text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Icons.Plus size={14} /> New Client
          </button>
          <div className="relative">
            <Icons.Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
            <input
              className="w-full bg-[rgba(244,242,238,0.04)] border border-[rgba(244,242,238,0.08)] rounded-lg pl-8 pr-3 py-2 text-xs text-mist outline-none focus:border-ember transition-colors placeholder:text-slate"
              placeholder="Search clients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-slate text-xs text-center p-6">
              {clients.length === 0 ? 'No clients yet. Add one!' : 'No results.'}
            </p>
          )}
          {filtered.map(client => {
            const isActive = selected?.id === client.id && !showForm;
            return (
              <div
                key={client.id}
                onClick={() => { setSelected(client); setShowForm(false); }}
                className={`px-4 py-3 cursor-pointer border-b border-[rgba(244,242,238,0.04)] hover:bg-[rgba(244,242,238,0.04)] transition-colors group relative ${isActive ? 'bg-[rgba(199,98,42,0.07)] border-l-2 border-l-ember' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-mist text-sm font-medium truncate">{client.name}</p>
                    <p className="text-slate text-xs truncate mt-0.5">{client.company || 'No company'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_TEXT[client.status]}`}
                      style={{ background: STATUS_COLORS[client.status] }}>
                      {STATUS_LABELS[client.status]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(client.id); }}
                  className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate hover:text-ember cursor-pointer"
                >
                  <Icons.Close size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Detail / Form ── */}
      <div className="flex-1 overflow-y-auto">
        {/* ADD / EDIT FORM */}
        {showForm && (
          <div className="p-8 max-w-2xl">
            <h2 className="font-display text-2xl text-mist mb-6">{editing ? 'Edit Client' : 'New Client'}</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { label: 'Full Name *', key: 'name', placeholder: 'Jane Smith' },
                { label: 'Company',     key: 'company', placeholder: 'Acme Inc.' },
                { label: 'Email',       key: 'email', placeholder: 'jane@acme.com', type: 'email' },
                { label: 'Phone',       key: 'phone', placeholder: '+1 555 000 0000', type: 'tel' },
                { label: 'Website',     key: 'website', placeholder: 'https://acme.com', type: 'url' },
                { label: 'Country',     key: 'country', placeholder: 'India' },
              ].map(({ label, key, placeholder, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-xs text-slate mb-1.5">{label}</label>
                  <input
                    type={type}
                    className="w-full bg-[rgba(244,242,238,0.04)] border border-[rgba(244,242,238,0.1)] rounded-lg px-3 py-2.5 text-sm text-mist outline-none focus:border-ember transition-colors"
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-slate mb-1.5">Currency</label>
                <select
                  className="w-full bg-[rgba(244,242,238,0.04)] border border-[rgba(244,242,238,0.1)] rounded-lg px-3 py-2.5 text-sm text-mist outline-none focus:border-ember transition-colors cursor-pointer"
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                >
                  {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate mb-1.5">Status</label>
                <select
                  className="w-full bg-[rgba(244,242,238,0.04)] border border-[rgba(244,242,238,0.1)] rounded-lg px-3 py-2.5 text-sm text-mist outline-none focus:border-ember transition-colors cursor-pointer"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                >
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate mb-1.5">Invoice Status</label>
                <select
                  className="w-full bg-[rgba(244,242,238,0.04)] border border-[rgba(244,242,238,0.1)] rounded-lg px-3 py-2.5 text-sm text-mist outline-none focus:border-ember transition-colors cursor-pointer"
                  value={form.invoiceStatus}
                  onChange={e => setForm(f => ({ ...f, invoiceStatus: e.target.value as any }))}
                >
                  <option value="none">None</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-slate mb-1.5">Deliverables Scope</label>
              <textarea
                className="w-full bg-[rgba(244,242,238,0.04)] border border-[rgba(244,242,238,0.1)] rounded-lg px-3 py-2.5 text-sm text-mist outline-none focus:border-ember transition-colors resize-none h-20"
                placeholder="List agreed deliverables..."
                value={form.deliverables}
                onChange={e => setForm(f => ({ ...f, deliverables: e.target.value }))}
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs text-slate mb-1.5">Notes</label>
              <textarea
                className="w-full bg-[rgba(244,242,238,0.04)] border border-[rgba(244,242,238,0.1)] rounded-lg px-3 py-2.5 text-sm text-mist outline-none focus:border-ember transition-colors resize-none h-24"
                placeholder="Any additional notes about this client…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="text-slate text-sm hover:text-mist cursor-pointer px-4 py-2">Cancel</button>
              <button
                onClick={handleSave}
                disabled={!form.name || saving}
                className="bg-ember text-mist px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#a65123] transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Client'}
              </button>
            </div>
          </div>
        )}

        {/* CLIENT DETAIL */}
        {selected && !showForm && (
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-display text-2xl text-mist font-medium">{selected.name}</h2>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_TEXT[selected.status]}`}
                    style={{ background: STATUS_COLORS[selected.status] }}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[rgba(244,242,238,0.05)] text-slate border border-[rgba(244,242,238,0.1)]">
                    Invoice: {INVOICE_LABELS[selected.invoiceStatus]}
                  </span>
                </div>
                {selected.company && <p className="text-slate text-sm">{selected.company}</p>}
              </div>
              <button
                onClick={() => openEdit(selected)}
                className="text-xs text-slate hover:text-mist border border-[rgba(244,242,238,0.1)] px-3 py-1.5 rounded-lg hover:border-[rgba(244,242,238,0.2)] transition-colors cursor-pointer"
              >
                Edit Details
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="group bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-xl p-4 hover:border-ember transition-colors">
                  <p className="text-xs text-slate mb-1">Email</p>
                  <p className="text-mist text-sm truncate group-hover:text-ember transition-colors">{selected.email}</p>
                </a>
              )}
              {selected.phone && (
                <a href={`tel:${selected.phone}`} className="group bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-xl p-4 hover:border-ember transition-colors">
                  <p className="text-xs text-slate mb-1">Phone</p>
                  <p className="text-mist text-sm">{selected.phone}</p>
                </a>
              )}
              {selected.website && (
                <a href={selected.website} target="_blank" rel="noreferrer" className="group bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-xl p-4 hover:border-ember transition-colors">
                  <p className="text-xs text-slate mb-1">Website</p>
                  <p className="text-mist text-sm truncate group-hover:text-ember transition-colors">{selected.website.replace(/^https?:\/\//, '')}</p>
                </a>
              )}
            </div>

            {/* Linked projects */}
            <div className="mb-8">
              <p className="text-xs text-slate uppercase tracking-widest mb-3">Linked Projects</p>
              <div className="flex flex-wrap gap-2">
                {projects.filter(p => p.clientId === selected.id).length === 0 ? (
                  <p className="text-sm text-slate">No projects linked to this client yet.</p>
                ) : (
                  projects.filter(p => p.clientId === selected.id).map(p => (
                    <span key={p.id} className="text-xs bg-[rgba(199,98,42,0.1)] text-ember px-3 py-1.5 rounded-full border border-[rgba(199,98,42,0.2)]">
                      {p.name}
                    </span>
                  ))
                )}
              </div>
            </div>

            {selected.deliverables && (
              <div className="mb-8 bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-xl p-5">
                <p className="text-xs text-slate uppercase tracking-widest mb-2">Deliverables Scope</p>
                <p className="text-mist text-sm leading-relaxed whitespace-pre-wrap">{selected.deliverables}</p>
              </div>
            )}

            {selected.notes && (
              <div className="mb-8 bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.08)] rounded-xl p-5">
                <p className="text-xs text-slate uppercase tracking-widest mb-2">Notes</p>
                <p className="text-mist text-sm leading-relaxed whitespace-pre-wrap">{selected.notes}</p>
              </div>
            )}

            {/* ── CRM TIMELINE ── */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-slate uppercase tracking-widest">Communication Log</p>
                <button 
                  onClick={() => setShowLogForm(!showLogForm)}
                  className="text-xs text-mist bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] px-3 py-1.5 rounded-lg hover:border-ember transition-colors"
                >
                  + Add Log
                </button>
              </div>

              {showLogForm && (
                <div className="bg-[rgba(244,242,238,0.02)] border border-[rgba(244,242,238,0.1)] rounded-xl p-4 mb-4 flex flex-col gap-3">
                  <div className="flex gap-4">
                    <input type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} className="bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-lg px-3 py-2 text-sm text-mist outline-none" />
                    <select value={logForm.type} onChange={e => setLogForm({ ...logForm, type: e.target.value as any })} className="bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-lg px-3 py-2 text-sm text-mist outline-none">
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="note">Internal Note</option>
                    </select>
                  </div>
                  <textarea 
                    placeholder="Summary of communication..." 
                    value={logForm.summary} onChange={e => setLogForm({ ...logForm, summary: e.target.value })} 
                    className="w-full bg-[rgba(244,242,238,0.05)] border border-[rgba(244,242,238,0.1)] rounded-lg px-3 py-2 text-sm text-mist outline-none resize-none h-16"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowLogForm(false)} className="text-xs text-slate px-3 py-1.5 hover:text-mist">Cancel</button>
                    <button onClick={handleAddLog} disabled={!logForm.summary} className="text-xs bg-ember text-mist px-4 py-1.5 rounded-lg font-medium hover:bg-[#a65123] disabled:opacity-50">Save Log</button>
                  </div>
                </div>
              )}

              <div className="relative border-l border-[rgba(244,242,238,0.1)] ml-2 pl-4 py-2 space-y-6">
                {(!selected.logs || selected.logs.length === 0) ? (
                  <p className="text-slate text-sm">No communication logs recorded yet.</p>
                ) : (
                  selected.logs.slice().reverse().map(log => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-ink border border-ember rounded-full" />
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-ember capitalize">{log.type}</span>
                        <span className="text-[10px] text-slate">{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-mist bg-[rgba(244,242,238,0.03)] border border-[rgba(244,242,238,0.05)] rounded-lg p-3 inline-block max-w-lg whitespace-pre-wrap">
                        {log.summary}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selected && !showForm && (
          <div className="flex flex-col items-center justify-center h-full text-slate">
            <Icons.Team size={36} className="opacity-30 mb-4" />
            <p className="text-sm">Select a client or add a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
