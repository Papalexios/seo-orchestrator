


import React, { useState, useCallback } from 'react';
import type { ActionItem, AiConfig, GscTokenResponse, PagePerformance, SnippetOpportunity, SerpInsights, HistoricalAnalysis, PostImplementationReport } from '../types';
import { PromptLibrary } from './PromptLibrary';
import { slugify } from '../utils/utility';
import { Modal } from './Modal';
import { PerformanceDisplay } from './PerformanceDisplay';
import { SnippetDisplay } from './SnippetDisplay';
import { SerpInsightsDisplay } from './SerpInsightsDisplay';
import { ArticleDraftDisplay } from './ArticleDraftDisplay';
import { PerformanceVerdictDisplay } from './PerformanceVerdictDisplay';
import { fetchGscPerformanceForUrl } from '../services/gscService';
import { diagnosePagePerformance, generateSnippetOpportunity, generateSerpInsights, generatePostImplementationVerdict, generateArticleDraft } from '../services/aiService';


const priorityStyles: { [key in ActionItem['priority']]: string } = {
    high: 'border-red-500/80 bg-red-900/30 text-red-300',
    medium: 'border-yellow-500/80 bg-yellow-900/30 text-yellow-300',
    low: 'border-sky-500/80 bg-sky-900/30 text-sky-300',
};

const typeIcons: Record<ActionItem['type'], React.ReactNode> = {
    technical: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.09 3.552A1.75 1.75 0 009.02.884L3.655 4.755a1.75 1.75 0 00-.884 1.528V13.7a1.75 1.75 0 00.884 1.528l5.365 3.87a1.75 1.75 0 002.14 0l5.365-3.87a1.75 1.75 0 00.884-1.528V6.283a1.75 1.75 0 00-.884-1.528L11.09 3.552zM9.75 6.422a.75.75 0 01.75-.75h.001a.75.75 0 01.75.75v3.655a.75.75 0 01-1.5 0V6.422zM10 12a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>,
    content_update: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>,
    new_content: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" /></svg>,
};


const TabButton: React.FC<{ isActive: boolean; onClick: () => void; children: React.ReactNode }> = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
            isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
    >
        {children}
    </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={className}>
        <h4 className="font-semibold text-gray-400 text-sm mb-2">{title}</h4>
        {children}
    </div>
);

const LoadingSpinner: React.FC = () => <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

interface ActionItemCardProps {
    actionItem: ActionItem;
    analysis: HistoricalAnalysis;
    updateAnalysis: (id: string, updatedAnalysis: Partial<HistoricalAnalysis>) => void;
    onToggleTaskComplete: (id: string) => Promise<void>;
    aiConfig: AiConfig;
    gscToken: GscTokenResponse | null;
    isGscConnected: boolean;
    onConnectGscClick: () => void;
    siteUrl: string;
}

