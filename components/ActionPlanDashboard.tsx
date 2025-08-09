


import React, { useState, useMemo } from 'react';
import type { HistoricalAnalysis, DailyActionPlan, AiConfig, GscTokenResponse } from '../types';
import { DailyPlanCard } from './DailyPlanCard';
import { StrategicRoadmap } from './StrategicRoadmap';
import { SitewideAuditDisplay } from './SitewideAuditDisplay';
import { AutonomousAIHeader } from './AutonomousAIHeader';
import { ExecutiveSummary } from './ExecutiveSummary';
import { CopyReportButton } from './CopyReportButton';
import { FeedbackLog } from './FeedbackLog';
import { SerpDeconstructionPanel } from './SerpDeconstructionPanel';
import { ExportMenu } from './ExportMenu';
import { FixPacks } from './FixPacks';

interface ActionPlanDashboardProps {
    analysis: HistoricalAnalysis;
    onToggleTaskComplete: (actionItemId: string) => void;
    aiConfig: AiConfig;
    isGscConnected: boolean;
    onConnectGscClick: () => void;
    gscToken: GscTokenResponse | null;
}

const ChevronIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);


export const ActionPlanDashboard: React.FC<ActionPlanDashboardProps> = (props) => {
    const { analysis } = props;
    const { actionPlan, sitewideAnalysis, executiveSummary } = analysis;
    const [selectedDay, setSelectedDay] = useState<number>(actionPlan?.[0]?.day || 1);
    const [isSitewideAuditOpen, setIsSitewideAuditOpen] = useState(false);

    const progress = useMemo(() => {
        if (!actionPlan) return { completed: 0, total: 0, percentage: 0 };
        const allActions = actionPlan.flatMap(day => day.actions);
        const completedActions = allActions.filter(action => action.completed);
        const total = allActions.length;
        const completed = completedActions.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        return { completed, total, percentage };
    }, [actionPlan]);

    const selectedPlan = useMemo(() => {
        return actionPlan?.find(p => p.day === selectedDay);
    }, [actionPlan, selectedDay]);


    if (!actionPlan || actionPlan.length === 0) {
        return (
            <div className="text-center p-8 bg-gray-900 rounded-lg">
                <h2 className="text-xl font-bold">No Action Plan Generated</h2>
                <p className="text-gray-400 mt-2">The analysis did not produce an actionable implementation plan.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 lg:space-y-10">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                {/* Main column */}
                <div className="lg:col-span-9 space-y-8 lg:space-y-10">
                    <section id="overview">
                        <AutonomousAIHeader />
                    </section>

                    {executiveSummary && (
                        <section id="executive-summary" className="scroll-mt-24">
                            <ExecutiveSummary summary={executiveSummary} analysis={analysis} />
                        </section>
                    )}

                    <section id="feedback-log" className="scroll-mt-24">
                        <FeedbackLog feedback={analysis.selfCorrection} />
                    </section>

                    {sitewideAnalysis?.strategicRoadmap && (
                        <section id="strategic-roadmap" className="scroll-mt-24">
                            <StrategicRoadmap roadmap={sitewideAnalysis.strategicRoadmap} />
                        </section>
                    )}

                    <section id="daily-plan" className="scroll-mt-24">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-200">Your Daily Action Plan</h2>
                                    <p className="text-gray-400">Follow these steps day-by-day to implement your SEO strategy.</p>
                                </div>
                                <div className="w-full sm:w-56">
                                    <label htmlFor="progress" className="text-sm font-medium text-gray-400">Overall Progress: {progress.completed}/{progress.total} Tasks</label>
                                    <div className="w-full bg-gray-700/50 rounded-full h-2.5 mt-1">
                                        <div className="bg-gradient-to-r from-teal-400 to-blue-500 h-2.5 rounded-full transition-all duration-500" style={{width: `${progress.percentage}%`}}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-b border-gray-700">
                                <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                                    {actionPlan.map(plan => (
                                        <button
                                            key={plan.day}
                                            onClick={() => setSelectedDay(plan.day)}
                                            className={`${
                                                selectedDay === plan.day
                                                ? 'border-blue-500 text-blue-400'
                                                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-500'
                                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                        >
                                            Day {plan.day}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="mt-6">
                                {selectedPlan ? (
                                    <DailyPlanCard plan={selectedPlan} onToggleTaskComplete={props.onToggleTaskComplete} />
                                ) : (
                                    <p className="text-center text-gray-500">Select a day to view the plan.</p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section id="sitewide-audit" className="scroll-mt-24">
                        <div className="border border-gray-800 rounded-lg bg-gray-900/50">
                            <button
                                onClick={() => setIsSitewideAuditOpen(!isSitewideAuditOpen)}
                                className="w-full flex justify-between items-center p-4 text-left font-semibold text-lg text-gray-200 hover:bg-gray-800/50 rounded-lg transition-colors"
                                aria-expanded={isSitewideAuditOpen}
                            >
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    View Full Sitewide Audit Details
                                </div>
                                <ChevronIcon isOpen={isSitewideAuditOpen} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isSitewideAuditOpen ? 'max-h-[5000px]' : 'max-h-0'}`}>
                                <div className="p-4 border-t border-gray-800">
                                    {sitewideAnalysis && <SitewideAuditDisplay audit={sitewideAnalysis} />}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="serp-deconstruction" className="scroll-mt-24">
                        <SerpDeconstructionPanel aiConfig={props.aiConfig} />
                    </section>
                </div>

                {/* Side column: Command Center Nav */}
                <aside className="lg:col-span-3 mt-8 lg:mt-0">
                    <div className="lg:sticky lg:top-6 space-y-4">
                        <nav className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                    <section id="fix-packs" className="scroll-mt-24">
                        <FixPacks analysis={analysis} />
                    </section>

                            <h3 className="text-sm font-semibold text-gray-400 mb-3">Command Center</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#executive-summary" className="text-gray-300 hover:text-white">Executive Summary</a></li>
                                <li><a href="#feedback-log" className="text-gray-300 hover:text-white">Agent Feedback Log</a></li>
                                <li><a href="#strategic-roadmap" className="text-gray-300 hover:text-white">Strategic Roadmap</a></li>
                                <li><a href="#daily-plan" className="text-gray-300 hover:text-white">Day-by-Day Plan</a></li>
                                <li><a href="#sitewide-audit" className="text-gray-300 hover:text-white">Sitewide Audit</a></li>
                                <li><a href="#serp-deconstruction" className="text-gray-300 hover:text-white">SERP Deconstruction</a></li>
                            </ul>
                        </nav>
                        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                            <div className="text-sm text-gray-400 mb-2">Overall Progress</div>
                            <div className="bg-gray-700/50 rounded-full h-2 mb-2">
                                <div className="bg-gradient-to-r from-teal-400 to-blue-500 h-2 rounded-full" style={{width: `${progress.percentage}%`}}></div>
                            </div>
                        <ExportMenu analysis={analysis} />

                            <div className="text-xs text-gray-500">{progress.completed} / {progress.total} tasks</div>
                        </div>
                        <CopyReportButton analysis={analysis} />
                    </div>
                </aside>
            </div>
        </div>
    );
}
