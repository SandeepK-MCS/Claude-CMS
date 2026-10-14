import React, { useState, useEffect } from 'react';
import { fetchTechnicalDocumentation } from '../api/documentationApi';
import { 
  FileCode, 
  Terminal, 
  Layers, 
  Database, 
  ShieldCheck, 
  CheckCircle2, 
  Copy,
  BookOpen
} from 'lucide-react';

export const TechnicalDocumentationPage: React.FC = () => {
  const [docContent, setDocContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadDoc = async () => {
      try {
        setLoading(true);
        const res = await fetchTechnicalDocumentation();
        setDocContent(res.content || '');
      } catch (err) {
        console.error('Failed to load technical documentation:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDoc();
  }, []);

  const handleCopy = () => {
    if (!docContent) return;
    navigator.clipboard.writeText(docContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Terminal className="w-4 h-4" />
              <span>Developer Reference & Architecture</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-indigo-400" />
              <span>Technical Architecture & Modules Specification</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Complete folder structure, modular .tsx page documentation, API contracts, RBAC security rules, and database schemas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Markdown' : 'Copy Documentation'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Viewer */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 text-slate-200 p-6 shadow-xl overflow-x-auto">
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-xs font-mono">
            Loading technical specifications from filesystem...
          </div>
        ) : (
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-300 selection:bg-indigo-600">
            {docContent || 'Technical documentation file is currently being synced.'}
          </pre>
        )}
      </div>
    </div>
  );
};
