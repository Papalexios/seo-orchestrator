
import type { CrawlProgress, SitemapUrlEntry } from "../types";

const CONCURRENCY_LIMIT = 8;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Enhanced fetch with retry and exponential backoff
const fetchWithRetry = async (url: string, signal: AbortSignal): Promise<Response> => {
    let lastError: Error | undefined;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await fetch(proxyUrl, { signal });
            if (!response.ok) {
                // Don't retry on client errors like 404, but do on server errors
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(`Client error fetching ${url}: Status ${response.status}`);
                }
                // For 5xx errors, we will retry
                throw new Error(`Server error fetching ${url}: Status ${response.status}`);
            }
            return response;
        } catch (error) {
            lastError = error as Error;
            if (i < MAX_RETRIES - 1) {
                const delay = INITIAL_RETRY_DELAY * Math.pow(2, i);
                console.warn(`Attempt ${i + 1} failed for ${url}. Retrying in ${delay}ms...`, error);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
    throw new Error(`Failed to fetch ${url} after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
};

// This version uses getElementsByTagNameNS to correctly handle XML with default namespaces.
const extractUrlsFromXml = (xmlDoc: Document): SitemapUrlEntry[] => {
    const urlEntries: SitemapUrlEntry[] = [];
    const urlNodes = xmlDoc.getElementsByTagNameNS("*", "url");

    for (let i = 0; i < urlNodes.length; i++) {
        const node = urlNodes[i];
        const locNode = node.getElementsByTagNameNS("*", "loc")[0];
        const loc = locNode?.textContent?.trim();

        if (loc) {
            const lastModNode = node.getElementsByTagNameNS("*", "lastmod")[0];
            const priorityNode = node.getElementsByTagNameNS("*", "priority")[0];

            const lastMod = lastModNode?.textContent?.trim() || undefined;
            const priorityText = priorityNode?.textContent?.trim();
            const priority = priorityText ? parseFloat(priorityText) : undefined;
            
            urlEntries.push({ url: loc, lastMod, priority });
        }
    }
    return urlEntries;
};

export const crawlSitemap = async (initialSitemapUrl: string, onProgress: (progress: CrawlProgress) => void): Promise<SitemapUrlEntry[]> => {
    const parser = new DOMParser();
    const allPageUrlEntries = new Map<string, SitemapUrlEntry>();
    
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
        const contentSitemapUrls = new Set<string>();
        const processedIndexes = new Set<string>();

        onProgress({ type: 'preflight', count: 0, total: 1, pagesFound: 0 });

        // Phase 1: Discover all content sitemaps sequentially
        const queue = [initialSitemapUrl];
        while (queue.length > 0) {
            if (signal.aborted) throw new Error("Crawl timed out during sitemap discovery.");
            const currentSitemapUrl = queue.shift()!;
            if (processedIndexes.has(currentSitemapUrl)) continue;

            try {
                const response = await fetchWithRetry(currentSitemapUrl, signal);
                const sitemapText = await response.text();
                processedIndexes.add(currentSitemapUrl);
                const xmlDoc = parser.parseFromString(sitemapText, "text/xml");
                
                const parseError = xmlDoc.getElementsByTagName("parsererror");
                if (parseError.length > 0) {
                    const lines = sitemapText.split('\n').map(l => l.trim());
                    const sampleLines = lines.filter(Boolean).slice(0, 10);
                    const isLikelyTextSitemap = sampleLines.length > 0 && sampleLines.every(l => l.startsWith('http'));

                    if (isLikelyTextSitemap) {
                        console.log(`Parsing ${currentSitemapUrl} as a text sitemap.`);
                        const textUrls = lines.filter(Boolean);
                        textUrls.forEach(url => {
                            if(!allPageUrlEntries.has(url)) {
                                allPageUrlEntries.set(url, { url });
                            }
                        });
                    } else {
                         console.warn(`Skipping ${currentSitemapUrl} due to XML parsing error. It does not appear to be a text sitemap either.`);
                    }
                    onProgress({ type: 'preflight', count: processedIndexes.size, total: processedIndexes.size + queue.length, currentSitemap: currentSitemapUrl, pagesFound: allPageUrlEntries.size });
                    continue;
                }
                
                const sitemapNodes = xmlDoc.getElementsByTagNameNS("*", "sitemap");
                if (sitemapNodes.length > 0) {
                    const nestedUrls: string[] = [];
                    for (let i = 0; i < sitemapNodes.length; i++) {
                        const locNode = sitemapNodes[i].getElementsByTagNameNS("*", "loc")[0];
                        if (locNode?.textContent) {
                            nestedUrls.push(locNode.textContent.trim());
                        }
                    }
                    if (nestedUrls.length > 0) {
                        queue.push(...nestedUrls);
                    } else {
                        // It has <sitemap> tags but no <loc>, might be a content sitemap itself
                        contentSitemapUrls.add(currentSitemapUrl);
                    }
                } else {
                    // It has no <sitemap> tags, so treat it as a content sitemap.
                    contentSitemapUrls.add(currentSitemapUrl);
                }
                onProgress({ type: 'preflight', count: processedIndexes.size, total: processedIndexes.size + queue.length, currentSitemap: currentSitemapUrl, pagesFound: allPageUrlEntries.size });
            } catch (e) {
                 console.warn(`Could not process sitemap index ${currentSitemapUrl}:`, e instanceof Error ? e.message : String(e));
            }
        }
        
        let totalUrlCount = allPageUrlEntries.size;
        const sitemapsToCount = Array.from(contentSitemapUrls);
        onProgress({ type: 'counting', count: 0, total: sitemapsToCount.length, pagesFound: totalUrlCount });
        
        const countPromises = sitemapsToCount.map(async (sitemapUrl) => {
            if (signal.aborted) return 0;
            try {
                const response = await fetchWithRetry(sitemapUrl, signal);
                const sitemapText = await response.text();
                const xmlDoc = parser.parseFromString(sitemapText, "text/xml");
                if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                    const lines = sitemapText.split('\n').filter(Boolean);
                    return lines.every(l => l.startsWith('http')) ? lines.length : 0;
                }
                return xmlDoc.getElementsByTagNameNS("*", "url").length;
            } catch(e) {
                console.warn(`Could not count URLs in ${sitemapUrl}:`, e instanceof Error ? e.message : String(e));
                return 0;
            }
        });

        const counts = await Promise.all(countPromises);
        totalUrlCount += counts.reduce((sum, count) => sum + (count || 0), 0);
        onProgress({ type: 'counting', count: sitemapsToCount.length, total: sitemapsToCount.length, pagesFound: totalUrlCount });

        const sitemapsToCrawl = Array.from(contentSitemapUrls);
        const totalSitemaps = sitemapsToCrawl.length;
        let processedCount = 0;
        
        const sitemapQueue = [...sitemapsToCrawl];

        const processWorker = async () => {
             while(sitemapQueue.length > 0) {
                const sitemapUrl = sitemapQueue.shift();
                if (!sitemapUrl) continue;
            
                try {
                    if (signal.aborted) throw new Error("Crawl timed out during content processing.");
                    const response = await fetchWithRetry(sitemapUrl, signal);
                    const sitemapText = await response.text();
                    const xmlDoc = parser.parseFromString(sitemapText, "text/xml");
                    
                    let entries: SitemapUrlEntry[] = [];
                    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                        const lines = sitemapText.split('\n').map(l => l.trim()).filter(Boolean);
                        if (lines.length > 0 && lines.every(l => l.startsWith('http'))) {
                            entries = lines.map(url => ({ url }));
                        }
                    } else {
                        entries = extractUrlsFromXml(xmlDoc);
                    }

                    entries.forEach(entry => {
                        if (!allPageUrlEntries.has(entry.url)) {
                           allPageUrlEntries.set(entry.url, entry);
                            onProgress({
                                type: 'crawling',
                                count: processedCount,
                                total: totalSitemaps,
                                currentSitemap: sitemapUrl,
                                pagesFound: allPageUrlEntries.size,
                                lastUrlFound: entry.url,
                                totalUrls: totalUrlCount,
                            });
                        }
                    });
                } catch (e) {
                    console.warn(`Could not process content sitemap ${sitemapUrl}:`, e instanceof Error ? e.message : String(e));
                } finally {
                    processedCount++;
                    onProgress({ type: 'crawling', count: processedCount, total: totalSitemaps, currentSitemap: sitemapUrl, pagesFound: allPageUrlEntries.size, totalUrls: totalUrlCount });
                }
            }
        }

        const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, sitemapsToCrawl.length) }).map(processWorker);
        await Promise.all(workers);

    } finally {
        clearTimeout(timeoutId);
    }
    
    return Array.from(allPageUrlEntries.values());
};
