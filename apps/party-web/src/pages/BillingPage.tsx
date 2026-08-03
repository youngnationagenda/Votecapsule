import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Download } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function BillingPage(): React.JSX.Element {
  const { data: invoices } = useQuery({ queryKey: ['billing','invoices'], queryFn: () => apiClient.get('/billing/invoices').then(r => r.data?.data ?? []) });

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Billing</h2><p className="text-sm text-gray-500">Invoices, payments, and billing history</p></div>
      <div className="vc-card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-violet-600" />Invoices</h3>
        {!invoices || invoices.length === 0 ? (
          <div className="text-center py-12"><CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No invoices yet</p></div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Status</th><th>Download</th></tr></thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id}><td className="font-mono text-xs">{inv.invoiceNumber}</td><td>{new Date(inv.createdAt).toLocaleDateString()}</td><td>KES {inv.amount?.toLocaleString()}</td><td><span className={`vc-badge ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span></td><td><button className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"><Download className="w-4 h-4" /></button></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
