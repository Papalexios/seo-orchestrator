
import React from 'react';
import type { DailyActionPlan, AiConfig, GscTokenResponse, HistoricalAnalysis } from '../types';
import { ActionItemCard } from './ActionItemCard';

interface DailyPlanCardProps {
    plan: DailyActionPlan;
    analysis: HistoricalAnalysis;
    updateAnalysis: (id: string, updatedAnalysis: Partial<HistoricalAnalysis>) => void;
    onToggleTaskComplete: (actionItemId: string) => Promise<void>;
    aiConfig: AiConfig;
    gscToken: GscTokenResponse | null;
    isGscConnected: boolean;
    onConnectGscClick: () => void;
    siteUrl: string;
}

export const DailyPlanCard: React.FC<DailyPlanCardProps> = (props) => {
    const { plan, onToggleTaskComplete, aiConfig, gscToken, isGscConnected, onConnectGscClick, siteUrl, analysis, updateAnalysis } = props;
    return (
        <div className="animate-fade-in">
            <h3 className="text-xl font-bold text-teal-300 mb-1">Day {plan.day}: <span className="text-gray-200">{plan.focus}</span></h3>
            <p className="text-gray-400 mb-6">Complete these tasks to stay on track with your SEO roadmap.</p>

            <div className="space-y-4">
                {plan.actions.map(action => (
                    <ActionItemCard 
                        key={action.id}
                        actionItem={action}
                        analysis={analysis}
                        updateAnalysis={updateAnalysis}
                        onToggleTaskComplete={onToggleTaskComplete}
                        aiConfig={aiConfig}
                        gscToken={gscToken}
                        isGscConnected={isGscConnected}
                        onConnectGscClick={onConnectGscClick}
                        siteUrl={siteUrl}
                    />
                ))}
            </div>
        </div>
    );
};
