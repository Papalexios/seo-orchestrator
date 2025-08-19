
import React from 'react';
import type { PostImplementationReport, GscPerformanceData } from '../types';

const MetricRow: React.FC<{ label: string; before: number; after: number; isPercentage?: boolean; isPosition?: boolean }> = ({ label, before, after, isPercentage = false, isPosition = false }) => {
    const delta = after - before;
    const deltaColor = isPosition ? (delta < 0 ? 'text-green-400' : delta > 0 ? 'text-red-400' : 'text-gray-400') : (delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-400');
    const deltaSign = delta > 0 ? '+' : '';
    const formatValue = (val: number) => isPercentage ? `${(val * 100).toFixed(2)}%` : isPosition ? val.toFixed(1) : val.toLocaleString();
    const formatDelta = (val: number) => isPercentage ? `${deltaSign}${(val * 100).toFixed(2)}%` : isPosition ? `${deltaSign}${val.toFixed(1)}` : `${deltaSign}${val.toLocaleString()}`;

    return (
        <tr className="border-b border-gray-800">
            <td className="py-3 px-4 text-sm font-medium text-gray-300">{label}</td>
            <td className="py-3 px-4 text-sm text-center text-gray-400 font-mono">{formatValue(before)}</td>
            <td className="py-3 px-4 text-sm text-center text-gray-200 font-mono font-semibold">{formatValue(after)}</td>
            <td className={`py-3 px-4 text-sm text-center font-mono font-semibold ${deltaColor}`}>
                {delta !== 0 ? formatDelta(delta) : '–'}
            </td>
        </tr>
    );
};

interface PerformanceVerdictDisplayProps {
    report: PostImplementationReport;
}

export const PerformanceVerdictDisplay: React.FC<PerformanceVerdictDisplayProps> = ({ report }) => {
    const { verdict, nextStepsSummary, before, after } = report;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="p-4 bg-gray-950/70 rounded-lg border border-gray-700/80">
                <h4 className="font-semibold text-teal-400 mb-2">AI Performance Verdict</h4>
                <p className="text-sm text-gray-300 italic mb-3 border-l-2 border-teal-700 pl-3">"{verdict}"</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left rounded-lg overflow-hidden border border-gray-800">
                    <thead className="bg-gray-800/50 text-xs text-gray-400 uppercase">
                        <tr>
                            <th className="py-2 px-4">Metric</th>
                            <th className="py-2 px-4 text-center">Before</th>
                            <th className="py-2 px-4 text-center">After</th>
                            <th className="py-2 px-4 text-center">Change</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-900">
                        <MetricRow label="Clicks" before={before.clicks} after={after.clicks} />
                        <MetricRow label="Impressions" before={before.impressions} after={after.impressions} />
                        <MetricRow label="CTR" before={before.ctr} after={after.ctr} isPercentage />
                        <MetricRow label="Position" before={before.position} after={after.position} isPosition />
                    </tbody>
                </table>
            </div>

             <div className="p-4 bg-gray-950/70 rounded-lg border border-gray-700/80">
                <h4 className="font-semibold text-blue-400 mb-2">Strategic Next Step</h4>
                <p className="text-sm text-gray-300 italic">"{nextStepsSummary}"</p>
            </div>
        </div>
    );
};
