import React from 'react';
import { Globe, Lock, Code } from 'lucide-react';

const PUBLIC_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/geography/stats', auth: 'None', desc: 'National geography and voter statistics' },
  { method: 'GET', path: '/api/v1/trust/verify/:capsuleId', auth: 'None', desc: 'Verify capsule integrity by ID' },
  { method: 'GET', path: '/api/v1/reporting/results/published', auth: 'Bearer Token', desc: 'Published election results' },
  { method: 'GET', path: '/api/v1/reporting/dashboard', auth: 'Bearer Token', desc: 'National reporting dashboard metrics' },
  { method: 'GET', path: '/api/v1/evidence/capsules?status=PUBLISHED', auth: 'Bearer Token', desc: 'Published evidence capsules' },
  { method: 'GET', path: '/api/v1/geography/counties', auth: 'Bearer Token', desc: 'All 47 counties with stats' },
  { method: 'GET', path: '/api/v1/geography/constituencies', auth: 'Bearer Token', desc: 'All 290 constituencies' },
];

export function APIAccessPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">REST API Access</h2><p className="text-sm text-gray-500">Programmatic access to published election data for accredited observers</p></div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-sky-600" /><h3 className="font-semibold text-gray-900">API Endpoint</h3></div>
        <code className="block text-sm font-mono bg-gray-900 text-emerald-400 rounded-lg px-4 py-3">
          https://483uyy43nc.execute-api.us-east-1.amazonaws.com
        </code>
      </div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-sky-600" /><h3 className="font-semibold text-gray-900">Authentication</h3></div>
        <p className="text-sm text-gray-600 mb-3">Use your observer credentials to obtain a Bearer token:</p>
        <pre className="text-xs font-mono bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto whitespace-pre">{`POST /api/v1/identity/auth/login
Content-Type: application/json

{
  "email": "your-observer@org.example",
  "password": "your-password"
}

# Response
{
  "data": {
    "accessToken": "eyJhbGci..."
  }
}`}</pre>
      </div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4"><Globe className="w-4 h-4 text-sky-600" /><h3 className="font-semibold text-gray-900">Available Endpoints</h3></div>
        <table className="vc-table">
          <thead><tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr></thead>
          <tbody>
            {PUBLIC_ENDPOINTS.map(ep => (
              <tr key={ep.path}>
                <td><span className={`vc-badge font-mono ${ep.method === 'GET' ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600'}`}>{ep.method}</span></td>
                <td className="font-mono text-xs">{ep.path}</td>
                <td><span className={`vc-badge text-xs ${ep.auth === 'None' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{ep.auth}</span></td>
                <td className="text-xs text-gray-600">{ep.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-3"><Code className="w-4 h-4 text-sky-600" /><h3 className="font-semibold text-gray-900">Example Request</h3></div>
        <pre className="text-xs font-mono bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto whitespace-pre">{`curl -H "Authorization: Bearer <your-token>" \\
  https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1/geography/stats`}</pre>
      </div>
    </div>
  );
}
