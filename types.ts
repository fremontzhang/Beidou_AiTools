
export enum FbUrlType {
  VIDEO = 'VIDEO',
  PAGE = 'PAGE',
  UNKNOWN = 'UNKNOWN',
}

export interface SocialMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  postText?: string;
  thumbnail?: string;
  author?: string;
  raw?: any;
  normalizationDebug?: {
    rawViews: any;
    rawLikes: any;
  };
}

export interface AnalysisResult {
  url: string;
  type: FbUrlType;
  metrics: SocialMetrics;
  aiInsight?: string;
}

export interface ApifyConfig {
  token: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING_DATA = 'LOADING_DATA',
  ANALYZING_AI = 'ANALYZING_AI',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
