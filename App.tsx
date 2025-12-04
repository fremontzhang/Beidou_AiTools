
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  BarChart2, 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  Eye, 
  BrainCircuit, 
  Lock, 
  AlertCircle,
  Terminal,
  Code
} from 'lucide-react';
import { detectUrlType } from './services/urlParser';
import { fetchFacebookData } from './services/apifyService';
import { getGeminiInsight } from './services/geminiService';
import { MetricCard } from './components/MetricCard';
import { FbUrlType, AppState, AnalysisResult } from './types';

export default function App() {
  const [url, setUrl] = useState('');
  // Pre-filled token as requested
  const [apifyToken, setApifyToken] = useState('apify_api_ewvicNVC5E6uNbffshkCKgxWqlBc1b3SemQp');
  // Default to real data mode since we have a token
  const [useDemoMode, setUseDemoMode] = useState(false);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const geminiKey = process.env.API_KEY || ''; 

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    if (errorMsg) setErrorMsg('');
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setResult(null);

    const type = detectUrlType(url);
    if (type === FbUrlType.UNKNOWN) {
      setErrorMsg('无效的 Facebook 链接。请输入有效的视频、Reel 或主页链接。');
      return;
    }

    if (!useDemoMode && !apifyToken) {
      setErrorMsg('请提供 Apify API 令牌或切换到演示模式。');
      return;
    }

    setAppState(AppState.LOADING_DATA);

    try {
      const metrics = await fetchFacebookData(url, type, apifyToken, useDemoMode);
      
      setResult({
        url,
        type,
        metrics,
      });

      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      setErrorMsg(err.message || '获取数据失败');
      setAppState(AppState.ERROR);
    }
  };

  const handleGenerateInsights = async () => {
    if (!result) return;
    setAppState(AppState.ANALYZING_AI);
    
    const insight = await getGeminiInsight(result.metrics, result.type, geminiKey);
    
    setResult(prev => prev ? { ...prev, aiInsight: insight } : null);
    setAppState(AppState.SUCCESS);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight flex items-center">
              <span className="text-blue-600">Ursa Major</span>
              <span className="text-slate-400 mx-1">-</span>
              <span className="text-purple-600">Alkaid</span>
              <span className="ml-3 text-red-600">北斗-摇光</span>
            </h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            Facebook 数据分析工具
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-12">
        
        {/* Intro / PRD Summary */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">分析任何 Facebook 视频或主页</h2>
          <p className="text-slate-600 max-w-xl mx-auto">
            输入公开链接（视频、Reel 或主页），通过 Apify 提取播放量、点赞和互动数据。使用 Gemini AI 获取策略洞察。
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          
          {/* Config Toggles */}
          <div className="flex items-center justify-end mb-4 space-x-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={useDemoMode} 
                onChange={(e) => {
                  setUseDemoMode(e.target.checked);
                  setErrorMsg('');
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-slate-600">演示模式 (模拟数据)</span>
            </label>
            {!useDemoMode && (
              <div className="relative group">
                <div className="flex items-center border rounded-md px-2 py-1 bg-slate-50 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                  <Lock className="w-3 h-3 text-slate-400 mr-2" />
                  <input 
                    type="password" 
                    placeholder="Apify API 令牌" 
                    value={apifyToken}
                    onChange={(e) => handleInputChange(setApifyToken, e.target.value)}
                    autoComplete="new-password"
                    className="bg-transparent border-none text-xs w-64 focus:ring-0 font-mono text-slate-600"
                  />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleAnalyze} className="relative">
            <input
              type="text"
              placeholder="粘贴 Facebook 视频或主页链接 (例如 facebook.com/.../videos/...)"
              value={url}
              onChange={(e) => handleInputChange(setUrl, e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-lg transition-all outline-none"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            <button 
              type="submit"
              disabled={appState === AppState.LOADING_DATA || !url}
              className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {appState === AppState.LOADING_DATA ? '扫描中...' : '开始分析'}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-3 animate-fade-in border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header Result */}
            <div className="flex items-start gap-4 mb-6">
              {result.metrics.thumbnail && (
                <img 
                  src={result.metrics.thumbnail} 
                  alt="Content Thumbnail" 
                  className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                />
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${result.type === FbUrlType.VIDEO ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                    {result.type}
                  </span>
                  <span className="text-slate-500 text-sm">@{result.metrics.author}</span>
                </div>
                <h3 className="text-slate-900 font-medium line-clamp-1">{result.metrics.postText || result.url}</h3>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard 
                label="观看量 / 播放次数" 
                value={result.metrics.views} 
                icon={Eye} 
                color="text-blue-600 bg-blue-600" 
              />
              <MetricCard 
                label="点赞数" 
                value={result.metrics.likes} 
                icon={ThumbsUp} 
                color="text-emerald-600 bg-emerald-600" 
              />
              <MetricCard 
                label="评论数" 
                value={result.metrics.comments} 
                icon={MessageCircle} 
                color="text-purple-600 bg-purple-600" 
              />
              <MetricCard 
                label="分享数" 
                value={result.metrics.shares} 
                icon={Share2} 
                color="text-orange-600 bg-orange-600" 
              />
            </div>

            {/* AI Action */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <BrainCircuit className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-900">Gemini 策略洞察</h4>
                    <p className="text-sm text-indigo-700">获取 AI 对这些数据的深度反馈。</p>
                  </div>
                </div>
                {!result.aiInsight && (
                  <button 
                    onClick={handleGenerateInsights}
                    disabled={appState === AppState.ANALYZING_AI}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-70"
                  >
                    {appState === AppState.ANALYZING_AI ? '分析中...' : '生成洞察'}
                  </button>
                )}
              </div>
              
              {result.aiInsight && (
                <div className="bg-white/80 p-4 rounded-lg text-slate-700 text-sm leading-relaxed border border-indigo-100/50">
                  <p className="whitespace-pre-line">{result.aiInsight}</p>
                </div>
              )}
            </div>

            {/* Internal Variables Debug */}
            {result.metrics.normalizationDebug && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                 <div className="flex items-center gap-2 mb-3 text-slate-500">
                    <Code className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Internal Logic Debug</span>
                 </div>
                 <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 font-mono text-xs">
                    <div className="flex justify-between border-b border-slate-700 pb-2 mb-2 text-slate-400">
                        <span>Variable</span>
                        <span>Captured Value</span>
                    </div>
                    
                    <div className="flex justify-between text-cyan-400 mb-1">
                        <span>result.metrics.views (App State)</span>
                        <span className="font-bold">{String(result.metrics.views)}</span>
                    </div>

                    <div className="flex justify-between text-yellow-400 mb-1">
                        <span>rawViews (in Normalize)</span>
                        <span className="font-bold">{String(result.metrics.normalizationDebug.rawViews)}</span>
                    </div>
                     <div className="flex justify-between text-slate-300">
                        <span>rawLikes (in Normalize)</span>
                        <span>{String(result.metrics.normalizationDebug.rawLikes)}</span>
                    </div>
                 </div>
              </div>
            )}
            
            {/* Raw JSON Debug */}
            {result.metrics.raw && (
              <div className="mt-4">
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer list-none text-slate-500 hover:text-blue-600 transition-colors">
                    <div className="bg-slate-100 p-1.5 rounded-md group-open:bg-blue-100 group-open:text-blue-600">
                       <Terminal className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider">Debug: Raw API Response JSON</span>
                  </summary>
                  <div className="mt-4 bg-slate-900 rounded-lg p-4 overflow-x-auto shadow-inner border border-slate-800">
                    <pre className="text-xs text-green-400 font-mono leading-relaxed">
                      {JSON.stringify(result.metrics.raw, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}

          </div>
        )}

      </main>
      
      {/* Footer / Disclaimer */}
      <footer className="fixed bottom-0 w-full bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        Apify + Gemini 集成演示概念。数据抓取需要有效的 Apify 令牌。
      </footer>
    </div>
  );
}
