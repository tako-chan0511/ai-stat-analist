import type { VercelRequest, VercelResponse } from '@vercel/node';

interface EStatDataValue {
  '@time': string;
  '$': string;
}
interface AnalysisRequest {
  id: string;
  name: string;
  unit: string;
  statsDataId: string;
  code: string;
}
interface ProcessedDataset {
  name: string;
  unit: string;
  data: { year: string, value: number }[];
}

const ALL_AGE_CATEGORIES: AnalysisRequest[] = [
  { id: 'young-population', name: '年少人口 (0-14歳)', unit: '人', statsDataId: '0000010101', code: 'A1301' },
  { id: 'working-age-population', name: '生産年齢人口 (15-64歳)', unit: '人', statsDataId: '0000010101', code: 'A1302' },
  { id: 'elderly-population', name: '老年人口 (65歳以上)', unit: '人', statsDataId: '0000010101', code: 'A1401' },
];

async function fetchEstatData(appId: string, req: AnalysisRequest): Promise<ProcessedDataset> {
  const params = new URLSearchParams({
    appId,
    statsDataId: req.statsDataId,
    cdCat01: req.code,
    cdArea: '40000', // 福岡県
  });

  const eStatUrl = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?${params.toString()}`;
  console.log(`[Info] Requesting: ${eStatUrl}`);
  
  const response = await fetch(eStatUrl);
  if (!response.ok) throw new Error(`e-Stat API request failed: ${response.status}`);
  
  const data = await response.json();
  const result = data.GET_STATS_DATA.RESULT;
  if (result.STATUS !== 0) {
    if (result.ERROR_MSG.includes('該当データはありません')) return { name: req.name, unit: req.unit, data: [] };
    throw new Error(`e-Stat API error: ${result.ERROR_MSG}`);
  }
  
  const values: EStatDataValue[] = data.GET_STATS_DATA.STATISTICAL_DATA?.DATA_INF?.VALUE || [];
  
  const yearlyData = values.reduce((acc, v) => {
    const year = v['@time'].substring(0, 4);
    const value = parseFloat(v['$']);
    if (!isNaN(value)) {
      acc[year] = (acc[year] || 0) + value;
    }
    return acc;
  }, {} as { [year: string]: number });
  
  const sortedData = Object.entries(yearlyData)
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));

  return { name: req.name, unit: req.unit, data: sortedData };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { question, categories } = req.body as { question: string, categories: AnalysisRequest[] };
  const eStatAppId = process.env.ESTAT_APP_ID;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!question || !categories?.length || !eStatAppId || !geminiApiKey) {
    return res.status(400).json({ error: 'リクエスト情報が不完全です。' });
  }

  try {
    let finalCategories = categories;
    if (categories.length === 1 && categories[0].id === 'all-age-groups') {
      finalCategories = ALL_AGE_CATEGORIES;
    }

    const datasets = await Promise.all(
      finalCategories.map(cat => fetchEstatData(eStatAppId, cat))
    );
    
    const analysisResult = await getAnalysisFromAI(question, datasets, geminiApiKey);
    res.status(200).json(analysisResult);

  } catch (error: any) {
    console.error('An error occurred in handler:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}

async function getAnalysisFromAI(
  question: string, 
  datasets: ProcessedDataset[],
  apiKey: string
) {
  const validDatasets = datasets.filter(d => d.data.length > 0);
  if (validDatasets.length === 0) {
    return {
      explanation: '申し訳ありませんが、指定された条件で統計データを取得できませんでした。',
      chartData: { labels: [], datasets: [] }
    };
  }

  console.log("\n--- [データ集計結果の確認] ---");
  datasets.forEach(d => {
    console.log(`[データ名]: ${d.name}`);
    console.table(d.data);
  });
  console.log("--- [確認ここまで] ---\n");

  const allYears = [...new Set(validDatasets.flatMap(d => d.data.map(p => p.year)))].sort();
  const chartData = {
    labels: allYears,
    datasets: validDatasets.map((d) => {
      const dataMap = new Map(d.data.map(p => [p.year, p.value]));
      const useSecondAxis = validDatasets.length > 2 ? false : (validDatasets.length === 2 && d.unit !== validDatasets[0].unit);
      return {
        label: `${d.name} (${d.unit})`,
        data: allYears.map(year => dataMap.get(year) ?? null),
        yAxisID: useSecondAxis ? 'y1' : 'y',
      };
    }),
  };

  const dataSummaryForAI = datasets.map(d => {
    if (d.data.length === 0) return `- **データ名:** ${d.name}\n- **データ:** (取得できませんでした)`;
    return `- **データ名:** ${d.name}\n- **データ:** \`\`\`json\n${JSON.stringify(d.data.slice(-20))}\n\`\`\`\n`;
  }).join('');

  const prompt = `
    あなたは福岡県専門の優秀なデータアナリストです。以下の複数の統計データとユーザーからの質問を基に、プロフェッショナルな分析結果を日本語で返してください。
    **ユーザーからの質問:** 「${question}」
    **統計データ:**
    ${dataSummaryForAI}
    **指示:**
    - ユーザーの質問に答える形で、データの関係性を分析してください。
    - 単なる事実だけでなく、背景にある経済的な要因や社会的な文脈を考察し、専門家としての洞察を加えて、300字程度で具体的に解説してください。
  `;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const apiResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!apiResponse.ok) throw new Error(`AI APIがエラー: ${apiResponse.status}`);
  const responseData = await apiResponse.json();
  const explanation = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!explanation) throw new Error('AIからの応答が空です。');

  return { explanation: explanation.trim(), chartData: chartData };
}