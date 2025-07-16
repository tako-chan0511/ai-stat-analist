import type { VercelRequest, VercelResponse } from '@vercel/node';

// ★★★ 型定義を追加 ★★★
interface EStatDataValue {
  '@time': string;
  '$': string;
  [key: string]: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { statsDataId, filters, filterNames } = req.body;
  const eStatAppId = process.env.ESTAT_APP_ID;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!statsDataId || !filters || !eStatAppId || !geminiApiKey) {
    return res.status(400).json({ error: 'リクエスト情報が不完全です。' });
  }

  try {
    // 1. e-Statからデータを取得
    const params = new URLSearchParams({ appId: eStatAppId, statsDataId });
    for (const [key, value] of Object.entries(filters)) {
      params.append(`cd${key.charAt(0).toUpperCase() + key.slice(1)}`, value as string);
    }
    const eStatUrl = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?${params.toString()}`;
    console.log(`[Info] Getting stats data: ${eStatUrl}`);

    const eStatResponse = await fetch(eStatUrl);
    if (!eStatResponse.ok) throw new Error(`e-Stat API request failed: ${eStatResponse.status}`);
    const eStatData = await eStatResponse.json();

    if (eStatData.GET_STATS_DATA.RESULT.STATUS !== 0) {
      if (eStatData.GET_STATS_DATA.RESULT.ERROR_MSG.includes('該当データはありません')) {
         return res.status(200).json({
          explanation: '指定された条件に合致するデータが見つかりませんでした。フィルターの条件を変更して再度お試しください。',
          chartData: { labels: [], datasets: [] }
        });
      }
      throw new Error(`e-Stat Error: ${eStatData.GET_STATS_DATA.RESULT.ERROR_MSG}`);
    }

    const rawValues = eStatData.GET_STATS_DATA.STATISTICAL_DATA?.DATA_INF?.VALUE;
    let values: EStatDataValue[] = []; 

    if (rawValues) {
      if (Array.isArray(rawValues)) {
        values = rawValues;
      } else {
        values = [rawValues];
      }
    }
    
    if (values.length === 0) {
      return res.status(200).json({
        explanation: '指定された条件に合致するデータが見つかりませんでした。フィルターの条件を変更して再度お試しください。',
        chartData: { labels: [], datasets: [] }
      });
    }

    // 2. グラフ用にデータを整形
    const labels = [...new Set(values.map(v => v['@time'].substring(0, 4)))].sort();
    const chartData = {
      labels,
      datasets: [{
        label: Object.values(filterNames).join(' - '),
        data: labels.map(year => {
          const yearData = values.find(v => v['@time'].startsWith(year));
          return yearData ? parseFloat(yearData['$']) : null;
        }),
      }]
    };

    // 3. AI分析用にデータを整形
    const dataForAI = {
      filter: filterNames,
      data: values.map(v => ({ year: v['@time'].substring(0, 4), value: v['$'] }))
    };
    
    const question = `以下の統計データについて、その傾向と背景にある社会的・経済的要因を300字程度で分析・解説してください。\n\nデータ項目: ${JSON.stringify(filterNames)}\n`;

    const prompt = `
      あなたは日本のデータアナリストです。
      以下の統計データとユーザーからの質問を基に、プロフェッショナルな分析結果を日本語で返してください。
      **ユーザーからの質問:** 「${question}」
      **統計データ:** \`\`\`json\n${JSON.stringify(dataForAI.data.slice(-20))}\n\`\`\`
      **指示:**
      - データの傾向（増加・減少など）を明確に述べた上で、その背景にある社会的な文脈や経済的な要因を考察してください。
      - 専門家としての洞察（インサイト）を加えて、分かりやすく解説してください。
    `;
    
    // 4. Gemini APIにリクエスト
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!apiResponse.ok) throw new Error(`AI APIがエラー: ${apiResponse.status}`);
    const responseData = await apiResponse.json();
    const explanation = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!explanation) throw new Error('AIからの応答が空です。');

    res.status(200).json({ explanation: explanation.trim(), chartData });

  } catch (error: any) {
    console.error('An error occurred in handler:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}