
import React from 'react';
import type { SerpInsights } from '../types';

const AiOverviewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-purple-400 shrink-0"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846-.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624L16.5 21.75l-.398-1.126a3.375 3.375 0 00-2.924-2.924l-1.126-.398 1.126-.398a3.375 3.375 0 002.924-2.924l.398-1.126.398 1.126a3.375 3.375 0 002.924 2.924l1.126.398-1.126.398a3.375 3.375 0 00-2.924 2.924z"/></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-400 shrink-0"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>;
const QuestionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-400 shrink-0"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.06-1.061l2.5-2.5a.75.75 0 011.06 0l2.5 2.5a.75.75 0 11-1.06 1.061L11 7.06v4.44a.75.75 0 01-1.5 0V7.06l-1.06 1.061zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>;
const LSIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-400 shrink-0"><path d="M10 3.75a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75z" /><path fillRule="evenodd" d="M10 7a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5A.75.75 0 0110 7zM6 13.25a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;


const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-gray-950/70 p-4 rounded-lg border border-gray-700/80">
        <h4 className="flex items-center gap-2 font-semibold text-gray-200 mb-3">{icon} {title}</h4>
        <div className="text-sm space-y-2">
            {children}
        </div>
    </div>
);

interface SerpInsightsDisplayProps {
    insights: SerpInsights;
}

export const SerpInsightsDisplay: React.FC<SerpInsightsDisplayProps> = ({ insights }) => {
    const { targetKeyword, aiOverview, peopleAlsoAsk, relatedSearches, serpFeatureAnalysis, lsiKeywords } = insights;
    const lsiKeywordEntries = Object.entries(lsiKeywords);

    return (
        <div className="space-y-4">
            <p className="text-center text-sm text-gray-400">
                Showing SERP insights for keyword: <strong className="text-gray-200 font-semibold">"{targetKeyword}"</strong>
            </p>
            
            <Section icon={<AiOverviewIcon />} title="AI Overview & Intent Analysis">
                <p className="text-gray-300 italic mb-3 border-l-2 border-purple-700 pl-3">"{aiOverview}"</p>
                <p className="text-gray-300">
                    <strong className="text-gray-200">Dominant Intent:</strong> {serpFeatureAnalysis}
                </p>
            </Section>

            <div className="grid md:grid-cols-2 gap-4">
                <Section icon={<QuestionIcon />} title="People Also Ask">
                    <ul className="list-disc list-inside text-gray-400">
                        {peopleAlsoAsk.length > 0 ? peopleAlsoAsk.map((q, i) => <li key={i}>{q}</li>) : <li className="italic">None found</li>}
                    </ul>
                </Section>
                 <Section icon={<SearchIcon />} title="Related Searches">
                     <ul className="list-disc list-inside text-gray-400">
                        {relatedSearches.length > 0 ? relatedSearches.map((s, i) => <li key={i}>{s}</li>) : <li className="italic">None found</li>}
                    </ul>
                </Section>
            </div>

            <Section icon={<LSIcon />} title="LSI Keyword Clusters">
                {lsiKeywordEntries.length > 0 ? (
                    <div className="space-y-3">
                        {lsiKeywordEntries.map(([group, keywords]) => (
                            <div key={group} className="bg-gray-800/60 p-3 rounded-md">
                                <h5 className="font-semibold text-green-300 capitalize text-base">{group}</h5>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {keywords.map(kw => (
                                        <span key={kw} className="text-xs font-medium bg-gray-700/80 text-gray-300 px-2 py-1 rounded-full">{kw}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="italic text-gray-500">No specific LSI keyword clusters were identified.</p>
                )}
            </Section>
        </div>
    );
};
