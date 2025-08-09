import React, { useState } from 'react';
import type { AiConfig, SerpInsights } from '../types';
import { generateSerpInsights } from '../services/aiService';
import { SerpInsightsDisplay } from './SerpInsightsDisplay';
import { SerpQuickWins } from './SerpQuickWins';

interface SerpDeconstructionPanelProps {
  aiConfig: AiConfig;
}

export const SerpDeconstructionPanel: React.FC<SerpDeconstructionPanelProps> = ({ aiConfig }) => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<SerpInsights | null>(null);

  const handleAnalyze = async () => {
    const k = keyword.trim();
    if (!k) return;
    setError(null);
    setLoading(true);
    setInsights(null);
    try {
      const result = await generateSerpInsights(aiConfig, k);
      setInsights(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label htmlFor="serp-keyword" className="block text-sm font-semibold text-gray-400 mb-1">On-Demand SERP Deconstruction</label>
          <input
            id="serp-keyword"
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Enter a target keyword (e.g., best crm for startups)"
            className="w-full px-4 py-2 bg-gray-800/80 text-gray-200 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition duration-200 placeholder-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {aiConfig.provider === 'gemini'
              ? 'Uses live Google Search for up-to-date results.'
              : 'Uses model knowledge. For live data, switch provider to Gemini.'}
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || !keyword.trim()}
          className="px-5 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analyzing…' : 'Analyze SERP'}
        </button>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-300 bg-red-900/20 border border-red-700/40 rounded-md p-3">{error}</div>
      )}

      {insights && (
        <>
          <div className="mt-6">
            <SerpInsightsDisplay insights={insights} aiProvider={aiConfig.provider} />
          </div>
          <SerpQuickWins insights={insights} />
        </>
      )}
    </div>
  );
};
