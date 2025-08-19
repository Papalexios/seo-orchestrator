


import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { ErrorMessage } from './components/ErrorMessage';
import { HistoryPanel } from './components/HistoryPanel';
import {
  generateSitewideAudit,
  generateSeoAnalysis,
  generateExecutiveSummary,
  diagnosePagePerformance,
} from './services/aiService';
import { rankUrls } from './utils/seoScoring';
import { crawlSitemap } from './services/crawlingService';
import { generateActionPlan } from './services/actionPlanService';
import type { HistoricalAnalysis, CrawlProgress, AnalysisLogEntry, GscSite, GscTokenResponse, AiConfig, SitemapUrlEntry, SeoAnalysisResult, GroundingSource, ExecutiveSummary, ActionItem, WatchedKeyword } from './types';
import { AnalysisInProgress } from './components/AnalysisInProgress';
import { CrawlingAnimation } from './components/CrawlingAnimation';
import { GuidedAnalysisWizard, type WizardSubmitData } from './components/GuidedAnalysisWizard';
import { Modal } from './components/Modal';
import { GoogleSearchConsoleConnect } from './components/GoogleSearchConsoleConnect';
import { AiConfiguration } from './components/AiConfiguration';
import { ActionPlanDashboard } from './components/ActionPlanDashboard';
import { executeConcurrent } from './utils/utility';
import { fetchGscPerformanceForUrl } from './services/gscService';

const HISTORY_STORAGE_KEY = 'seo-analyzer-history-v16';
const AI_CONFIG_STORAGE_KEY = 'seo-analyzer-ai-config-v16';
const KEYWORD_WATCHTOWER_STORAGE_KEY = 'seo-analyzer-keyword-watchtower-v17';


type AppState = 'idle' | 'loading' | 'results' | 'error' | 'configure_ai';