export const ActionItemCard: React.FC<ActionItemCardProps> = ({ actionItem, analysis, updateAnalysis, onToggleTaskComplete, aiConfig, gscToken, isGscConnected, siteUrl }) => {
    const [activeTab, setActiveTab] = useState<'implementation' | 'details' | 'prompts' | 'verification' | 'intelligence' | 'performance'>('implementation');
    const [isExpanded, setIsExpanded] = useState(false);
    
    // State for on-demand intelligence
    const [modalContent, setModalContent] = useState<'gsc' | 'snippet' | 'serp' | 'draft' | null>(null);
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [gscPerformance, setGscPerformance] = useState<PagePerformance | null>(null);
    const [snippetOpportunity, setSnippetOpportunity] = useState<SnippetOpportunity | null>(null);
    const [serpInsights, setSerpInsights] = useState<SerpInsights | null>(null);
    const [articleDraft, setArticleDraft] = useState<string>('');

    const { id, title, type, priority, impact, estimatedTime, completed, url, primaryKeyword, completionDate, initialGscPerformance, postImplementationReport } = actionItem;

    const checkboxId = slugify(`task-${id}`);
    
    const handleCloseModal = () => {
        setModalContent(null);
        setError(null);
    }
    
    const updateThisActionItem = (updatedFields: Partial<ActionItem>) => {
        const newActionPlan = JSON.parse(JSON.stringify(analysis.actionPlan));
        for (const day of newActionPlan) {
            const actionIndex = day.actions.findIndex((a: ActionItem) => a.id === id);
            if (actionIndex !== -1) {
                day.actions[actionIndex] = { ...day.actions[actionIndex], ...updatedFields };
                break;
            }
        }
        updateAnalysis(analysis.id, { actionPlan: newActionPlan });
    };

    const handleGscAnalysis = useCallback(async () => {
        if (!url || !gscToken?.access_token) return;
        setIsLoading('gsc');
        setError(null);
        try {
            const performanceData = await fetchGscPerformanceForUrl(url, siteUrl, gscToken.access_token);
            if (!performanceData) throw new Error("No performance data found for this URL in Google Search Console.");
            const diagnosis = await diagnosePagePerformance(aiConfig, url, performanceData);
            setGscPerformance(diagnosis);
            setModalContent('gsc');
        } catch(e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setModalContent('gsc');
        } finally {
            setIsLoading(null);
        }
    }, [url, siteUrl, gscToken, aiConfig]);
    
    const handleSnippetAnalysis = useCallback(async () => {
        if (!url) return;
        setIsLoading('snippet');
        setError(null);
        try {
            const result = await generateSnippetOpportunity(aiConfig, url);
            setSnippetOpportunity(result);
            setModalContent('snippet');
        } catch(e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setModalContent('snippet');
        } finally {
            setIsLoading(null);
        }
    }, [url, aiConfig]);

    const handleSerpAnalysis = useCallback(async () => {
        if (!primaryKeyword) return;
        setIsLoading('serp');
        setError(null);
        try {
            const result = await generateSerpInsights(aiConfig, primaryKeyword);
            setSerpInsights(result);
            setModalContent('serp');
        } catch(e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setModalContent('serp');
        } finally {
            setIsLoading(null);
        }
    }, [primaryKeyword, aiConfig]);

    const handleGenerateArticleDraft = useCallback(async () => {
        if (type !== 'new_content') return;
        
        // Find the keyword idea that corresponds to this action item
        const keywordIdea = analysis.analysis.keywords.find(kw => kw.title === title);
        if (!keywordIdea) {
            setError("Could not find the original keyword brief for this action item.");
            setModalContent('draft');
            return;
        }

        setIsLoading('draft');
        setError(null);
        try {
            const result = await generateArticleDraft(aiConfig, keywordIdea);
            setArticleDraft(result);
            setModalContent('draft');
        } catch(e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred while generating the draft.');
            setModalContent('draft');
        } finally {
            setIsLoading(null);
        }
    }, [type, title, analysis.analysis.keywords, aiConfig]);
    
    const handlePostImplementationCheck = useCallback(async () => {
        if (!url || !gscToken?.access_token || !initialGscPerformance) return;
        setIsLoading('performance-check');
        setError(null);
        try {
            const newData = await fetchGscPerformanceForUrl(url, siteUrl, gscToken.access_token);
            if (!newData) throw new Error("Could not fetch new performance data for this URL. It may not have any impressions in the last 90 days.");
            
            const verdictReport = await generatePostImplementationVerdict(aiConfig, initialGscPerformance.metrics, newData);
            updateThisActionItem({ postImplementationReport: verdictReport });

        } catch(e) {
             setError(e instanceof Error ? e.message : 'An unknown error occurred during performance check.');
        } finally {
            setIsLoading(null);
        }
    }, [url, gscToken, aiConfig, initialGscPerformance, siteUrl, updateThisActionItem]);


    const renderModalContent = () => {
        if (error) {
            return <p className="text-red-400 bg-red-900/50 p-4 rounded-lg border border-red-600">{error}</p>;
        }
        switch(modalContent) {
            case 'gsc': return gscPerformance ? <PerformanceDisplay performance={gscPerformance} isGscConnected={isGscConnected} /> : null;
            case 'snippet': return snippetOpportunity ? <SnippetDisplay snippet={snippetOpportunity} /> : null;
            case 'serp': return serpInsights ? <SerpInsightsDisplay insights={serpInsights} /> : null;
            case 'draft': return articleDraft ? <ArticleDraftDisplay draft={articleDraft} /> : null;
            default: return null;
        }
    }
    
    const getModalTitle = () => {
        switch(modalContent) {
            case 'gsc': return `GSC Performance Diagnosis for: ${url}`;
            case 'snippet': return `Snippet Opportunity for: ${url}`;
            case 'serp': return `SERP Insights for: ${primaryKeyword}`;
            case 'draft': return `Generated Article Draft for: ${title}`;
            default: return 'Intelligence On-Demand';
        }
    }

    const isGeminiProvider = aiConfig.provider === 'gemini';

    return (
        <>
        {modalContent && (
            <Modal title={getModalTitle()} onClose={handleCloseModal}>
                {renderModalContent()}
            </Modal>
        )}
        <div className={`p-4 rounded-lg border-l-4 transition-all duration-300 ${priorityStyles[priority]} ${completed ? 'opacity-60 bg-gray-900/20' : ''}`}>
            <div className="flex items-start gap-4">
                <div className="flex items-center h-6 pt-1">
                    <input
                        id={checkboxId}
                        type="checkbox"
                        checked={completed}
                        onChange={() => onToggleTaskComplete(id)}
                        className="h-5 w-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-600 focus:ring-offset-gray-900"
                    />
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start">
                        <label htmlFor={checkboxId} className={`font-semibold text-lg cursor-pointer ${completed ? 'line-through text-gray-400' : 'text-gray-100'}`}>
                            {title}
                        </label>
                         <button onClick={() => setIsExpanded(!isExpanded)} className={`ml-4 p-1 rounded-full hover:bg-gray-700 text-gray-400 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-800/70 capitalize">
                            {typeIcons[type]} {type.replace('_', ' ')}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-green-400" title="Estimated business impact">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 10.843l1.928-5.322a.75.75 0 00-1.456-.528l-2.433 6.723a.75.75 0 00.26 1.01l3.567 2.082a.75.75 0 001.036-.953l-1.895-3.002z" /><path d="M4.5 9.343a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75zM5.25 12.093a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-2.5zM6 15.593a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75z" /></svg>
                            Impact: {impact}/10
                        </span>
                        <span className="flex items-center gap-1.5" title="Estimated time to complete">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
                            {estimatedTime}
                        </span>
                    </div>
                </div>
            </div>

            <div className={`pl-9 transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1500px] mt-4' : 'max-h-0'}`}>
                <div className="space-y-4">
                    <div className="p-1 bg-gray-800/50 rounded-lg inline-flex items-center gap-1 flex-wrap">
                        <TabButton isActive={activeTab === 'implementation'} onClick={() => setActiveTab('implementation')}>Implementation</TabButton>
                        <TabButton isActive={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')}>Intelligence</TabButton>
                        <TabButton isActive={activeTab === 'performance'} onClick={() => setActiveTab('performance')}>Performance</TabButton>
                        <TabButton isActive={activeTab === 'prompts'} onClick={() => setActiveTab('prompts')}>AI Prompts</TabButton>
                        <TabButton isActive={activeTab === 'verification'} onClick={() => setActiveTab('verification')}>Verification</TabButton>
                        <TabButton isActive={activeTab === 'details'} onClick={() => setActiveTab('details')}>Details</TabButton>
                    </div>

                    <div className="p-4 bg-gray-950/50 rounded-lg border border-gray-700/60 min-h-[100px] animate-fade-in">
                        {activeTab === 'implementation' && (
                            <ol className="space-y-3 text-sm list-decimal list-inside text-gray-300">
                                {actionItem.stepByStepImplementation.map((step, index) => <li key={index}>{step.replace(/^\d+\.\s*/, '')}</li>)}
                            </ol>
                        )}
                        {activeTab === 'intelligence' && (
                            <div className='space-y-4'>
                                <h4 className="font-semibold text-gray-300 text-base mb-2">Intelligence On-Demand</h4>
                                <p className="text-xs text-gray-500 -mt-2">Run deeper, real-time analysis on this specific task.</p>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <button onClick={handleGenerateArticleDraft} disabled={type !== 'new_content' || isLoading === 'draft'} className="flex items-center justify-center text-center gap-2 p-3 text-sm font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed disabled:text-gray-500 text-white transition-colors">
                                        {isLoading === 'draft' ? <LoadingSpinner /> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>}
                                        <span>Generate Draft</span>
                                    </button>
                                     <button onClick={handleSnippetAnalysis} disabled={!isGeminiProvider || !url || isLoading === 'snippet'} title={!isGeminiProvider ? 'Requires Gemini for live search' : ''} className="flex items-center justify-center text-center gap-2 p-3 text-sm font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed disabled:text-gray-500 text-white transition-colors">
                                        {isLoading === 'snippet' ? <LoadingSpinner /> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6 3a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V4a1 1 0 00-1-1H6zM8 3a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V4a1 1 0 00-1-1H8zM6 7a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1H6zM12 7a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1h-1zM4.75 2A.75.75 0 004 2.75v14.5a.75.75 0 00.75.75h10.5a.75.75 0 00.75-.75V8.75a.75.75 0 00-1.5 0v8.5H5.5V3.5h3.25a.75.75 0 000-1.5H4.75z" /><path d="M12.5 2.25a.75.75 0 00-1.5 0v1a.75.75 0 001.5 0v-1zM10.75 5a.75.75 0 000-1.5h1a.75.75 0 000 1.5h-1z" /></svg>}
                                        <span>Snippet Opportunity</span>
                                    </button>
                                    <button onClick={handleSerpAnalysis} disabled={!isGeminiProvider || !primaryKeyword || isLoading === 'serp'} title={!isGeminiProvider ? 'Requires Gemini for live search' : ''} className="flex items-center justify-center text-center gap-2 p-3 text-sm font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed disabled:text-gray-500 text-white transition-colors">
                                        {isLoading === 'serp' ? <LoadingSpinner /> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>}
                                        <span>SERP Insights</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'performance' && (
                             <div>
                                {!isGscConnected ? (
                                    <p className="text-center text-sm text-yellow-400 py-4">Connect to Google Search Console to use this feature.</p>
                                ) : !completed ? (
                                    <p className="text-center text-sm text-gray-500 py-4">Complete this task to capture initial performance data.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {isLoading === 'performance-check' && <div className="flex justify-center py-4"><LoadingSpinner/></div>}
                                        {error && <p className="text-red-400 p-3 bg-red-900/40 rounded-md">{error}</p>}

                                        {postImplementationReport ? (
                                            <PerformanceVerdictDisplay report={postImplementationReport} />
                                        ) : initialGscPerformance ? (
                                            <div>
                                                <h4 className="font-semibold text-gray-300">Initial Performance Snapshot</h4>
                                                <p className="text-xs text-gray-500 mb-2">Captured on {new Date(completionDate!).toLocaleDateString()}</p>
                                                <PerformanceDisplay performance={initialGscPerformance} isGscConnected={true} />
                                                 <button onClick={handlePostImplementationCheck} disabled={isLoading === 'performance-check'} className="mt-4 w-full flex items-center justify-center text-center gap-2 p-3 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 text-white transition-colors">
                                                    {isLoading === 'performance-check' ? <LoadingSpinner/> : 'Run Post-Implementation Check'}
                                                </button>
                                            </div>
                                        ) : initialGscPerformance === null ? (
                                            <p className="text-center text-sm text-gray-500 py-4">Could not retrieve initial performance data for this URL when the task was completed.</p>
                                        ) : (
                                            <div className="flex justify-center py-4"><LoadingSpinner/></div>
                                        )
                                        }
                                    </div>
                                )}
                            </div>
                        )}
                         {activeTab === 'details' && (
                            <div className="grid md:grid-cols-2 gap-6 text-sm">
                                <Section title="Tools Required">
                                    <ul className="space-y-2">
                                        {actionItem.toolsRequired.map((tool, index) => (
                                            <li key={index} className="flex items-center gap-2 text-gray-300">
                                                <span>-</span>
                                                {tool.url ? <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{tool.name}</a> : <span>{tool.name}</span>}
                                            </li>
                                        ))}
                                        {actionItem.toolsRequired.length === 0 && <span className="text-gray-500 italic">None</span>}
                                    </ul>
                                </Section>
                                <Section title="Dependencies">
                                     <ul className="space-y-2">
                                        {actionItem.dependencies.map((dep, index) => <li key={index} className="text-gray-300">- {dep}</li>)}
                                        {actionItem.dependencies.length === 0 && <span className="text-gray-500 italic">None</span>}
                                    </ul>
                                </Section>
                                <Section title="Next Steps" className="md:col-span-2">
                                    <ul className="space-y-3">
                                        {actionItem.nextSteps.map((step, index) => (
                                            <li key={index} className="text-gray-300 bg-gray-800/50 p-3 rounded-md border border-gray-700">
                                                <p className="font-semibold">{step.action}</p>
                                                <p className="text-xs text-gray-400 mt-1">{step.rationale}</p>
                                            </li>
                                        ))}
                                        {actionItem.nextSteps.length === 0 && <span className="text-gray-500 italic">None</span>}
                                    </ul>
                                </Section>
                            </div>
                         )}
                        {activeTab === 'prompts' && <PromptLibrary prompts={actionItem.prompts} />}
                        {activeTab === 'verification' && (
                            <div className="grid md:grid-cols-2 gap-6 text-sm">
                                 <Section title="Implementation Checklist">
                                     <ul className="space-y-3">
                                        {actionItem.verificationChecklist.map((check, index) => (
                                            <li key={index} className="flex items-start gap-3">
                                                <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-600 bg-gray-900 shrink-0"></div>
                                                <span className="text-gray-300">{check.item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                 </Section>
                                <Section title="Success Metrics">
                                    <ul className="space-y-3">
                                        {actionItem.successVerification.map((sv, index) => (
                                            <li key={index} className="bg-gray-800/50 p-3 rounded-md border border-gray-700">
                                                <p className="font-semibold text-teal-300">{sv.method}</p>
                                                <p className="text-gray-300 mt-1">{sv.metric}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </Section>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};