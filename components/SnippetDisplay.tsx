import React, { useState, useCallback } from 'react';
import type { SnippetOpportunity } from '../types';

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

interface SnippetDisplayProps {
    snippet: SnippetOpportunity;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    }, [code]);

    return (
        <div className="bg-gray-950 p-4 rounded-lg border border-gray-700/70 relative">
            <button
                onClick={handleCopy}
                className={`absolute top-2 right-2 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-200 ${
                    copied
                    ? 'bg-green-500/20 text-green-300 ring-1 ring-inset ring-green-500/40'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 ring-1 ring-inset ring-gray-600'
                }`}
                aria-label="Copy JSON-LD Schema"
            >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copied!' : 'Copy Schema'}
            </button>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                <code>{code}</code>
            </pre>
        </div>
    );
};

export const SnippetDisplay: React.FC<SnippetDisplayProps> = ({ snippet }) => {
    const { opportunityFound, opportunityType, reasoning, targetKeyword, jsonLdSchema } = snippet;

    if (!opportunityFound) {
        return (
            <div className="text-center p-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No Clear Snippet Opportunity Found</h3>
                <p className="text-sm text-gray-400 italic">"{reasoning}"</p>
            </div>
        );
    }

    const prettyJsonLd = JSON.stringify(jsonLdSchema, null, 2);

    return (
        <div className="space-y-4">
            <div>
                <span className={`capitalize px-3 py-1 text-sm font-semibold rounded-full bg-blue-900/50 text-blue-300`}>
                    {opportunityType} Snippet Opportunity
                </span>
            </div>
            <div className="p-4 bg-gray-950/70 rounded-lg border border-gray-700/80">
                <h4 className="font-semibold text-teal-400 mb-2">AI Analysis</h4>
                <p className="text-sm text-gray-300 italic mb-3 border-l-2 border-teal-700 pl-3">"{reasoning}"</p>
                <p className="text-sm text-gray-400">
                    <strong>Target Keyword:</strong> <span className="font-semibold text-gray-200">{targetKeyword}</span>
                </p>
            </div>
            <div>
                <h4 className="font-semibold text-gray-300 mb-2">Generated JSON-LD Schema</h4>
                <p className="text-xs text-gray-500 mb-2">{'Copy this schema and add it to the `<head>` of your page inside a `<script type="application/ld+json">` tag.'}</p>
                <CodeBlock code={prettyJsonLd} />
            </div>
        </div>
    );
};
