import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  
  // .env.localから2種類のキーを読み込む試み
  const geminiKey = process.env.GEMINI_API_KEY;
  const viteGeminiKey = process.env.VITE_GEMINI_API_KEY;

  // 読み込んだ結果をHTMLとして画面に表示
  const responseHtml = `
    <h1>環境変数テスト結果</h1>
    <p>このページは、APIが.env.localの値を正しく読み込めているかを確認するためのテストページです。</p>
    <hr>
    <h3><code>GEMINI_API_KEY</code> の値:</h3>
    <pre style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">${geminiKey ? `読み込み成功: 「${geminiKey.substring(0, 8)}...」` : '<strong style="color: red;">未定義 (undefined)</strong>'}</pre>
    
    <h3><code>VITE_GEMINI_API_KEY</code> の値:</h3>
    <pre style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">${viteGeminiKey ? `読み込み成功: 「${viteGeminiKey.substring(0, 8)}...」` : '<strong style="color: red;">未定義 (undefined)</strong>'}</pre>
  `;
  
  res.status(200).setHeader('Content-Type', 'text/html').send(responseHtml);
}