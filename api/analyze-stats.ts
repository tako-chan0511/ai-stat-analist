import type { VercelRequest, VercelResponse } from '@vercel/node';

// 型定義
interface EStatDataValue {
  '@time': string;
  '$': string;
  [key:string]: string;
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

    // ★★★★★ ここが修正点 ★★★★★
    // 国勢調査(0000010101)のデータの場合、API URLから@cat01フィルターを除外し、後処理でフィルターする
    if (request.statsDataId === '0000010101' && filtersForUrl['@cat01']) {
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

    // APIから取得した後のフィルター処理
    if (postFetchFilterCat01) {
        console.log(`Post-fetching filter for @cat01 = ${postFetchFilterCat01}`);
        const filteredValues = values.filter((v: EStatDataValue) => v['@cat01'] === postFetchFilterCat01);
        console.log(`Filtered down to ${filteredValues.length} records.`);
        return filteredValues;
    }
  
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

  // --- バックエンドが直接chartDataとchartOptionsを生成 ---
  const validDatasets = processedDatasets.filter(d => d.data.length > 0);
  const allYears = [...new Set(validDatasets.flatMap(d => d.data.map(p => p.year)))].sort();

  const finalDatasets = [];
  const scales: any = {};

  // 1つ目のデータセット（y軸）を処理
  const dataset1 = validDatasets[0];
  if (dataset1) {
    const dataMap = new Map(dataset1.data.map(p => [p.year, p.value]));
    finalDatasets.push({
      label: `${dataset1.name} (${dataset1.unit})`,
      data: allYears.map(year => dataMap.get(year) ?? null),
      yAxisID: 'y',
    });
  }

  // 2つ目のデータセット（y1軸）を処理
  const dataset2 = validDatasets[1];
  if (dataset2) {
    const dataMap = new Map(dataset2.data.map(p => [p.year, p.value]));
    finalDatasets.push({
      label: `${dataset2.name} (${dataset2.unit})`,
      data: allYears.map(year => dataMap.get(year) ?? null),
      yAxisID: 'y1',
    });
  }

  const chartData = {
    labels: allYears,
    datasets: finalDatasets,
  };


  // --- AIには解説文のみを要求 ---
  const dataSummaryForAI = processedDatasets.map(d => {
    if (d.data.length === 0) {
      return `- **データ名:** ${d.name}\n- **データ:** (このデータは取得できませんでした)`;
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
    ユーザーの質問に答える形で、データの関係性を分析してください。
    - **もし、いずれかのデータが「(このデータは取得できませんでした)」となっている場合**: そのデータは指定された条件では取得できなかったことを明確に述べた上で、取得できたデータから可能な範囲で分析を行ってください。
    - **全てのデータが取得できている場合**: 単なる事実だけでなく、背景にある経済的な要因や社会的な文脈を考察し、専門家としての洞察（インサイト）を加えて、300字程度で具体的に解説してください。
    
    **出力は、解説文のテキストのみとしてください。JSON形式は不要です。**
  `;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const apiResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!apiResponse.ok) {
    const errorBody = await apiResponse.text();
    console.error('AI API Error Response:', errorBody);
    throw new Error(`AI APIがエラーステータスを返しました: ${apiResponse.status}`);
  }

  const responseData = await apiResponse.json();

  if (responseData.candidates && responseData.candidates.length > 0) {
    const explanation = responseData.candidates[0].content.parts[0].text;
    console.log('Successfully received explanation from AI.');
    
    return {
      explanation: explanation.trim(),
      chartData: chartData,
    };
  } else {
    console.error('AI API response did not contain valid candidates:', responseData);
    throw new Error('AIからの応答に有効な候補が含まれていませんでした。');
  }
}
