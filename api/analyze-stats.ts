import type { VercelRequest, VercelResponse } from '@vercel/node';

// 型定義
interface EStatDataValue {
  [key: string]: string; // 様々なキー(@cat01, @cat02...)に対応できるよう、柔軟な型に
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const eStatAppId = process.env.ESTAT_APP_ID;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  // ★★★ 変更: フロントエンドからfiltersも受け取る ★★★
  const { question, statsDataId, categoryInfo, filters } = req.body;

  if (!question || !statsDataId || !categoryInfo || !filters) {
    return res.status(400).json({ error: '必須パラメータが不足しています。' });
  }
  if (!eStatAppId || !geminiApiKey) {
    return res.status(500).json({ error: 'APIキーがサーバー側で設定されていません。' });
  }

  try {
    const eStatUrl = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?appId=${eStatAppId}&statsDataId=${statsDataId}`;

    console.log('Fetching data from e-Stat...');
    const eStatResponse = await fetch(eStatUrl);
    if (!eStatResponse.ok) {
        throw new Error(`e-Stat APIへのリクエストに失敗しました (Status: ${eStatResponse.status})`);
    }
    const eStatData = await eStatResponse.json();

    const resultInfo = eStatData.GET_STATS_DATA.RESULT;
    if (resultInfo.STATUS !== 0) {
      throw new Error(`e-Stat APIからエラーが返されました: ${resultInfo.ERROR_MSG}`);
    }

    const values = eStatData.GET_STATS_DATA.STATISTICAL_DATA?.DATA_INF?.VALUE;
    if (!values || !Array.isArray(values) || values.length === 0) {
      throw new Error('e-Statから有効な統計データを取得できませんでした。');
    }
    console.log(`Successfully fetched ${values.length} records from e-Stat.`);

    const analysisResult = await getAnalysisFromAI(question, values, categoryInfo, filters, geminiApiKey);

    res.status(200).json(analysisResult);

  } catch (error: any) {
    console.error('An error occurred:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}

async function getAnalysisFromAI(question: string, values: EStatDataValue[], categoryInfo: any, filters: any, apiKey: string) {
  // ★★★ 改善: 汎用的なデータ絞り込みロジック ★★★
  const simplifiedData = values
    .filter(v => {
      // 1. 渡されたフィルター条件をすべて満たすかチェック
      const allFiltersMatch = Object.keys(filters).every(key => v[key] === filters[key]);
      
      // 2. 地域コードが全国(00000)であるか、または地域コード自体が存在しないかをチェック
      const isNationwide = !v['@area'] || v['@area'] === '00000';

      return allFiltersMatch && isNationwide;
    }) 
    .filter(v => parseInt(v['@time'].substring(0, 4)) % 5 === 0)
    .map(v => ({
      year: v['@time'].substring(0, 4),
      value: parseFloat(v.$),
    }));

  console.log(`Simplified data to ${simplifiedData.length} records for AI analysis.`);

  if (simplifiedData.length === 0) {
    throw new Error("分析対象となるデータが見つかりませんでした。e-Statのデータ構造が変更されたか、この統計には該当データがありません。");
  }

  const prompt = `
    あなたは優秀なデータアナリストです。以下の統計データとユーザーからの質問を基に、分析結果を返してください。

    **ユーザーからの質問:** 「${question}」
    **統計データ (${categoryInfo.name}):**
    \`\`\`json
    ${JSON.stringify(simplifiedData)}
    \`\`\`
    **指示:**
    1.  **explanation**: 統計データから読み取れる傾向や特徴を、初心者にも分かりやすく、200字程度で解説してください。
    2.  **chartType**: このデータを可視化するのに最も適したグラフの種類を 'line' または 'bar' で答えてください。
    3.  **chartData**: グラフ描画用に、データを以下の形式で整形してください。

    **出力は、必ず以下のJSON形式に従ってください:**
    \`\`\`json
    {
      "explanation": "ここに解説文",
      "chartType": "line",
      "chartData": {
        "labels": [],
        "datasets": [
          {
            "label": "${categoryInfo.name} (${categoryInfo.unit})",
            "data": [],
            "backgroundColor": "rgba(26, 115, 232, 0.2)",
            "borderColor": "rgba(26, 115, 232, 1)",
            "borderWidth": 2,
            "tension": 0.1
          }
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
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } else {
    console.error('AI API Error:', data);
    let userFriendlyError = 'AI APIからの応答エラーです。';
    const errorMessage = data.error?.message || '';
    if (errorMessage.includes('overloaded')) {
      userFriendlyError = '現在、AIサーバーが大変混み合っています。しばらく時間をおいてから、もう一度お試しください。';
    } else if (errorMessage) {
      userFriendlyError = errorMessage;
    }
    throw new Error(userFriendlyError);
  }
}
