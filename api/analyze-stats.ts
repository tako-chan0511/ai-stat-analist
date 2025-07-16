import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- 型定義 ---
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

/**
 * e-Stat APIから単一の統計データを取得する関数
 */
async function fetchEstatData(request: AnalysisRequest, appId: string): Promise<EStatDataValue[]> {
    // 【ステップ1】 フィルターの準備
    // これからAPIにリクエストを投げますが、その前にフィルター条件を整理します。
    console.log(`\n--- [データ取得開始] ---`);
    console.log(`[Info] カテゴリ "${request.categoryInfo.name}" の処理を開始します。`);
    
    const filtersForUrl = { ...request.filters };
    let postFetchFilter: { key: string, value: string } | undefined = undefined;

    // 【特別処理】 国勢調査(statsDataId: 0000010101) の場合、
    // 年齢別データを取得するには、まず全データを取得してからプログラムで仕分ける必要があります。
    if (request.statsDataId === '0000010101' && filtersForUrl['@cat01']) {
        // 仕分けに使うキー（'@cat01'）と値（'A1102'など）を記憶しておきます。
        postFetchFilter = { key: '@cat01', value: filtersForUrl['@cat01'] };
        // APIリクエストのURLからは、この仕分け用フィルターを一旦削除します。
        delete filtersForUrl['@cat01'];
        console.log(`[Debug] このデータは国勢調査の年齢別データです。`);
        console.log(`[Debug] APIから全年齢データを取得後、キー '${postFetchFilter.key}' の値が '${postFetchFilter.value}' のものを抽出します。`);
    }

    // 【ステップ2】 APIリクエストURLの組み立て
    const filterParams = Object.entries(filtersForUrl)
        .map(([key, value]) => {
            const eStatKey = 'cd' + key.charAt(1).toUpperCase() + key.slice(2);
            return `${eStatKey}=${value}`;
        })
        .join('&');
    
    const eStatUrl = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?appId=${appId}&statsDataId=${request.statsDataId}&${filterParams}`;
    console.log(`[Info] e-StatへのリクエストURL: ${eStatUrl}`);

    // 【ステップ3】 e-Stat APIからデータを取得
    const eStatResponse = await fetch(eStatUrl);
    if (!eStatResponse.ok) throw new Error(`e-Stat API request failed for "${request.categoryInfo.name}".`);

    const eStatData = await eStatResponse.json();
    const resultInfo = eStatData.GET_STATS_DATA.RESULT;
    if (resultInfo.STATUS !== 0) {
        if (resultInfo.ERROR_MSG.includes('該当データはありません')) {
            console.warn(`[Warning] No data found for "${request.categoryInfo.name}".`);
            return [];
        }
        throw new Error(`e-Stat API returned an error: ${resultInfo.ERROR_MSG}`);
    }

    const values = eStatData.GET_STATS_DATA.STATISTICAL_DATA?.DATA_INF?.VALUE;
    if (!values || !Array.isArray(values) || values.length === 0) {
        console.warn(`[Warning] Data was empty for "${request.categoryInfo.name}".`);
        return [];
    }
    console.log(`[Info] e-Statから ${values.length} 件の生データを取得しました。`);
    console.log(`[Debug] 生データの先頭5件:`, JSON.stringify(values.slice(0, 5), null, 2));


    // 【ステップ4】 データの仕分け（必要な場合のみ）
    if (postFetchFilter) {
        console.log(`[Debug] 取得後フィルター処理を開始します。フィルター条件: ${postFetchFilter.key} = ${postFetchFilter.value}`);
        
        const filteredValues = values.filter((v: EStatDataValue) => v[postFetchFilter!.key] === postFetchFilter!.value);
        
        console.log(`[Debug] 仕分け前: ${values.length}件 -> 仕分け後: ${filteredValues.length}件`);
        
        if (filteredValues.length === 0) {
            // もし仕分け後のデータが0件なら、何が問題だったのか調査するための情報を出力します。
            const uniqueCodes = [...new Set(values.map(v => v[postFetchFilter!.key]))];
            console.error(`[CRITICAL ERROR] 仕分け後のデータが0件になりました。`);
            console.error(`[CRITICAL ERROR] 期待したコード '${postFetchFilter.value}' が見つかりませんでした。`);
            console.error(`[CRITICAL ERROR] 実際にデータに含まれていたコード一覧:`, uniqueCodes);
        } else {
            console.log(`[Debug] 仕分け後のデータの先頭5件:`, JSON.stringify(filteredValues.slice(0, 5), null, 2));
        }
        return filteredValues; // 仕分け後のデータを返します
    }
  
  // 仕分けが不要なデータは、そのまま返します
  return values;
}


// --- ここから下は、これまで通り、データの整形やAIへの指示を行う部分です ---

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
    const analysisResult = await getAnalysisFromAI(question, categories, datasets, geminiApiKey);
    res.status(200).json(analysisResult);
  } catch (error: any) {
    console.error('An error occurred in handler:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}

/**
 * 取得したデータを年ごとに集計するヘルパー関数
 */
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

/**
 * 整形済みデータから、AIへの指示とグラフ用データを生成する関数
 */
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

  // --- 【デバッグステップ2】仕分けと集計が完了した後の、各データの年度別データをターミナルに表示します。 ---
  console.log("\n--- [データ仕分け・集計結果の確認] ---");
  processedDatasets.forEach(dataset => {
    console.log(`[データ名]: ${dataset.name}`);
    console.table(dataset.data);
  });
  console.log("--- [確認ここまで] ---\n");


  // --- ここから下は、グラフ用データとAIへの指示を生成する部分です ---
  const validDatasets = processedDatasets.filter(d => d.data.length > 0);
  const allYears = [...new Set(validDatasets.flatMap(d => d.data.map(p => p.year)))].sort();

  const chartData = {
    labels: allYears,
    datasets: validDatasets.map((d, i) => {
      const dataMap = new Map(d.data.map(p => [p.year, p.value]));
      const useSecondAxis = validDatasets.length === 2 && i === 1 && d.unit !== validDatasets[0].unit;
      return {
        label: `${d.name} (${d.unit})`,
        data: allYears.map(year => dataMap.get(year) ?? null),
        yAxisID: useSecondAxis ? 'y1' : 'y',
      };
    }),
  };

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
