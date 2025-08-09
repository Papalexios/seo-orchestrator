
import React, { useState } from 'react';
import type { SelfCorrectionFeedback } from '../types';

interface FeedbackLogProps {
  feedback?: SelfCorrectionFeedback;
}

export const FeedbackLog: React.FC<FeedbackLogProps> = ({ feedback }) => {
  const [open, setOpen] = useState(true);
  if (!feedback) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-200">Agent Feedback Log (Self-Correction)</h2>
          <p className="text-gray-400 mt-1">{feedback.critiqueSummary}</p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 transform transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${open ? 'max-h-[5000px]' : 'max-h-0'}`}>
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-300 mb-2">Missed Opportunities</h3>
            {feedback.missedOpportunities.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                {feedback.missedOpportunities.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            ) : <p className="text-sm text-gray-500 italic">None detected</p>}
          </div>
          <div>
            <h3 className="font-semibold text-gray-300 mb-2">Refinements</h3>
            {feedback.refinements.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                {feedback.refinements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            ) : <p className="text-sm text-gray-500 italic">None suggested</p>}
          </div>
          <div>
            <h3 className="font-semibold text-gray-300 mb-2">Risk Warnings</h3>
            {feedback.riskWarnings.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                {feedback.riskWarnings.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            ) : <p className="text-sm text-gray-500 italic">No critical risks</p>}
          </div>
          <div>
            <h3 className="font-semibold text-gray-300 mb-2">Agent Thoughts (Trace)</h3>
            {feedback.modelTrace.length > 0 ? (
              <div className="max-h-60 overflow-auto bg-gray-950/60 border border-gray-800 rounded-md divide-y divide-gray-800">
                {feedback.modelTrace.map((t, i) => (
                  <div key={i} className="p-2 text-sm">
                    <div className="text-xs text-gray-500">{new Date(t.timestamp).toLocaleString()}</div>
                    <div className={`font-medium ${t.level === 'critical' ? 'text-red-300' : t.level === 'warning' ? 'text-yellow-300' : 'text-gray-300'}`}>{t.message}</div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500 italic">No trace available</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

