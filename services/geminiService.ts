
import { GoogleGenAI } from "@google/genai";
import { SocialMetrics, FbUrlType } from '../types';

export const getGeminiInsight = async (
  metrics: SocialMetrics,
  type: FbUrlType,
  apiKey: string
): Promise<string> => {
  if (!apiKey) {
    return "请提供 Gemini API Key 以解锁洞察功能。";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Updated prompt to ask for Chinese response
    const prompt = `
      作为一名社交媒体策略师，请分析以下 Facebook ${type} 的表现数据：
      - 观看量 (Views): ${metrics.views}
      - 点赞数 (Likes): ${metrics.likes}
      - 评论数 (Comments): ${metrics.comments}
      - 分享数 (Shares): ${metrics.shares}
      ${metrics.postText ? `- 内容摘要: "${metrics.postText.substring(0, 100)}..."` : ''}

      请计算互动率（(点赞+评论+分享) / 观看量）。
      请用中文提供一段简短的分析（约3句话），并给出2个可行的改进建议。
      语气请保持专业和鼓励性。
    `;

    // Use explicit structure for stability
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{ text: prompt }]
      },
    });

    if (response && response.text) {
        return response.text;
    }
    
    return "未生成洞察 (响应为空)。";

  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    const errString = error.toString();
    // Catch common AdBlock or Network issues specific to the Web SDK
    if (errString.includes("xhr error") || errString.includes("Rpc failed") || errString.includes("NetworkError")) {
        return "网络错误：Gemini AI 请求被拦截。请禁用广告拦截器 (AdBlock/uBlock) 或检查您的网络连接。";
    }

    return "暂时无法生成洞察，请稍后再试。";
  }
};
