

import React, { useState, useMemo } from 'react';
import type { SitewideAnalysis, TechnicalAudit, ContentGap, TopicCluster, LocalBusinessAudit, ZeroToOneInitiative, InternalLinkingAnalysis, CannibalizationAnalysis } from '../types';
import { SiteArchitectureGraph } from './SiteArchitectureGraph';

const ChevronIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

const AccordionItem: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-gray-800 rounded-lg bg-gray-900/50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left font-semibold text-lg text-gray-200 hover:bg-gray-800/50 rounded-t-lg transition-colors"
                aria-expanded={isOpen}
            >
                {title}
                <ChevronIcon isOpen={isOpen} />
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
                <div className="p-4 border-t border-gray-800">
                    {children}
                </div>
            </div>
        </div>
    );
};

const HealthStatus: React.FC<{ status: TechnicalAudit['status'] | LocalBusinessAudit['status'] }> = ({ status }) => {
    const styles = {
        good: 'bg-green-500/20 text-green-300',
        needs_improvement: 'bg-yellow-500/20 text-yellow-300',
        poor: 'bg-red-500/20 text-red-300',
    };
    const text = status.replace('_', ' ');
    return <span className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${styles[status]}`}>{text}</span>;
}

const TechnicalHealthSection: React.FC<{ health: TechnicalAudit }> = ({ health }) => (
    <div className="space-y-4 text-gray-300">
        <p className="italic">"{health.summary}"</p>
        <h4 className="font-semibold text-gray-400">Recommended Actions:</h4>
        <ul className="space-y-2">
            {health.actionItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3 bg-gray-950/50 p-3 rounded-md border border-gray-700">
                    <span className="text-blue-400 font-bold">{index + 1}.</span>
                    <div className="flex-1">
                        <p>{item.item}</p>
                        <span className={`text-xs capitalize font-semibold ${item.priority === 'high' ? 'text-red-400' : item.priority === 'medium' ? 'text-yellow-400' : 'text-sky-400'}`}>
                            {item.priority} Priority
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

const LocalBusinessAuditSection: React.FC<{ audit: LocalBusinessAudit }> = ({ audit }) => (
    <div className="space-y-6 text-gray-300">
        <p className="italic">"{audit.summary}"</p>
        
        {audit.actionItems.length > 0 && (
            <div>
                <h4 className="font-semibold text-gray-400">Your Local SEO Checklist:</h4>
                <ul className="space-y-2 mt-2">
                    {audit.actionItems.map((item, index) => (
                        <li key={index} className="bg-gray-950/50 p-3 rounded-md border border-gray-700">
                            <div className="flex items-start gap-3">
                                <input type="checkbox" checked={item.checked} readOnly className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 shrink-0" />
                                <div className="flex-1">
                                    <p>{item.item}</p>
                                    <p className="text-xs text-gray-400 mt-1">{item.details}</p>
                                    <span className={`text-xs capitalize font-semibold ${item.priority === 'high' ? 'text-red-400' : item.priority === 'medium' ? 'text-yellow-400' : 'text-sky-400'}`}>
                                        {item.priority} Priority
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        )}

        {audit.competitorGbpAnalysis?.length > 0 && (
            <div>
                <h4 className="font-semibold text-gray-400">Local Pack Competitor Analysis:</h4>
                <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-800/50 text-xs text-gray-400 uppercase">
                            <tr>
                                <th className="p-3">Competitor</th>
                                <th className="p-3 text-center">Reviews</th>
                                <th className="p-3 text-center">Rating</th>
                                <th className="p-3">Velocity</th>
                                <th className="p-3">Sentiment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {audit.competitorGbpAnalysis.map((comp, index) => (
                                <tr key={index} className="bg-gray-950/50 hover:bg-gray-900/50">
                                    <td className="p-3 font-semibold text-gray-200">{comp.name}</td>
                                    <td className="p-3 text-center">{comp.reviewCount}</td>
                                    <td className="p-3 text-center">{comp.rating.toFixed(1)} ⭐</td>
                                    <td className="p-3 text-teal-300">{comp.reviewVelocity || 'N/A'}</td>
                                    <td className="p-3 text-purple-300">{comp.reviewSentiment || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
);

const InternalLinkingSection: React.FC<{ analysis: InternalLinkingAnalysis }> = ({ analysis }) => (
    <div className="space-y-4 text-gray-300">
        <p className="italic">"{analysis.summary}"</p>
        <h4 className="font-semibold text-gray-400">Top Internal Linking Opportunities:</h4>
        <ul className="space-y-3">
            {analysis.opportunities.map((opp, index) => (
                <li key={index} className="bg-gray-950/50 p-3 rounded-md border border-gray-700">
                    <p>🔗 Link from <a href={opp.fromUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline break-all">...{opp.fromUrl.slice(-50)}</a> to <a href={opp.toUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline break-all">...{opp.toUrl.slice(-50)}</a></p>
                    <p className="mt-1">Anchor Text: <strong className="text-gray-200">"{opp.anchorText}"</strong></p>
                    <p className="text-xs text-gray-400 italic mt-2">Rationale: {opp.rationale}</p>
                </li>
            ))}
        </ul>
    </div>
);

const CannibalizationSection: React.FC<{ analysis: CannibalizationAnalysis[] }> = ({ analysis }) => (
    <div className="space-y-4 text-gray-300">
        {analysis.map((item, index) => (
            <div key={index} className="bg-gray-950/50 p-4 rounded-lg border border-red-500/30">
                <h4 className="font-semibold text-lg text-red-400">Keyword: "{item.keyword}"</h4>
                <div className="mt-3">
                    <p className="text-sm font-semibold text-gray-400">Competing URLs:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1 font-mono text-sm">
                        {item.competingUrls.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{url}</a></li>)}
                    </ul>
                </div>
                <div className="mt-3">
                     <p className="text-sm font-semibold text-gray-400">Recommended Resolution:</p>
                     <p className="bg-gray-800/70 p-3 rounded-md mt-1">{item.resolution}</p>
                </div>
                 <p className="text-xs text-gray-400 italic mt-3">Rationale: {item.rationale}</p>
            </div>
        ))}
    </div>
);

const ContentGapsSection: React.FC<{ gaps: ContentGap[] }> = ({ gaps }) => (
    <div className="space-y-4">
        {gaps.map((gap, index) => (
            <div key={index} className="bg-gray-950/50 p-4 rounded-lg border border-gray-700 space-y-3">
                <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-lg text-teal-300">{gap.topic}</h4>
                    {gap.competitorSource && <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">vs {gap.competitorSource}</span>}
                </div>
                <p className="text-sm text-gray-300 italic border-l-2 border-gray-600 pl-3">"{gap.rationale}"</p>
                <div>
                    <p className="text-sm font-semibold text-gray-400">Suggested Title:</p>
                    <p className="text-sm text-gray-200">{gap.suggestedTitle}</p>
                </div>
                 <div>
                    <p className="text-sm font-semibold text-gray-400">Keyword Ideas:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {gap.keywordIdeas.map(kw => <span key={kw} className="text-xs font-medium bg-teal-900/50 text-teal-300 px-2 py-1 rounded-full">{kw}</span>)}
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const ZeroToOneInitiativesSection: React.FC<{ initiatives: ZeroToOneInitiative[] }> = ({ initiatives }) => (
     <div className="space-y-4">
        {initiatives.map((item, index) => (
            <div key={index} className="bg-gray-950/50 p-4 rounded-lg border border-gray-700 space-y-3">
                <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-lg text-orange-400">{item.initiativeName}</h4>
                    <span className="text-xs font-semibold uppercase text-orange-300 bg-orange-900/50 px-2 py-1 rounded-full">{item.initiativeType.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm text-gray-300">{item.description}</p>
                <div>
                    <p className="text-sm font-semibold text-gray-400">Strategic Rationale:</p>
                    <p className="text-sm text-gray-300 italic border-l-2 border-gray-600 pl-3 mt-1">"{item.strategicRationale}"</p>
                </div>
            </div>
        ))}
    </div>
);

const TopicClustersSection: React.FC<{ clusters: TopicCluster[] }> = ({ clusters }) => (
     <div className="space-y-6">
        {clusters.map((cluster, index) => (
            <div key={index} className="bg-gray-950/50 p-4 rounded-lg border border-gray-700">
                <h4 className="font-semibold text-lg text-purple-300 mb-3">{cluster.clusterName}</h4>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-semibold text-gray-400">Pillar Page:</p>
                        <a href={cluster.pillarPage} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline break-all">{cluster.pillarPage}</a>
                    </div>
                     <div>
                        <p className="text-sm font-semibold text-gray-400">Fortification Plan:</p>
                        <ul className="space-y-2 mt-2">
                           {cluster.fortificationPlan.map((link, linkIndex) => (
                               <li key={linkIndex} className="text-sm bg-gray-800/70 p-3 rounded-md border border-gray-700">
                                   <p>
                                       Link from <a href={link.linkFrom} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline break-all">...{link.linkFrom.slice(-50)}</a>
                                       <br/>
                                       to <a href={link.linkTo} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline break-all">...{link.linkTo.slice(-50)}</a>
                                   </p>
                                   <p className="mt-1">With anchor text: <strong className="text-gray-200">"{link.anchorText}"</strong></p>
                                   <p className="text-xs text-gray-400 italic mt-1">Reason: {link.reason}</p>
                               </li>
                           ))}
                        </ul>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

type PrioritizedItem = (ContentGap & { type: 'Content Gap' }) | (TopicCluster & { type: 'Topic Cluster' }) | (ZeroToOneInitiative & { type: 'Initiative' });

const PriorityMatrix: React.FC<{ items: PrioritizedItem[] }> = ({ items }) => {
    const sortedItems = useMemo(() => {
        return items.sort((a, b) => {
            const scoreA = a.impact / (a.effort || 1);
            const scoreB = b.impact / (b.effort || 1);
            return scoreB - scoreA;
        });
    }, [items]);

    const quickWins = sortedItems.filter(item => item.impact >= 6 && item.effort <= 5);
    const strategicProjects = sortedItems.filter(item => item.impact >= 6 && item.effort > 5);

    if (items.length === 0) return null;

    return (
        <div className="bg-gray-950/50 border border-gray-700 rounded-lg p-6">
            <h3 className="font-bold text-xl text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 pb-1 mb-6">
                Strategic Priority Matrix
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <h4 className="font-semibold text-lg text-green-400">🚀 Quick Wins (High Impact, Low Effort)</h4>
                    {quickWins.length > 0 ? quickWins.map((item, i) => <PriorityItem key={i} item={item} />) : <p className="text-sm text-gray-500 italic">No high-impact, low-effort items identified.</p>}
                </div>
                <div className="space-y-3">
                    <h4 className="font-semibold text-lg text-yellow-400">🏛️ Strategic Projects (High Impact, High Effort)</h4>
                    {strategicProjects.length > 0 ? strategicProjects.map((item, i) => <PriorityItem key={i} item={item} />) : <p className="text-sm text-gray-500 italic">No high-impact, high-effort items identified.</p>}
                </div>
            </div>
        </div>
    );
};

const PriorityItem: React.FC<{ item: PrioritizedItem }> = ({ item }) => {
    const name = item.type === 'Content Gap' ? item.topic : item.type === 'Topic Cluster' ? item.clusterName : item.initiativeName;
    const typeColor = item.type === 'Content Gap' ? 'text-teal-400' : item.type === 'Topic Cluster' ? 'text-purple-400' : 'text-orange-400';

    return (
        <div className="bg-gray-900/70 p-3 rounded-md border border-gray-800">
            <p className="font-semibold text-gray-200 text-base">{name}</p>
            <div className="flex items-center gap-4 text-xs mt-1.5">
                <span className="font-medium text-green-400">Impact: {item.impact}/10</span>
                <span className="font-medium text-yellow-400">Effort: {item.effort}/10</span>
                <span className={`font-medium ${typeColor}`}>{item.type}</span>
            </div>
        </div>
    );
}

interface SitewideAuditDisplayProps {
    audit: SitewideAnalysis;
}

export const SitewideAuditDisplay: React.FC<SitewideAuditDisplayProps> = ({ audit }) => {
    const prioritizedItems: PrioritizedItem[] = useMemo(() => [
        ...audit.contentGaps.map(g => ({ ...g, type: 'Content Gap' as const })),
        ...audit.topicClusters.map(c => ({ ...c, type: 'Topic Cluster' as const })),
        ...audit.zeroToOneInitiatives.map(i => ({...i, type: 'Initiative' as const }))
    ], [audit]);

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-200 mb-4">Sitewide Strategic Audit</h2>
            <div className="space-y-6">
                 <PriorityMatrix items={prioritizedItems} />
                 
                 <AccordionItem defaultOpen={true} title={
                    <div className="flex items-center gap-4">
                        <span className="text-orange-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M11.983 1.904a1.75 1.75 0 00-3.966 0l-3.134 6.346a1.75 1.75 0 001.65 2.503h6.268a1.75 1.75 0 001.65-2.503L11.983 1.904zM10 12.25a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5a.75.75 0 01.75-.75z" /></svg></span>
                        <span>Zero-to-One Initiatives</span>
                    </div>
                 }>
                    <ZeroToOneInitiativesSection initiatives={audit.zeroToOneInitiatives} />
                 </AccordionItem>

                 <AccordionItem defaultOpen={false} title={
                    <div className="flex items-center gap-4">
                        <span className="text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg></span>
                        <span>Keyword Cannibalization</span>
                    </div>
                 }>
                    <CannibalizationSection analysis={audit.cannibalizationAnalysis} />
                 </AccordionItem>
                 
                 <AccordionItem defaultOpen={false} title={
                    <div className="flex items-center gap-4">
                        <span className="text-indigo-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg></span>
                        <span>Internal Linking Analysis</span>
                    </div>
                 }>
                    <InternalLinkingSection analysis={audit.internalLinkingAnalysis} />
                 </AccordionItem>

                 <AccordionItem defaultOpen={false} title={
                    <div className="flex items-center gap-4">
                        <span className="text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" /></svg></span>
                        <span>Site Architecture Graph</span>
                    </div>
                 }>
                    <SiteArchitectureGraph graphData={audit.siteArchitectureGraph} />
                 </AccordionItem>
                <AccordionItem defaultOpen={false} title={
                     <div className="flex items-center gap-4">
                        <span className="text-teal-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></span>
                        <span>Competitive Content Gap Analysis</span>
                    </div>
                }>
                     <ContentGapsSection gaps={audit.contentGaps} />
                </AccordionItem>
                <AccordionItem defaultOpen={false} title={
                    <div className="flex items-center gap-4">
                        <span className="text-purple-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6V3m0 18v-3M5.636 5.636l-1.414-1.414M19.778 19.778l-1.414-1.414M18.364 5.636l-1.414 1.414M4.222 19.778l1.414-1.414M12 12a6 6 0 110-12 6 6 0 010 12z" /></svg></span>
                        <span>Topic Cluster & Internal Linking Audit</span>
                    </div>
                }>
                    <TopicClustersSection clusters={audit.topicClusters} />
                </AccordionItem>
                 <AccordionItem defaultOpen={false} title={
                    <div className="flex items-center gap-4">
                        <span className="text-sky-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg></span>
                         <div className="flex items-center gap-3">
                             <span>Local Business Audit</span>
                             <HealthStatus status={audit.localBusinessAudit.status}/>
                        </div>
                    </div>
                }>
                    <LocalBusinessAuditSection audit={audit.localBusinessAudit} />
                </AccordionItem>
                <AccordionItem title={
                    <div className="flex items-center gap-4">
                        <span className="text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></span>
                        <div className="flex items-center gap-3">
                             <span>Technical Health Summary</span>
                             <HealthStatus status={audit.technicalHealth.status}/>
                        </div>
                    </div>
                }>
                    <TechnicalHealthSection health={audit.technicalHealth} />
                </AccordionItem>
            </div>
        </div>
    );
};