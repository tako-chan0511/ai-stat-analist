import type { VercelRequest, VercelResponse } from '@vercel/node';

interface EStatDataValue { '@time': string; '$': string; [key: string]: string; }
interface AnalysisTarget { filters: { [key: string]: string }; filterNames: { [key: string]: string }; }

async function fetchSingleDataSet(appId: string, statsDataId: string, filters: any): Promise<EStatDataValue[]> {
  const params = new URLSearchParams({ appId, statsDataId });
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
      return [];
    }
    throw new Error(`e-Stat Error: ${eStatData.GET_STATS_DATA.RESULT.ERROR_MSG}`);
  }

  const rawValues = eStatData.GET_STATS_DATA.STATISTICAL_DATA?.DATA_INF?.VALUE;
  if (!rawValues) return [];
  
  return Array.isArray(rawValues) ? rawValues : [rawValues];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { statsDataId, analyses, question: initialQuestion } = req.body as { statsDataId: string; analyses: AnalysisTarget[]; question: string };
  const eStatAppId = process.env.ESTAT_APP_ID;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!statsDataId || !analyses?.length || !eStatAppId || !geminiApiKey) {
    return res.status(400).json({ error: 'リクエスト情報が不完全です。' });
  }

  try {
    const datasetsRaw = await Promise.all(
      analyses.map(analysis => fetchSingleDataSet(eStatAppId, statsDataId, analysis.filters))
    );

    const processedDatasets = datasetsRaw.map((values, i) => {
      const yearlyData = values.reduce((acc, v) => {
        const year = v['@time'].substring(0, 4);
        const value = parseFloat(v['$']);
        if (!isNaN(value)) acc[year] = value;
        return acc;
      }, {} as { [year: string]: number });
      
      return {
        name: Object.values(analyses[i].filterNames).join(' - '),
        data: yearlyData
      };
    });

    const allYears = [...new Set(processedDatasets.flatMap(d => Object.keys(d.data)))].sort();
    const chartData = {
      labels: allYears,
      datasets: processedDatasets.map(dataset => ({
        label: dataset.name,
        data: allYears.map(year => dataset.data[year] ?? null)
      }))
    };
    
    const dataSummaryForAI = processedDatasets.map(d => {
      const dataForPrompt = Object.entries(d.data).map(([year, value]) => ({ year, value }));
      return `- **データ名:** ${d.name}\n- **データ:** \`\`\`json\n${JSON.stringify(dataForPrompt.slice(-20))}\n\`\`\`\n`;
    }).join('');

    const question = initialQuestion || `以下の複数の統計データについて、それらの関係性、傾向、背景にある社会的・経済的要因を500字程度で分析・解説してください。`;
    const prompt = `
      あなたは日本のデータアナリストです。
      以下の統計データとユーザーからの質問を基に、プロフェッショナルな分析結果を日本語で返してください。
      **ユーザーからの質問:** 「${question}」
      **統計データ:**
      ${dataSummaryForAI}
      **指示:**
      - **最重要:** 必ず提供された「統計データ」だけを基に分析してください。データに含まれない事柄に関する質問が来た場合は、「ご提示のデータには〇〇に関する情報は含まれておりません。提供されたデータの範囲で回答します。」のように前置きした上で、分かる範囲で回答してください。
      - ユーザーの質問に答える形で、データの傾向（増加・減少など）を明確に述べた上で、その背景にある社会的な文脈や経済的な要因を考察してください。
      - 複数のデータがある場合は、それらの相関関係や関係性についても言及してください。
      - 専門家としての洞察（インサイト）を加えて、分かりやすく解説してください。
    `;
    
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