
import { SocialMetrics, FbUrlType } from '../types';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Parse metrics handling "1.2K", "1M", "985", strings, or numbers
const parseMetric = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = String(value).toUpperCase().trim();
  
  // Handle "1.2M", "10K"
  if (str.includes('M')) {
    return parseFloat(str.replace(/[^0-9.]/g, '')) * 1000000;
  }
  if (str.includes('K')) {
    return parseFloat(str.replace(/[^0-9.]/g, '')) * 1000;
  }
  
  // Extract first valid number sequence
  const match = str.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
  if (match) {
      const clean = match[0].replace(/,/g, '');
      return Math.floor(parseFloat(clean) || 0);
  }

  return 0;
};

// Helper: Recursively search for 'video_view_count_renderer' and extract 'play_count'
// NOW UPDATED: Handles nesting inside 'feedback' object
const extractPlayCountFromRenderer = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return null;

    // Direct check at this level
    if ('video_view_count_renderer' in obj) {
        const renderer = obj['video_view_count_renderer'];
        if (renderer && typeof renderer === 'object') {
            // Priority 1: Check inside 'feedback' (Common in UFI2ViewCountRenderer)
            if (renderer.feedback && typeof renderer.feedback === 'object') {
                if ('play_count' in renderer.feedback) {
                    return renderer.feedback['play_count'];
                }
            }
            // Priority 2: Direct child
            if ('play_count' in renderer) return renderer['play_count'];
        }
    }

    // Recursive search
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = extractPlayCountFromRenderer(item);
            if (found !== null) return found;
        }
    } else {
        for (const key in obj) {
            // Skip large unrelated sub-trees to optimize
            if (['user', 'author', 'owner'].includes(key.toLowerCase())) continue;

            if (typeof obj[key] === 'object') {
                const found = extractPlayCountFromRenderer(obj[key]);
                if (found !== null) return found;
            }
        }
    }
    return null;
};

// Helper: Find a specific child key inside a parent object identified by regex (Generic)
const findNestedValue = (obj: any, parentKeyPattern: RegExp, childKey: string): any => {
    if (!obj || typeof obj !== 'object') return null;

    // Check current level for the parent object
    for (const key in obj) {
        if (parentKeyPattern.test(key)) {
            const parent = obj[key];
            if (parent && typeof parent === 'object') {
                // Check if child exists directly
                if (childKey in parent) return parent[childKey];
                
                // Nested dot notation check
                if (childKey.includes('.')) {
                    const parts = childKey.split('.');
                    let current = parent;
                    let valid = true;
                    for (const part of parts) {
                        if (current && typeof current === 'object' && part in current) {
                            current = current[part];
                        } else {
                            valid = false;
                            break;
                        }
                    }
                    if (valid) return current;
                }
            }
        }
    }

    // Recursive Search
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            const found = findNestedValue(obj[key], parentKeyPattern, childKey);
            if (found !== null) return found;
        }
    }
    return null;
};

// Helper: Generic key finder (Fallback)
const findKeyInObject = (obj: any, keyPattern: RegExp): any => {
    if (!obj || typeof obj !== 'object') return null;
    for (const key in obj) {
        if (keyPattern.test(key)) {
            const val = obj[key];
            if (val !== null && val !== undefined) {
                 if (typeof val === 'number') return val;
                 if (typeof val === 'string' && /\d/.test(val)) return val;
            }
        }
    }
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            const found = findKeyInObject(obj[key], keyPattern);
            if (found !== null) return found;
        }
    }
    return null;
};

// --- GENERIC ACTOR EXECUTOR ---
async function runApifyActor(actorId: string, input: any, token: string): Promise<any> {
    const encodedToken = encodeURIComponent(token);
    
    // 1. Start
    let startResponse;
    try {
        startResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${encodedToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
            credentials: 'omit',
        });
    } catch (networkErr: any) {
         if (networkErr.name === 'TypeError' && networkErr.message === 'Failed to fetch') {
            throw new Error("网络错误：广告拦截器或连接问题导致请求失败。");
        }
        throw networkErr;
    }

    if (!startResponse.ok) {
        const txt = await startResponse.text();
        // Translate common status errors
        if (startResponse.status === 401) throw new Error("无效的 Apify API 令牌。");
        if (startResponse.status === 404) throw new Error(`未找到 Actor '${actorId}' (404)。`);
        throw new Error(`Apify 启动失败 (${startResponse.status}): ${txt}`);
    }

    const runData = await startResponse.json();
    const runId = runData.data.id;
    const datasetId = runData.data.defaultDatasetId;

    // 2. Poll
    let status = runData.data.status;
    let attempts = 0;
    while (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED') {
        if (attempts > 60) throw new Error("超时：Apify 数据抓取耗时过长。");
        await wait(2000);
        attempts++;
        const pollRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${encodedToken}`, { credentials: 'omit' });
        if (pollRes.ok) {
            const pollJson = await pollRes.json();
            status = pollJson.data.status;
        }
    }

    if (status !== 'SUCCEEDED') return null; 

    // 3. Fetch Data
    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodedToken}`, { credentials: 'omit' });
    if (!datasetRes.ok) return null;
    
    const items = await datasetRes.json();
    return items && items.length > 0 ? items[0] : null;
}

