import { useState, useMemo } from 'react';
import { DBData, Invoice, Client, Project } from '@/lib/types';
import { Icons } from './ui/icons';

type InvoicesTabProps = {
  db: DBData;
  onRefresh: () => Promise<void>;
};

export default function InvoicesTab({ db, onRefresh }: InvoicesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [newInvoice, setNewInvoice] = useState<Omit<Invoice, 'id'>>({
    title: '',
    projectId: '',
    clientId: '',
    amount: 0,
    status: 'draft',
    dueDate: new Date().toISOString().split('T')[0],
  });

  const handleCreate = async () => {
    if (typeof window !== 'undefined' && window.electron && newInvoice.title && newInvoice.projectId) {
      await window.electron.createInvoice(newInvoice);
      setShowForm(false);
      setNewInvoice({
        title: '',
        projectId: '',
        clientId: '',
        amount: 0,
        status: 'draft',
        dueDate: new Date().toISOString().split('T')[0],
      });
      await onRefresh();
    }
  };

  const handleStatusChange = async (id: string, status: Invoice['status']) => {
    if (typeof window !== 'undefined' && window.electron) {
      await window.electron.updateInvoice(id, { 
        status, 
        ...(status === 'sent' ? { sentDate: new Date().toISOString() } : {}),
        ...(status === 'paid' ? { paidDate: new Date().toISOString() } : {})
      });
      await onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== 'undefined' && window.electron) {
      if (confirm('Are you sure you want to delete this invoice?')) {
        await window.electron.deleteInvoice(id);
        await onRefresh();
      }
    }
  };

  const stats = useMemo(() => {
    const invoices = db.invoices || [];
    return {
      total: invoices.reduce((sum, inv) => sum + inv.amount, 0),
      paid: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
      outstanding: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0),
      drafts: invoices.filter(i => i.status === 'draft').length
    };
  }, [db.invoices]);

  const invoices = db.invoices || [];

  return (
    <div className="flex-1 overflow-y-auto p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-4xl text-primary font-medium tracking-wide mb-2">Invoices & Billing</h1>
            <p className="text-muted">Manage your financial health across all clients and projects.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent hover:bg-[#a65123] text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
          >
            <Icons.Plus size={16} />
            Create Invoice
          </button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-hover border border-border rounded-2xl p-6">
            <p className="text-muted text-sm mb-2">Total Invoiced (All Time)</p>
            <p className="font-display text-2xl text-primary">${stats.total.toLocaleString()}</p>
          </div>
          <div className="bg-hover border border-border rounded-2xl p-6">
            <p className="text-muted text-sm mb-2">Total Paid</p>
            <p className="font-display text-2xl text-accent">${stats.paid.toLocaleString()}</p>
          </div>
          <div className="bg-hover border border-border rounded-2xl p-6">
            <p className="text-muted text-sm mb-2">Outstanding / Unpaid</p>
            <p className="font-display text-2xl text-accent">${stats.outstanding.toLocaleString()}</p>
          </div>
          <div className="bg-hover border border-border rounded-2xl p-6">
            <p className="text-muted text-sm mb-2">Draft Invoices</p>
            <p className="font-display text-2xl text-primary">{stats.drafts}</p>
          </div>
        </div>

        {showForm && (
          <div className="bg-hover border border-accent/30 rounded-2xl p-6 space-y-4">
            <h2 className="text-primary font-medium">New Invoice</h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Invoice Title (e.g. INV-001 - Initial Deposit)"
                value={newInvoice.title}
                onChange={e => setNewInvoice({ ...newInvoice, title: e.target.value })}
                className="bg-hover border border-border rounded-lg px-4 py-2 text-primary text-sm outline-none focus:border-accent"
              />
              <input
                type="number"
                placeholder="Amount ($)"
                value={newInvoice.amount || ''}
                onChange={e => setNewInvoice({ ...newInvoice, amount: Number(e.target.value) })}
                className="bg-hover border border-border rounded-lg px-4 py-2 text-primary text-sm outline-none focus:border-accent"
              />
              <select
                value={newInvoice.projectId}
                onChange={e => {
                  const pid = e.target.value;
                  const proj = db.projects.find(p => p.id === pid);
                  setNewInvoice({ ...newInvoice, projectId: pid, clientId: proj?.clientId || '' });
                }}
                className="bg-hover border border-border rounded-lg px-4 py-2 text-primary text-sm outline-none focus:border-accent"
              >
                <option value="">Select Project...</option>
                {db.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={newInvoice.dueDate}
                onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                className="bg-hover border border-border rounded-lg px-4 py-2 text-primary text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-primary text-sm transition-colors px-4 py-2">Cancel</button>
              <button onClick={handleCreate} className="bg-accent hover:bg-[#a65123] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">Save Invoice</button>
            </div>
          </div>
        )}

        <div className="bg-hover border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-hover border-b border-border text-muted">
              <tr>
                <th className="px-6 py-4 font-medium">Invoice</th>
                <th className="px-6 py-4 font-medium">Project</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Due Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(244,242,238,0.04)]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">No invoices created yet.</td>
                </tr>
              ) : (
                invoices.slice().reverse().map(inv => {
                  const proj = db.projects.find(p => p.id === inv.projectId);
                  return (
                    <tr key={inv.id} className="hover:bg-hover transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-primary font-medium">{inv.title}</p>
                      </td>
                      <td className="px-6 py-4 text-muted">{proj?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-primary">${inv.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-muted">{inv.dueDate}</td>
                      <td className="px-6 py-4">
                        <select
                          value={inv.status}
                          onChange={(e) => handleStatusChange(inv.id, e.target.value as any)}
                          className={`bg-transparent outline-none border-b border-transparent focus:border-slate py-1 ${inv.status === 'paid' ? 'text-accent' : inv.status === 'overdue' ? 'text-red-400' : inv.status === 'sent' ? 'text-accent' : 'text-muted'}`}
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(inv.id)} className="text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Icons.Close size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
