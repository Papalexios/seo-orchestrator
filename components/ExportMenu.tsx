import React, { useState } from 'react';
import type { HistoricalAnalysis } from '../types';
import { generateReportMarkdown } from '../utils/reportGenerator';

const download = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const ExportMenu: React.FC<{ analysis: HistoricalAnalysis }> = ({ analysis }) => {
  const [open, setOpen] = useState(false);
  const handleMarkdown = () => download('strategy.md', generateReportMarkdown(analysis), 'text/markdown');
  const handleJson = () => download('strategy.json', JSON.stringify(analysis, null, 2), 'application/json');
  const handleHtml = () => {
    const md = generateReportMarkdown(analysis);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>SEO Strategy</title><style>body{font-family:system-ui,Segoe UI,Roboto,Arial;color:#e5e7eb;background:#0f172a;padding:24px;} h1,h2,h3{color:#fff;} pre,code{white-space:pre-wrap;}</style></head><body><pre>${md.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`;
    download('strategy.html', html, 'text/html');
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o=>!o)} className="w-full px-4 py-2 font-semibold text-white bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition">Export…</button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10">
          <button onClick={handleMarkdown} className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800">Markdown</button>
          <button onClick={handleJson} className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800">JSON</button>
          <button onClick={handleHtml} className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800">HTML</button>
        </div>
      )}
    </div>
  );
};

