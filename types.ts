

// For enhanced sitemap crawling
export interface SitemapUrlEntry {
    url: string;
    lastMod?: string; // ISO 8601 date string
    priority?: number; // 0.0 to 1.0
}

// For the Sitewide Audit V10
export interface StrategicRoadmapData {
  missionStatement: string;
  projectedImpactScore: number;
  actionPlan: {
    title: string;
    description: string;
  }[];
}

export interface TechnicalAudit {
  status: 'good' | 'needs_improvement' | 'poor';
  summary: string;
  actionItems: {
    item: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface ContentGap {
  topic: string;
  rationale: string;
  suggestedTitle: string;
  keywordIdeas: string[];
  impact: number; // Score from 1-10
  effort: number; // Score from 1-10
  competitorSource?: string; // New in v9
}

export interface TopicCluster {
  clusterName: string;
  pillarPage: string;
  supportingPages: string[];
  fortificationPlan: {
    linkFrom: string;
    linkTo: string;
    anchorText: string;
    reason: string;
  }[];
  impact: number; // Score from 1-10
  effort: number; // Score from 1-10
}

export interface Node {
  id: string; // URL
  label: string;
  type: 'pillar' | 'cluster' | 'orphan';
  cluster?: string; // clusterName for linking
}
export interface Edge {
  source: string; // source URL
  target: string; // target URL
}
export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

// New for v16: Hyper-Specific Local Intelligence
export interface CompetitorGbpProfile {
    name: string;
    reviewCount: number;
    rating: number;
    keyFeatures: string[];
    primaryCategory: string;
    reviewVelocity?: string; // e.g., "15 reviews in the last month"
    reviewSentiment?: string; // e.g., "Positive sentiment around 'customer service'"
}

export interface LocalBusinessAudit {
    status: 'good' | 'needs_improvement' | 'poor';
    summary: string;
    actionItems: {
        item: string;
        priority: 'high' | 'medium' | 'low';
        checked: boolean;
        details: string;
    }[];
    competitorGbpAnalysis: CompetitorGbpProfile[];
}

// New for v11
export interface ZeroToOneInitiative {
  initiativeName: string;
  initiativeType: 'Free Tool' | 'Data Report' | 'Podcast/Series' | 'Framework';
  description: string;
  strategicRationale: string;
  impact: number;
  effort: number;
}

// New for v16: Deep Architectural Intelligence
export interface InternalLinkingAnalysis {
    summary: string;
    opportunities: {
        fromUrl: string;
        toUrl: string;
        anchorText: string;
        rationale: string;
    }[];
}

export interface CannibalizationAnalysis {
    keyword: string;
    competingUrls: string[];
    resolution: string;
    rationale: string;
}

export interface SitewideAnalysis {
  strategicRoadmap: StrategicRoadmapData;
  technicalHealth: TechnicalAudit;
  contentGaps: ContentGap[];
  topicClusters: TopicCluster[];
  siteArchitectureGraph: GraphData; 
  localBusinessAudit: LocalBusinessAudit;
  zeroToOneInitiatives: ZeroToOneInitiative[];
  internalLinkingAnalysis: InternalLinkingAnalysis;
  cannibalizationAnalysis: CannibalizationAnalysis[];
}


// UNIFIED ACTION TYPE FOR V9
export interface PagePerformance {
    summary: string;
    recommendations: {
        category: 'Snippet' | 'On-Page Content' | 'Technical SEO' | 'Off-Page Strategy';
        action: string;
        rationale: string;
    }[];
    metrics: {
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
    },
    dataSource?: 'Google Search Console' | 'simulated';
}

export interface PageAction {
  url: string;
  priority: 'high' | 'medium' | 'low';
  source: 'analysis' | 'keyword' | 'decay';
  rewriteDetails?: {
    reason: string;
    evidence: string;
    suggestedHeadline: string;
    action: 'update' | 'merge' | 'prune' | 'canonical' | 'refresh'; // 'refresh' new in v9
    owner: 'content' | 'dev' | 'product';
    strategicGoal?: string; // New for v11 (The Strategy Thread)
  };
  optimizationTasks?: OptimizationTask[];
}


export interface OptimizationTask {
  task: string;
  impact: 'high' | 'medium' | 'low';
}

export interface KeywordIdea {
  phrase: string;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  type: 'global' | 'local';
  volume: number;
  difficulty: number;
  contentAngle: string;
  title: string;
  rationale: string;
  cluster: string;
}

// The main result object, streamlined for v10
export interface SeoAnalysisResult {
    pageActions: PageAction[];
    keywords: KeywordIdea[];
}

export interface GroundingSource {
  uri: string;
  title?: string;
}

export type AnalysisType = 'global' | 'local';

// New for V13: Action Plan Types
export interface Prompt {
  title: string;
  prompt: string;
}

export interface ChecklistItem {
  item: string;
  checked: boolean;
}

// New for v16: Performance Loop
export interface PostImplementationReport {
    verdict: string; // The AI's summary judgment.
    nextStepsSummary: string; // A concise summary of the next strategic action.
    before: GscPerformanceData;
    after: GscPerformanceData;
}

export interface ActionItem {
  id: string;
  url?: string;
  primaryKeyword?: string;
  title: string;
  type: 'technical' | 'content_update' | 'new_content';
  priority: 'high' | 'medium' | 'low';
  impact: number;
  estimatedTime: string;
  dependencies: string[];
  toolsRequired: { name: string; url?: string }[];
  stepByStepImplementation: string[];
  prompts: Prompt[];
  verificationChecklist: ChecklistItem[];
  successVerification: { method: string; metric: string }[];
  nextSteps: { action: string; rationale: string }[];
  completed: boolean;
  // New for "Closing the Loop" feature
  completionDate?: string; // ISO string
  initialGscPerformance?: PagePerformance | null;
  postImplementationReport?: PostImplementationReport | null;
}


export interface DailyActionPlan {
  day: number;
  focus: string;
  actions: ActionItem[];
}
// End of Action Plan Types

// New for 80/20 Executive Plan
export interface ExecutiveSummaryAction {
  url: string;
  reason: string;
  instruction: string;
  prompt: string;
}

export interface ExecutiveSummaryContent {
  title: string;
  topic: string;
  reason: string;
  prompt: string;
}

export interface ExecutiveSummaryRedirect {
  from: string;
  to: string;
  reason: string;
}

export interface ExecutiveSummary {
  summaryTitle: string;
  summaryIntroduction: string;
  rewrites: ExecutiveSummaryAction[];
  optimizations: ExecutiveSummaryAction[];
  newContent: ExecutiveSummaryContent[];
  redirects: ExecutiveSummaryRedirect[];
  contentDecay: ExecutiveSummaryAction[]; // New for Content Decay Forecasting
}
// End of 80/20 Types

export interface HistoricalAnalysis {
  id: string;
  date: string;
  sitemapUrl: string; // This is the GSC Site URL
  competitorSitemaps: string[]; 
  sitewideAnalysis: SitewideAnalysis; // Changed to non-optional
  analysis: SeoAnalysisResult;
  sources?: GroundingSource[];
  analysisType: AnalysisType;
  location?: string;
  actionPlan?: DailyActionPlan[];
  executiveSummary?: ExecutiveSummary;
}


// For the "Zero-Click Opportunity" Snippet Generator
export interface FaqQuestionAnswer {
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
        '@type': 'Answer';
        text: string;
    };
}

export interface SnippetOpportunity {
    opportunityFound: boolean;
    opportunityType: 'faq' | 'howto' | 'video' | 'none';
    reasoning: string;
    targetKeyword: string;
    jsonLdSchema: {
        '@context': 'https://schema.org';
        '@type': 'FAQPage' | 'HowTo' | 'VideoObject' | string;
        mainEntity?: FaqQuestionAnswer[] | any;
    } | {};
}

// For the "SERP Insights" feature
export interface SerpInsights {
  targetKeyword: string;
  aiOverview: string;
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  serpFeatureAnalysis: string;
  lsiKeywords: Record<string, string[]>;
}

// For the crawling service progress updates
export interface CrawlProgress {
    type: 'counting' | 'crawling' | 'preflight';
    count: number;
    total: number;
    currentSitemap?: string;
    pagesFound?: number;
    lastUrlFound?: string;
    totalUrls?: number;
}

// For the Live AI Log Streamer
export interface AnalysisLogEntry {
    timestamp: string;
    message: string;
    status: 'running' | 'complete' | 'error';
}

// For Google Search Console Integration
export interface GscSite {
    siteUrl: string;
    permissionLevel: string;
}

export interface GscTokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    // May contain other fields
    [key: string]: any;
}

export interface GscPerformanceData {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

// For Multi-Provider AI Configuration
export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model?: string; // Primarily for non-OpenRouter, or single-model use
  models?: string[]; // For OpenRouter multi-model support
}

// Type mirroring the @google/genai GenerateContentParameters
export interface GenerateContentParameters {
    model: string;
    contents: any; // Loosely typed to avoid strict dependency
    config: {
        systemInstruction: string;
        tools?: any[];
        responseMimeType?: string;
        maxOutputTokens?: number;
        thinkingConfig?: { thinkingBudget: number };
    };
}

// New for v17: Keyword Watchtower
export interface WatchedKeyword {
    id: string; // keyword slug
    keyword: string;
    lastChecked: string | null;
    baseline: SerpInsights | null;
    latest: SerpInsights | null;
    alert: string | null; // e.g., "New competitor in top 3!"
}