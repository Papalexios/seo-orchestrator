import React from 'react';
import type { HistoricalAnalysis } from '../types';

const inferFixPacks = (analysis: HistoricalAnalysis) => {
  const packs: { title: string; why: string; steps: string[] }[] = [];
  const hasTechIssues = analysis?.sitewideAnalysis?.technicalHealth?.issues?.length > 0;
  const hasContentGaps = (analysis?.sitewideAnalysis as any)?.contentGaps?.length > 0;
  const hasRefreshTasks = (analysis?.analysis?.pageActions || []).some(a => /refresh|update|rewrite/i.test(a.action || ''));

  if (hasTechIssues) packs.push({
    title: 'Technical SEO Fix Pack',
    why: 'Resolve systemic technical blockers degrading crawlability and rankings.',
    steps: [
      'Prioritize issues by severity and impact; create a JIRA epic.',
      'Implement fixes in a feature branch with automated tests.',
      'Run sitewide re-crawl and verify Core Web Vitals and indexability.',
    ],
  });

  if (hasContentGaps) packs.push({
    title: 'Content Gap Expansion Pack',
    why: 'Fill topical gaps versus competitors; strengthen semantic coverage.',
    steps: [
      'Generate briefs for gap topics with SERP and LSI references.',
      'Create pillar pages and interlink cluster content.',
      'Publish and monitor impressions/clicks via GSC weekly.',
    ],
  });

  if (hasRefreshTasks) packs.push({
    title: 'Content Refresh Pack',
    why: 'Lift decayed or underperforming content with targeted rewrites and UX improvements.',
    steps: [
      'Identify decayed pages; add clear H2/H3 structure matching current SERP intent.',
      'Update stats, screenshots, and internal links to newer assets.',
      'Re-request indexing and track CTR/position shifts.',
    ],
  });

  if (packs.length === 0) packs.push({
    title: 'Quality Hardening Pack',
    why: 'No critical packs detected; harden quality and monitoring.',
    steps: [
      'Add editorial checklist to all content workflows.',
      'Implement schema/FAQ where relevant; validate with Rich Results.',
      'Set up weekly SERP+GSC review and anomaly alerts.',
    ],
  });

  return packs;
};

export const FixPacks: React.FC<{ analysis: HistoricalAnalysis }> = ({ analysis }) => {
  const packs = inferFixPacks(analysis);
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
      <h3 className="text-xl font-bold text-gray-200">Template‑Quality Fix Packs</h3>
      <p className="text-gray-400 text-sm mt-1">Ready‑to‑use bundles to accelerate implementation.</p>
      <div className="mt-4 grid md:grid-cols-2 gap-4">
        {packs.map((p, i) => (
          <div key={i} className="bg-gray-950/60 border border-gray-800 rounded-lg p-4">
            <div className="font-semibold text-gray-200">{p.title}</div>
            <div className="text-xs text-gray-400 mb-2">{p.why}</div>
            <ol className="list-decimal list-inside text-gray-300 space-y-1">
              {p.steps.map((s, j) => <li key={j}>{s}</li>)}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
};