// --- DATA NORMALIZER ---
function normalizeData(item: any, type: FbUrlType): SocialMetrics {
    if (!item) return { views: 0, likes: 0, comments: 0, shares: 0, raw: null };
    
    // --- STRATEGY: Strict User Requirements First ---

    // 1. Views
    // STRICT REQUIREMENT: video_view_count_renderer -> (feedback) -> play_count
    // We used the updated extractPlayCountFromRenderer to handle the nesting.
    let rawViews = extractPlayCountFromRenderer(item);
    
    // Fallbacks removed to ensure we don't pick up incorrect data (like video_view_count).
    // The only allowed fallback is a strict deep search for "play_count" ONLY.
    if (!rawViews) {
        // Deep search: Strict 'play_count' exact match only.
        // matches: play_count. DOES NOT MATCH: playCount, plays, play_count_reduced
        rawViews = findKeyInObject(item, /^play_count$/);
    }

    // 2. Comments
    // User requested: Comment_rendering_instance -> total_count
    let rawComments = findNestedValue(item, /Comment_rendering_instance/i, 'comments.total_count');
    if (!rawComments) {
         rawComments = findNestedValue(item, /Comment_rendering_instance/i, 'total_count');
    }

    if (!rawComments) {
        rawComments = item.commentsCount || item.comments || item.metrics?.comments;
    }
    if (!rawComments) {
         rawComments = findKeyInObject(item, /^(?:comment)(?:s|_count)?$/i);
    }

    // 3. Likes
    // User requested: Reaction_count -> count
    let rawLikes = findNestedValue(item, /Reaction_count/i, 'count');
    
    if (!rawLikes) {
        rawLikes = item.likesCount || item.likes || item.reactionCount;
    }
    if (!rawLikes && item.reactions) {
        rawLikes = Object.values(item.reactions).reduce((a: any, b: any) => a + (Number(b) || 0), 0);
    }
    if (!rawLikes) {
        rawLikes = findKeyInObject(item, /^(?:like|reaction)(?:s|_count)?$/i);
    }

    // 4. Shares (Standard)
    let rawShares = item.sharesCount || item.shareCount || item.shares;
    if (!rawShares) rawShares = findKeyInObject(item, /^(?:share)(?:s|_count)?$/i);

    return {
        views: parseMetric(rawViews),
        likes: parseMetric(rawLikes),
        comments: parseMetric(rawComments),
        shares: parseMetric(rawShares),
        postText: item.text || item.postText || item.description || item.caption || '',
        author: item.user?.name || item.ownerUsername || item.name || 'Unknown',
        thumbnail: item.thumbnail || item.imageUrl || item.videoThumbnail || item.attachments?.[0]?.media?.image?.src || '',
        raw: item, // Attach raw data for debugging
        normalizationDebug: {
            rawViews: rawViews,
            rawLikes: rawLikes
        }
    };
}


// --- MAIN EXPORT ---
export const fetchFacebookData = async (
  url: string, 
  type: FbUrlType, 
  apiToken: string,
  useDemoData: boolean
): Promise<SocialMetrics> => {
  
  const rawToken = apiToken ? apiToken.trim() : '';

  // SIMULATION
  if (useDemoData || !rawToken) {
    await wait(2000); 
    if (type === FbUrlType.VIDEO) {
      return {
        views: 985, 
        likes: 8,
        comments: 0,
        shares: 2,
        postText: "演示视频内容摘要",
        author: "演示创作者",
        thumbnail: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=600&fit=crop",
        raw: { demo: true, message: "这是模拟数据" },
        normalizationDebug: { rawViews: 985, rawLikes: 8 }
      };
    } else {
      return {
        views: 50000,
        likes: 2500,
        comments: 100,
        shares: 50,
        author: "演示主页",
        postText: "演示主页内容摘要",
        thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
        raw: { demo: true, message: "这是模拟数据" },
        normalizationDebug: { rawViews: 50000, rawLikes: 2500 }
      };
    }
  }

  // REAL API
  try {
    // Requested Strategy: Single API (apify/facebook-posts-scraper)
    console.log("Fetching with apify~facebook-posts-scraper...");
    
    const actorId = type === FbUrlType.PAGE ? 'apify~facebook-pages-scraper' : 'apify~facebook-posts-scraper';
    
    const input = {
        "startUrls": [{ "url": url }],
        "maxItems": 1,
        "resultsLimit": 1,
        "proxyConfiguration": { "useApifyProxy": true },
        "view": "Blue" // Desktop view often reveals the renderer objects
    };

    const data = await runApifyActor(actorId, input, rawToken);
    
    if (!data) {
        throw new Error("Apify 未返回数据。");
    }
    
    console.log("Raw Apify Item:", data); // Helpful for user to see in console
    return normalizeData(data, type);

  } catch (error: any) {
    console.error("Apify Service Error:", error);
    if (error instanceof Error) throw error;
    throw new Error("分析过程中发生未知错误。");
  }
};
