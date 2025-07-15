import type { VercelRequest, VercelResponse } from '@vercel/node';

// 型定義
interface EStatDataValue {
  '@time': string;
  '$': string;
  [key: string]: string;
}
interface CategoryInfo {
  name: string;
  unit: string;
}
interface AnalysisRequest {
  statsDataId: string;
  filters: { [key: string]: string };
  categoryInfo: CategoryInfo;
}

// e-Stat APIからデータを取得する単一関数
async function fetchEstatData(request: AnalysisRequest, appId: string): Promise<EStatDataValue[]> {
  const filtersForUrl = { ...request.filters };
  let postFetchFilterCat01: string | undefined = undefined;

  // 年齢別人口データ(0000010103)の場合、API URLから@cat01フィルターを除外し、後処理でフィルターする
  if (request.statsDataId === '0000010103' && filtersForUrl['@cat01']) {
    console.log(`Special handling for statsDataId ${request.statsDataId}: preparing for post-fetch filtering.`);
    postFetchFilterCat01 = filtersForUrl['@cat01'];
    delete filtersForUrl['@cat01'];
  }

  const filterParams = Object.entries(filtersForUrl)
    .map(([key, value]) => {
      const eStatKey = 'cd' + key.charAt(1).toUpperCase() + key.slice(2);
      return `${eStatKey}=${value}`;
    })
    .join('&');
  
  const eStatUrl = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?appId=${appId}&statsDataId=${request.statsDataId}&${filterParams}`;
  
  console.log(`Fetching data for "${request.categoryInfo.name}" from: ${eStatUrl}`);

  const eStatResponse = await fetch(eStatUrl);
  if (!eStatResponse.ok) {
    throw new Error(`e-Stat API request for "${request.categoryInfo.name}" failed.`);
  }

  const eStatData = await eStatResponse.json();
  const resultInfo = eStatData.GET_STATS_DATA.RESULT;
  if (resultInfo.STATUS !== 0) {
    if (resultInfo.ERROR_MSG.includes('該当データはありません')) {
        console.warn(`No data found for "${request.categoryInfo.name}" (API reported no data). Returning empty array.`);
        return [];
    }
    throw new Error(`e-Stat API returned an error for "${request.categoryInfo.name}": ${resultInfo.ERROR_MSG}`);
  }

  const values = eStatData.GET_STATS_DATA.STATISTICAL_DATA?.DATA_INF?.VALUE;
  if (!values || !Array.isArray(values) || values.length === 0) {
    console.warn(`No data found for "${request.categoryInfo.name}". It might be empty.`);
    return [];
  }

  // ★★★★★ ここからが修正点 ★★★★★
  // APIから取得した後のフィルター処理
  if (postFetchFilterCat01) {
    console.log('Data received from e-Stat BEFORE filtering (first 5 items):', JSON.stringify(values.slice(0, 5), null, 2));
    console.log(`Post-fetching filter for @cat01 = ${postFetchFilterCat01}`);
    
    // デバッグ用に、受信したデータに含まれる全ての@cat01コードをログに出力
    const uniqueCat01Values = [...new Set(values.map(v => v['@cat01']))];
    console.log('Unique @cat01 values in received data:', uniqueCat01Values);

    const filteredValues = values.filter((v: EStatDataValue) => v['@cat01'] === postFetchFilterCat01);
    
    console.log(`Filtered down to ${filteredValues.length} records.`);
    if (filteredValues.length === 0) {
        console.warn('Filtering resulted in an empty dataset. Check if the category codes in estatData.ts are correct. The available codes were:', uniqueCat01Values);
    }
    return filteredValues; // フィルター後のデータを返す
  }
  // ★★★★★ ここまでが修正点 ★★★★★
  
  return values;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { question, categories } = req.body as { question: string, categories: AnalysisRequest[] };
  const eStatAppId = process.env.ESTAT_APP_ID;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!question || !categories || categories.length === 0) {
    return res.status(400).json({ error: 'リクエストに必要な情報が不足しています。' });
  }
  if (!eStatAppId || !geminiApiKey) {
    return res.status(500).json({ error: 'APIキーがサーバー側で設定されていません。' });
  }

  try {
    const dataPromises = categories.map(category => fetchEstatData(category, eStatAppId));
    const datasets = await Promise.all(dataPromises);

    console.log(`Successfully fetched ${datasets.length} datasets from e-Stat.`);

    const analysisResult = await getAnalysisFromAI(question, categories, datasets, geminiApiKey);

    res.status(200).json(analysisResult);

  } catch (error: any) {
    console.error('An error occurred in handler:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}

// データを年次に集計するヘルパー関数
function aggregateYearly(values: EStatDataValue[]) {
    const yearlyData = values.reduce((acc, v) => {
        const year = v['@time'].substring(0, 4);
        const value = parseFloat(v['$']);
        if (!isNaN(value)) {
            acc[year] = (acc[year] || 0) + value;
        }
        return acc;
    }, {} as { [year: string]: number });

    return Object.entries(yearlyData).map(([year, value]) => ({
        year,
        value,
    })).sort((a, b) => parseInt(a.year) - parseInt(b.year));
}


async function getAnalysisFromAI(
  question: string, 
  requests: AnalysisRequest[],
  datasets: EStatDataValue[][],
  apiKey: string
) {
  const processedDatasets = requests.map((req, i) => ({
    name: req.categoryInfo.name,
    unit: req.categoryInfo.unit,
    data: aggregateYearly(datasets[i]),
  }));

  const dataSummaryForAI = processedDatasets.map(d => {
    if (d.data.length === 0) {
      return `- **データ名:** ${d.name}\n- **データ:** (取得できませんでした)`;
    }
    return `- **データ名:** ${d.name}\n- **データ:** \`\`\`json\n${JSON.stringify(d.data.slice(-15))}\n\`\`\`\n`;
  }).join('');

  const prompt = `
    あなたは福岡県専門の優秀なデータアナリストです。
    以下の複数の統計データとユーザーからの質問を基に、プロフェッショナルな分析結果を日本語で返してください。

    **ユーザーからの質問:** 「${question}」

    **統計データ:**
    ${dataSummaryForAI}

    **指示:**
    1. **explanation**: ユーザーの質問に答える形で、データの関係性を分析してください。
       - **もし、いずれかのデータが「(取得できませんでした)」となっている場合**: そのデータは取得できなかったことを述べた上で、取得できたデータから可能な範囲で分析を行ってください。例えば、「〇〇のデータは取得できませんでしたが、△△のデータからは□□という傾向が読み取れます」のように、柔軟に解説してください。
       - **全てのデータが取得できている場合**: 単なる事実だけでなく、背景にある経済的な要因や社会的な文脈を考察し、専門家としての洞察（インサイト）を加えて、300字程度で具体的に解説してください。
    2. **chartData**: グラフ描画用に、**取得できたデータのみ**を以下のJSON形式で整形してください。データが2つある場合は、それぞれ別のY軸（yAxisID: 'y' と 'y1'）を使用してください。単独データや、同じ単位のデータ同士を比較する場合は、全て同じY軸（yAxisID: 'y'）を使用してください。

    **出力形式:**
    \`\`\`json
    {
      "explanation": "ここに専門的な解説文",
      "chartData": {
        "labels": [],
        "datasets": [
          { "label": "1つ目のデータ名 (単位)", "data": [], "yAxisID": "y" },
          { "label": "2つ目のデータ名 (単位)", "data": [], "yAxisID": "y1" }
        ]
      }
    }
    \`\`\`
  `;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const apiResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const data = await apiResponse.json();

  if (apiResponse.ok && data.candidates) {
    const parsedJson = JSON.parse(data.candidates[0].content.parts[0].text);
    console.log('Successfully parsed response from AI.');
    return parsedJson;
  } else {
    console.error('AI API Error:', data);
    throw new Error(`AI APIからの応答エラーです。`);
  }
}
