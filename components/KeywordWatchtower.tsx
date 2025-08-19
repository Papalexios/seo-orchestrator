

import React, { useState, useCallback } from 'react';
import type { WatchedKeyword, AiConfig, SerpInsights } from '../types';
import { slugify } from '../utils/utility';
import { generateSerpInsights, generateSerpComparison } from '../services/aiService';
import { Modal } from './Modal';
import { SerpInsightsDisplay } from './SerpInsightsDisplay';

const LoadingSpinner: React.FC = () => <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const AlertIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-400"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>;


interface KeywordWatchtowerProps {
    watchedKeywords: WatchedKeyword[];
    onUpdate: (keywords: WatchedKeyword[]) => void;
    aiConfig: AiConfig;
}

export const KeywordWatchtower: React.FC<KeywordWatchtowerProps> = ({ watchedKeywords, onUpdate, aiConfig }) => {
    const [newKeyword, setNewKeyword] = useState('');
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [comparingKeyword, setComparingKeyword] = useState<WatchedKeyword | null>(null);

    const isGeminiProvider = aiConfig.provider === 'gemini';

    const handleAddKeyword = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedKeyword = newKeyword.trim();
        if (trimmedKeyword && !watchedKeywords.find(kw => kw.keyword === trimmedKeyword)) {
            const newEntry: WatchedKeyword = {
                id: slugify(trimmedKeyword),
                keyword: trimmedKeyword,
                lastChecked: null,
                baseline: null,
                latest: null,
                alert: null,
            };
            onUpdate([...watchedKeywords, newEntry]);
            setNewKeyword('');
        }
    };

    const handleRemoveKeyword = (id: string) => {
        onUpdate(watchedKeywords.filter(kw => kw.id !== id));
    };

    const handleCheckKeyword = useCallback(async (keyword: string) => {
        if (!isGeminiProvider) return;
        
        setIsLoading(keyword);
        setError(null);
        try {
            const insights = await generateSerpInsights(aiConfig, keyword);
            const currentKeywordState = watchedKeywords.find(kw => kw.keyword === keyword);

            let newAlert: string | null = null;
            if (currentKeywordState?.baseline) {
                try {
                    newAlert = await generateSerpComparison(aiConfig, currentKeywordState.baseline, insights);
                } catch (comparisonError) {
                    console.error(`Failed to generate SERP comparison for "${keyword}":`, comparisonError);
                    newAlert = "Alert: Could not automatically analyze changes.";
                }
            }

            const updatedKeywords = watchedKeywords.map(kw => {
                if (kw.keyword === keyword) {
                    return {
                        ...kw,
                        lastChecked: new Date().toISOString(),
                        latest: insights,
                        baseline: kw.baseline || insights, 
                        alert: newAlert,
                    };
                }
                return kw;
            });
            onUpdate(updatedKeywords);
            
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(null);
        }
    }, [aiConfig, isGeminiProvider, watchedKeywords, onUpdate]);


    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            {comparingKeyword && comparingKeyword.baseline && comparingKeyword.latest && (
                <Modal title={`SERP Comparison for: "${comparingKeyword.keyword}"`} onClose={() => setComparingKeyword(null)}>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold text-lg text-gray-300 mb-2">Baseline Snapshot</h3>
                            <SerpInsightsDisplay insights={comparingKeyword.baseline} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-300 mb-2">Latest Snapshot</h3>
                            <SerpInsightsDisplay insights={comparingKeyword.latest} />
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-200">Keyword Watchtower</h2>
                    <p className="text-gray-400">Proactively monitor your most critical keywords for SERP changes.</p>
                </div>
            </div>

            <form onSubmit={handleAddKeyword} className="mb-6 flex flex-col sm:flex-row gap-2">
                 <input
                    type="text"
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    placeholder="Enter a keyword to monitor..."
                    className="flex-grow w-full px-4 py-3 bg-gray-800/80 text-gray-200 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 placeholder-gray-500"
                 />
                 <button type="submit" disabled={!newKeyword} className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed">Add Keyword</button>
            </form>
            
            {!isGeminiProvider && (
                 <p className="text-xs text-center text-yellow-400 mb-4 p-2 bg-yellow-900/40 rounded-md">
                    Keyword monitoring requires the Gemini provider for live Google Search capabilities.
                </p>
            )}

            <div className="space-y-3">
                {watchedKeywords.length === 0 ? (
                    <p className="text-center text-gray-500 py-6">No keywords being watched.</p>
                ) : (
                    watchedKeywords.map(kw => (
                        <div key={kw.id} className="p-3 bg-gray-800/60 rounded-lg animate-fade-in border border-transparent hover:border-gray-700 transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-200">{kw.keyword}</p>
                                    <p className="text-xs text-gray-500">
                                        Last checked: {kw.lastChecked ? new Date(kw.lastChecked).toLocaleString() : 'Never'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button
                                        onClick={() => setComparingKeyword(kw)}
                                        disabled={!kw.baseline || !kw.latest}
                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-md disabled:bg-gray-700/50 disabled:cursor-not-allowed disabled:text-gray-500"
                                        title="View comparison"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => handleCheckKeyword(kw.keyword)}
                                        disabled={!isGeminiProvider || isLoading === kw.keyword}
                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                        {isLoading === kw.keyword ? <LoadingSpinner/> : 'Check Now'}
                                    </button>
                                    <button
                                        onClick={() => handleRemoveKeyword(kw.id)}
                                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-full"
                                        aria-label={`Remove ${kw.keyword}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                            {kw.alert && (
                                <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/40 rounded-md text-yellow-300 text-sm flex items-start gap-2">
                                    <AlertIcon />
                                    <span className="flex-1">{kw.alert}</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
             {error && <p className="text-red-400 text-xs text-center mt-4">{error}</p>}
        </div>
    );
};