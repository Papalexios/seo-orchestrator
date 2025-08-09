import React from 'react';
import type { SerpInsights } from '../types';

export const SerpQuickWins: React.FC<{ insights: SerpInsights }> = ({ insights }) => {
  const hasAO = !!insights.aiOverview;
  const hasPAA = (insights.peopleAlsoAsk || []).length > 0;
  const hasRelated = (insights.relatedSearches || []).length > 0;

  const quickWins: string[] = [];
  if (hasAO) quickWins.push('Create a highly-structured, scannable overview section to align with AI Overview.');
  if (hasPAA) quickWins.push('Add an FAQ section covering top People Also Ask questions with rich answers.');
  if (hasRelated) quickWins.push('Expand content to address related searches as sub-sections or supporting posts.');

  return (
    <div className="mt-4 bg-gray-900/80 border border-gray-800 rounded-xl p-4">
      <h4 className="text-lg font-semibold text-gray-200">Quick Wins</h4>
      <ul className="mt-2 list-disc list-inside text-gray-300 space-y-1">
        {quickWins.map((w, i) => <li key={i}>{w}</li>)}
        {quickWins.length === 0 && <li className="text-gray-500">No obvious quick wins detected.</li>}
      </ul>
      <div className="mt-4">
        <h5 className="text-sm font-semibold text-gray-400">SERP Feature Heatmap</h5>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div className={`p-2 rounded-md text-center ${hasAO ? 'bg-purple-900/50 border border-purple-700/50 text-purple-200' : 'bg-gray-800 text-gray-400'}`}>AI Overview</div>
          <div className={`p-2 rounded-md text-center ${hasPAA ? 'bg-blue-900/50 border border-blue-700/50 text-blue-200' : 'bg-gray-800 text-gray-400'}`}>People Also Ask</div>
          <div className={`p-2 rounded-md text-center ${hasRelated ? 'bg-green-900/50 border border-green-700/50 text-green-200' : 'bg-gray-800 text-gray-400'}`}>Related Searches</div>
        </div>
      </div>
    </div>
  );
};

