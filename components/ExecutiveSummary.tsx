
import React, { useState, useCallback } from 'react';
import type { ExecutiveSummary as ExecutiveSummaryType, HistoricalAnalysis, ExecutiveSummaryRedirect } from '../types';
import { CopyReportButton } from './CopyReportButton';

const RewriteIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className || ''}`}><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>;
const OptimizeIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className || ''}`}><path d="M11.983 1.904a1.75 1.75 0 00-3.966 0l-3.134 6.346a1.75 1.75 0 001.65 2.503h6.268a1.75 1.75 0 001.65-2.503L11.983 1.904zM10 12.25a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5a.75.75 0 01.75-.75z" /></svg>;
const NewContentIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className || ''}`}><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" /></svg>;
const RedirectIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className || ''}`}><path d="M3 3a1 1 0 000 2h11.586l-2.293 2.293a1 1 0 101.414 1.414l4-4a1 1 0 000-1.414l-4-4a1 1 0 00-1.414 1.414L14.586 3H3z" /><path d="M1e-8 8.25a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H0zM3 13.75a.75.75 0 000 1.5h11.586l-2.293 2.293a.75.75 0 101.06 1.06l3.5-3.5a.75.75 0 000-1.06l-3.5-3.5a.75.75 0 10-1.06 1.06L14.586 13.75H3z" /></svg>;
const DecayIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className || ''}`}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5.5c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V5z" clipRule="evenodd" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;


const CopyRedirectsCsvButton: React.FC<{ redirects: ExecutiveSummaryRedirect[] }> = ({ redirects }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        // Format for common SEO plugins (e.g., Yoast, Rank Math): source,target,type
        const header = "source,target,type\n";
        const csvContent = redirects.map(r => `"${r.from.replace(/"/g, '""')}","${r.to.replace(/"/g, '""')}","301"`).join('\n');
        const fullCsv = header + csvContent;

        navigator.clipboard.writeText(fullCsv).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    }, [redirects]);

    if (!redirects || redirects.length === 0) return null;

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-md transition-all duration-200 ${
                copied
                ? 'bg-green-500/20 text-green-300 ring-1 ring-inset ring-green-500/40'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300 ring-1 ring-inset ring-gray-600'
            }`}
            aria-label="Copy redirects as CSV for WordPress plugins"
            title="Copy redirects in CSV format"
        >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied CSV' : 'Copy for WordPress'}
        </button>
    );
};

const PromptBlock: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    }, [code]);

    return (
        <div className="bg-gray-950 p-3 rounded-lg border border-gray-700/70 relative mt-3">
            <button
                onClick={handleCopy}
                className={`absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-200 ${
                    copied
                    ? 'bg-green-500/20 text-green-300 ring-1 ring-inset ring-green-500/40'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 ring-1 ring-inset ring-gray-600'
                }`}
                aria-label="Copy AI Prompt"
            >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copied!' : 'Copy Prompt'}
            </button>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto pr-24">
                <code>{code}</code>
            </pre>
        </div>
    );
};

interface SectionCardProps {
    items: any[];
    title: string;
    icon: React.ReactNode;
    renderItem: (item: any, index: number) => React.ReactNode;
    actionButton?: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ items, title, icon, renderItem, actionButton }) => {
    if (!items || items.length === 0) return null;
    return (
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700/60">
            <div className="flex justify-between items-center mb-4">
                <h3 className="flex items-center gap-3 font-bold text-lg text-gray-200">
                    {icon}
                    {title} ({items.length})
                </h3>
                {actionButton}
            </div>
            <div className="space-y-4">
                {items.map(renderItem)}
            </div>
        </div>
    );
};

const ActionItem: React.FC<{
    item: { url: string; reason: string; instruction: string; prompt: string; } | { title: string; topic: string; reason: string; prompt: string; }
}> = ({ item }) => {
    const [isPromptVisible, setIsPromptVisible] = useState(false);
    const identifier = 'url' in item ? item.url : item.title;

    return (
        <div className="bg-gray-950/70 p-4 rounded-md border border-gray-700/80">
            <h4 className="font-semibold text-base text-gray-200 break-all">{identifier}</h4>
            {'topic' in item && <p className="text-sm text-gray-400">Topic: {item.topic}</p>}
            <p className="text-sm text-gray-400 mt-2"><strong className="text-gray-300">Reason:</strong> {item.reason}</p>
            {'instruction' in item && <p className="text-sm text-gray-400 mt-1"><strong className="text-gray-300">Instruction:</strong> {item.instruction}</p>}
            <button onClick={() => setIsPromptVisible(!isPromptVisible)} className="text-xs font-semibold text-orange-400 hover:text-orange-300 mt-3">
                {isPromptVisible ? 'Hide AI Prompt' : 'Show AI Prompt'}
            </button>
            {isPromptVisible && <PromptBlock code={item.prompt} />}
        </div>
    );
};

interface ExecutiveSummaryProps {
    summary: ExecutiveSummaryType;
    analysis: HistoricalAnalysis;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ summary, analysis }) => {
    const { summaryTitle, summaryIntroduction, rewrites, optimizations, newContent, redirects, contentDecay } = summary;

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
                        {summaryTitle}
                    </h2>
                    <p className="text-gray-400 mt-2 max-w-3xl">{summaryIntroduction}</p>
                </div>
                <div className="shrink-0">
                    <CopyReportButton analysis={analysis} />
                </div>
            </div>

            <div className="space-y-6">
                 <SectionCard
                    title="Predicted Content Decay"
                    icon={<DecayIcon className="text-yellow-400" />}
                    items={contentDecay}
                    renderItem={(item, index) => <ActionItem key={index} item={item} />}
                />
                 <SectionCard
                    title="Critical Rewrites"
                    icon={<RewriteIcon className="text-red-400" />}
                    items={rewrites}
                    renderItem={(item, index) => <ActionItem key={index} item={item} />}
                />
                 <SectionCard
                    title="High-Impact Optimizations"
                    icon={<OptimizeIcon className="text-blue-400" />}
                    items={optimizations}
                    renderItem={(item, index) => <ActionItem key={index} item={item} />}
                />
                 <SectionCard
                    title="New Content Opportunities"
                    icon={<NewContentIcon className="text-green-400" />}
                    items={newContent}
                    renderItem={(item, index) => <ActionItem key={index} item={item} />}
                />
                <SectionCard
                    title="Critical Redirects"
                    icon={<RedirectIcon className="text-purple-400" />}
                    items={redirects}
                    actionButton={<CopyRedirectsCsvButton redirects={redirects} />}
                    renderItem={(item, index) => (
                         <div key={index} className="bg-gray-950/70 p-3 rounded-md border border-gray-700/80 font-mono text-sm">
                            <p className="text-gray-400">FROM: <span className="text-red-400 break-all">{item.from}</span></p>
                            <p className="text-gray-400 mt-1">TO: <span className="text-green-400 break-all">{item.to}</span></p>
                            <p className="text-xs text-gray-500 mt-2 font-sans italic">Reason: {item.reason}</p>
                        </div>
                    )}
                />
            </div>
        </div>
    );
};
