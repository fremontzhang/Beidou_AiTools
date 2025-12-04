# Product Requirement Document (PRD) & Technical Analysis

## Part 1: Product Logic & Analysis

### 1. Service Selection Analysis: Apify vs. Ayrshare
For your specific goal—"Input **any** Facebook URL (Page or Reel) to check stats"—the recommendation is **Apify**.

*   **Ayrshare**: This is an official Social Media Management API. It requires OAuth (Login with Facebook) and is designed for managing *your own* accounts or accounts that have explicitly granted your app permission. It restricts access to public data of arbitrary users/pages (competitors).
*   **Apify**: This is a web scraping platform. It uses Actors (scripts running headless browsers) to extract data that is publicly available on the web.
    *   **Verdict**: **Apify** is the only viable choice for a tool that analyzes competitors or arbitrary public URLs without requiring the owner's login credentials.

### 2. User Flow
1.  **Landing**: User sees a simple, clean interface with a URL input field.
2.  **Configuration**: User provides an Apify API Token (or uses a Demo Mode).
3.  **Input**: User pastes a Facebook URL.
4.  **Validation**: System detects if it is a Reel, a Page, or Invalid.
5.  **Processing**:
    *   App calls specific Apify Actor based on URL type.
    *   App polls for task completion.
6.  **Display**: Show Views, Likes, Comments, and calculated Engagement Rate.
7.  **AI Insight**: User clicks "Analyze with Gemini" to get qualitative feedback on the metrics.

### 3. Input Logic (Regex)
*   **Reels**: Matches patterns like `facebook.com/reel/<id>`, `facebook.com/watch/?v=<id>`.
*   **Pages**: Matches `facebook.com/<page_name>` or `facebook.com/profile.php?id=<id>`.

## Part 2: Technical Solution

### Recommended Stack
*   **Frontend**: React (Vite) + TypeScript + Tailwind CSS. (Fast deployment, great interactive UI).
*   **Backend/Proxy**: For an MVP, we can call Apify directly from the frontend (Client-side) using `fetch`. For production, a serverless function (Next.js API route) is better to hide the API Token.
*   **AI Layer**: Google Gemini 2.5 Flash for rapid analysis of the numerical data.

### API Strategy (Apify)
*   **Reels**: Use `apify/facebook-reel-scraper` or generic `apify/facebook-post-scraper`.
*   **Pages**: Use `apify/facebook-pages-scraper`.

**Sample Payload (Reel Scraper):**
```json
{
  "startUrls": [{ "url": "https://www.facebook.com/reel/123456789" }],
  "maxItems": 1
}
```

### Data Schema (Normalized)
```typescript
interface VideoMetrics {
  type: 'REEL' | 'PAGE_VIDEO';
  url: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  datePosted?: string;
  description?: string;
}
```

## Part 3: Implementation Roadmap (1 Day)
1.  **Hour 1-2**: Setup React project, Tailwind, and basic UI layout.
2.  **Hour 3-4**: Implement `UrlParser` logic and integration with Apify API (run actor -> poll dataset).
3.  **Hour 5**: Implement Data Visualization (Charts/Cards) for the results.
4.  **Hour 6**: Integrate Google Gemini for "AI Insights" on the data.
5.  **Hour 7-8**: Error handling, loading states, and polish.
