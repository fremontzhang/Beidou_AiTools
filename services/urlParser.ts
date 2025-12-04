
import { FbUrlType } from '../types';

export const detectUrlType = (url: string): FbUrlType => {
  if (!url) return FbUrlType.UNKNOWN;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (!hostname.includes('facebook.com') && !hostname.includes('fb.watch')) {
      return FbUrlType.UNKNOWN;
    }

    const path = urlObj.pathname;

    // Regex for Videos & Reels
    // Supports:
    // - /reel/123...
    // - /watch/?v=123...
    // - /pageId/videos/videoId... (e.g. /61573622668411/videos/2762107544122398)
    // - /video.php?v=...
    const videoPathPattern = /\/reel\/|\/watch\/|\/videos\/|\/video\.php/i;
    
    // Regex for Pages
    // Examples: /pageName/, /profile.php?id=123
    const pagePattern = /[a-zA-Z0-9.]+/; 

    // Check for video signatures in path or query params
    if (videoPathPattern.test(path) || urlObj.searchParams.has('v')) {
      return FbUrlType.VIDEO;
    }
    
    if (pagePattern.test(path)) {
      return FbUrlType.PAGE;
    }

    return FbUrlType.UNKNOWN;
  } catch (e) {
    return FbUrlType.UNKNOWN;
  }
};