const App: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<HistoricalAnalysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  
  const [appState, setAppState] = useState<AppState>('idle');
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState<boolean>(false);
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress | null>(null);
  const [analysisLog, setAnalysisLog] = useState<AnalysisLogEntry[]>([]);

  const [gscToken, setGscToken] = useState<GscTokenResponse | null>(null);
  const [gscSites, setGscSites] = useState<GscSite[]>([]);
  const [isGscModalOpen, setIsGscModalOpen] = useState<boolean>(false);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [watchedKeywords, setWatchedKeywords] = useState<WatchedKeyword[]>([]);
  
  const isGscConnected = useMemo(() => !!gscToken, [gscToken]);

  const analysisToDisplay = useMemo(() => {
    if (!selectedAnalysisId) return null;
    return analysisHistory.find(h => h.id === selectedAnalysisId) ?? null;
  }, [selectedAnalysisId, analysisHistory]);

  const updateAnalysisInHistory = useCallback((id: string, updatedAnalysis: Partial<HistoricalAnalysis>) => {
    setAnalysisHistory(prevHistory => {
        const updatedHistory = prevHistory.map(h => h.id === id ? { ...h, ...updatedAnalysis } : h);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
        return updatedHistory;
    });
  }, []);

  const handleWatchedKeywordsUpdate = useCallback((newKeywords: WatchedKeyword[]) => {
      setWatchedKeywords(newKeywords);
      localStorage.setItem(KEYWORD_WATCHTOWER_STORAGE_KEY, JSON.stringify(newKeywords));
  }, []);

  const handleToggleTaskComplete = useCallback(async (actionItemId: string) => {
    if (!analysisToDisplay || !analysisToDisplay.actionPlan) return;
    
    let actionItemToUpdate: ActionItem | undefined;
    
    // Create a deep copy to avoid direct state mutation
    const newActionPlan = JSON.parse(JSON.stringify(analysisToDisplay.actionPlan));

    for (const day of newActionPlan) {
        const action = day.actions.find((a: ActionItem) => a.id === actionItemId);
        if (action) {
            action.completed = !action.completed;
            actionItemToUpdate = action;
            break;
        }
    }

    if (actionItemToUpdate) {
        // If task is being marked as complete
        if (actionItemToUpdate.completed) {
            actionItemToUpdate.completionDate = new Date().toISOString();
            // And GSC is connected, try to fetch initial performance data
            if (isGscConnected && gscToken && aiConfig && actionItemToUpdate.url) {
                try {
                    const performanceData = await fetchGscPerformanceForUrl(actionItemToUpdate.url, analysisToDisplay.sitemapUrl, gscToken.access_token);
                    if (performanceData) {
                        const diagnosis = await diagnosePagePerformance(aiConfig, actionItemToUpdate.url, performanceData);
                        actionItemToUpdate.initialGscPerformance = diagnosis;
                    }
                } catch(e) {
                    console.error("Failed to fetch initial GSC performance data on task completion:", e);
                    actionItemToUpdate.initialGscPerformance = null; // Mark as failed
                }
            }
        } else { // Task is being marked as incomplete
            actionItemToUpdate.completionDate = undefined;
            actionItemToUpdate.initialGscPerformance = undefined;
            actionItemToUpdate.postImplementationReport = undefined;
        }
    }
    
    updateAnalysisInHistory(analysisToDisplay.id, { actionPlan: newActionPlan });

  }, [analysisToDisplay, updateAnalysisInHistory, isGscConnected, gscToken, aiConfig]);

  useEffect(() => {
    try {
        const storedConfig = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
        if (storedConfig) {
            setAiConfig(JSON.parse(storedConfig));
        } else {
            setAppState('configure_ai');
        }

        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (storedHistory) {
            const history = JSON.parse(storedHistory) as HistoricalAnalysis[];
            setAnalysisHistory(history);
            if (history.length > 0 && storedConfig) {
                const latestAnalysisId = history[0].id;
                setSelectedAnalysisId(latestAnalysisId);
                setAppState('results');
            }
        }
        
        const storedKeywords = localStorage.getItem(KEYWORD_WATCHTOWER_STORAGE_KEY);
        if (storedKeywords) {
            setWatchedKeywords(JSON.parse(storedKeywords));
        }

    } catch (e) {
        console.error("Failed to parse from localStorage", e);
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
        localStorage.removeItem(KEYWORD_WATCHTOWER_STORAGE_KEY);
        setAppState('configure_ai');
    }
  }, []);

  const handleNewAnalysis = () => {
    setSelectedAnalysisId(null);
    setAppState(aiConfig ? 'idle' : 'configure_ai');
    setError(null);
  };
  
  const handleAiConfigChange = (config: AiConfig) => {
    setAiConfig(config);
    localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
    // If there's history, go to results, otherwise idle.
    if(analysisHistory.length > 0 && selectedAnalysisId) {
        setAppState('results');
    } else {
        setAppState('idle');
    }
  }
  
  const handleAiSettingsChange = () => {
    setAppState('configure_ai');
  };

  const log = (message: string, status: AnalysisLogEntry['status'] = 'running') => {
      setAnalysisLog(prev => [...prev, { timestamp: new Date().toISOString(), message, status }]);
  }

  const handleSubmit = useCallback(async (data: WizardSubmitData) => {
    if (!data.sitemapUrl) {
      setError('Please enter your sitemap.xml URL.');
      setAppState('error');
      return;
    }
    if (!aiConfig) {
      setError('AI Provider is not configured.');
      setAppState('configure_ai');
      return;
    }
    
    let initialSitemapUrl: URL;
    try {
        initialSitemapUrl = new URL(data.sitemapUrl);
    } catch (_) {
        setError('Please enter a valid sitemap URL (e.g., https://example.com/sitemap.xml).');
        setAppState('error');
        return;
    }
    
    const competitorUrls = data.competitorSitemaps.split('\n').map(u => u.trim()).filter(Boolean);

    setAppState('loading');
    setError(null);
    setSelectedAnalysisId(null);
    setCrawlProgress(null);
    setAnalysisLog([]);
    
    try {
      log('Crawling your sitemap...', 'running');
      const urlEntries: SitemapUrlEntry[] = await crawlSitemap(initialSitemapUrl.toString(), (progress: CrawlProgress) => {
        requestAnimationFrame(() => {
            setCrawlProgress(progress);
        });
      });
      log(`Found ${urlEntries.length} URLs in your sitemap.`, 'complete');

      if (urlEntries.length === 0) {
          throw new Error("Crawl complete, but no URLs were found. Your sitemap might be empty or in a format that could not be parsed.");
      }
      
      const rankedUrls = rankUrls(urlEntries).slice(0, 200); // Limit to top 200 URLs to manage costs/time
      log(`Scored and prioritized ${rankedUrls.length} most relevant pages for analysis.`, 'complete');
      
      log('Initiating Sitewide Strategic Audit...', 'running');
      const sitewideAnalysis = await generateSitewideAudit(
        aiConfig,
        rankedUrls, 
        competitorUrls, 
        data.analysisType, 
        data.targetLocation, 
        (msg) => log(msg)
      );
      log('Sitewide Strategic Audit complete.', 'complete');
      
      const strategicGoals = sitewideAnalysis.strategicRoadmap.actionPlan.map(item => item.title);

      log('Generating Page-Level Action Plan by batching URLs...', 'running');
      
      const CHUNK_SIZE = 15;
      const CONCURRENCY_LIMIT_ANALYSIS = 5;
      const combinedAnalysis: SeoAnalysisResult = { pageActions: [], keywords: [] };
      const combinedSources = new Map<string, GroundingSource>();
      const urlChunks: string[][] = [];

      for (let i = 0; i < rankedUrls.length; i += CHUNK_SIZE) {
          urlChunks.push(rankedUrls.slice(i, i + CHUNK_SIZE));
      }

      const analysisResults = await executeConcurrent(
        urlChunks,
        (chunk) => generateSeoAnalysis(
            aiConfig,
            chunk,
            data.analysisType,
            data.targetLocation,
            strategicGoals,
            () => {} // Suppress logs for individual chunks
        ),
        CONCURRENCY_LIMIT_ANALYSIS,
        ({ completed, total }) => {
            log(`Analyzing page batch ${completed} of ${total}...`, 'running');
        }
      );
      
      for (const result of analysisResults) {
          if (result.status === 'fulfilled') {
              const { analysis: chunkAnalysis, sources: chunkSources } = result.value;
              if (chunkAnalysis.pageActions) { combinedAnalysis.pageActions.push(...chunkAnalysis.pageActions); }
              if (chunkAnalysis.keywords) { combinedAnalysis.keywords.push(...chunkAnalysis.keywords); }
              if (chunkSources) {
                  chunkSources.forEach(source => {
                      if (source.uri && !combinedSources.has(source.uri)) {
                          combinedSources.set(source.uri, source);
                      }
                  });
              }
          } else {
              console.error("A page analysis chunk failed:", result.reason);
              log(`A page analysis batch failed. Continuing with partial data...`, 'error');
          }
      }
      
      const analysis = combinedAnalysis;
      const sources = Array.from(combinedSources.values());

      log('Page-Level Action Plan complete.', 'complete');
      
      log('Concurrently generating Final Action Plan & Executive Summary...', 'running');
      
      const [actionPlanResult, executiveSummaryResult] = await Promise.allSettled([
        generateActionPlan(aiConfig, sitewideAnalysis, analysis, (msg) => log(msg)),
        generateExecutiveSummary(aiConfig, sitewideAnalysis, analysis)
      ]);

      if (actionPlanResult.status === 'rejected') {
        throw new Error(`Failed to generate the action plan: ${actionPlanResult.reason}`);
      }
      const actionPlan = actionPlanResult.value;
      log('Day-by-Day Action Plan generated successfully.', 'complete');
      
      if (executiveSummaryResult.status === 'rejected') {
        log(`Failed to generate the executive summary: ${executiveSummaryResult.reason}. Continuing without it.`, 'error');
      }
      const executiveSummary = executiveSummaryResult.status === 'fulfilled' ? executiveSummaryResult.value : undefined;
      log('Executive Summary generated successfully.', 'complete');


      const newAnalysis: HistoricalAnalysis = {
        id: new Date().toISOString(),
        date: new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        sitemapUrl: data.url,
        competitorSitemaps: competitorUrls,
        sitewideAnalysis: sitewideAnalysis,
        analysis: analysis,
        sources: sources,
        analysisType: data.analysisType,
        location: data.targetLocation,
        actionPlan: actionPlan,
        executiveSummary: executiveSummary,
      };
      
      const updatedHistory = [newAnalysis, ...analysisHistory].slice(0, 10);
      setAnalysisHistory(updatedHistory);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));

      setSelectedAnalysisId(newAnalysis.id);
      setAppState('results');

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
      log(`Analysis failed: ${errorMessage}`, 'error');
      setAppState('error');
    }
  }, [aiConfig, analysisHistory]);

  const handleGscConnect = (token: GscTokenResponse, sites: GscSite[]) => {
    setGscToken(token);
    setGscSites(sites);
    setIsGscModalOpen(false);
  };

  const handleGscDisconnect = () => {
    setGscToken(null);
    setGscSites([]);
  };

  const renderContent = () => {
    switch (appState) {
        case 'configure_ai':
            return (
              <Modal title={aiConfig ? "AI Provider Settings" : "Configure AI Provider"} onClose={() => aiConfig && handleNewAnalysis()}>
                <AiConfiguration
                    onConfigured={handleAiConfigChange}
                    currentConfig={aiConfig}
                />
              </Modal>
            );
        case 'loading':
            return crawlProgress && analysisLog.length < 2 ? (
                <CrawlingAnimation progress={crawlProgress} />
            ) : (
                <AnalysisInProgress log={analysisLog} />
            );
        case 'results':
            if (analysisToDisplay && aiConfig) {
                 return (
                    <div className="mt-8 animate-fade-in">
                        <ActionPlanDashboard
                            analysis={analysisToDisplay}
                            onToggleTaskComplete={handleToggleTaskComplete}
                            updateAnalysis={updateAnalysisInHistory}
                            aiConfig={aiConfig}
                            isGscConnected={isGscConnected}
                            onConnectGscClick={() => setIsGscModalOpen(true)}
                            gscToken={gscToken}
                            watchedKeywords={watchedKeywords}
                            onWatchedKeywordsUpdate={handleWatchedKeywordsUpdate}
                        />
                    </div>
                 );
            }
             // Fallback if no analysis is displayable
             handleNewAnalysis(); 
             return <GuidedAnalysisWizard isLoading={false} onSubmit={handleSubmit} gscSites={gscSites} isGscConnected={isGscConnected} isAiConfigured={!!aiConfig} aiConfig={aiConfig} onAiSettingsClick={handleAiSettingsChange} />;
        case 'error':
            return (
                <div className="mt-8 text-center animate-fade-in">
                     {error && <ErrorMessage message={error} />}
                     {analysisLog.length > 0 && <div className="mt-6"><AnalysisInProgress log={analysisLog} /></div>}
                     <button
                        onClick={handleNewAnalysis}
                        className="mt-8 text-sm font-semibold px-6 py-2.5 rounded-lg transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-600/30"
                    >
                        Start New Analysis
                    </button>
                </div>
            );

        case 'idle':
        default:
            return (
                 <GuidedAnalysisWizard 
                    isLoading={false}
                    onSubmit={handleSubmit}
                    gscSites={gscSites}
                    isGscConnected={isGscConnected}
                    isAiConfigured={!!aiConfig}
                    aiConfig={aiConfig}
                    onAiSettingsClick={handleAiSettingsChange}
                />
            );
    }
  }


  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 font-sans">
       {isGscModalOpen && (
         <Modal title="Connect Google Search Console" onClose={() => setIsGscModalOpen(false)}>
            <GoogleSearchConsoleConnect 
                onConnect={handleGscConnect}
                onDisconnect={handleGscDisconnect}
                isConnected={isGscConnected}
            />
         </Modal>
       )}
      <div className="flex">
        <HistoryPanel
            history={analysisHistory}
            selectedId={selectedAnalysisId}
            isOpen={isHistoryPanelOpen}
            onClose={() => setIsHistoryPanelOpen(false)}
            onSelect={(id) => {
                if (aiConfig) {
                    setSelectedAnalysisId(id);
                    setAppState('results');
                    setError(null);
                    setIsHistoryPanelOpen(false); // Close panel on mobile after selection
                } else {
                    setAppState('configure_ai');
                }
            }}
            onClear={() => {
                setAnalysisHistory([]);
                setSelectedAnalysisId(null);
                localStorage.removeItem(HISTORY_STORAGE_KEY);
                handleGscDisconnect();
                handleNewAnalysis();
            }}
        />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto" style={{ height: '100vh' }}>
            <div className="max-w-7xl mx-auto">
                <Header 
                    onMenuClick={() => setIsHistoryPanelOpen(true)}
                    showNewAnalysisButton={appState === 'results'}
                    onNewAnalysisClick={handleNewAnalysis}
                    isGscConnected={isGscConnected}
                    onConnectClick={() => setIsGscModalOpen(true)}
                    isAiConfigured={!!aiConfig}
                    onAiSettingsClick={handleAiSettingsChange}
                />
                <main>
                    {renderContent()}
                </main>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;