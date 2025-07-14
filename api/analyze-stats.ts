import type { VercelRequest, VercelResponse } from '@vercel/node';

// 型定義
interface EStatDataValue {
  '@cat01': string;
  '@time': string;
  '@area': string;
  '$': string;
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
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: '質問がありません。' });
  }
  if (!eStatAppId || !geminiApiKey) {
    return res.status(500).json({ error: 'APIキーがサーバー側で設定されていません。' });
  }

  try {
    const statsDataId = '0000010101'; 
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

    const analysisResult = await getAnalysisFromAI(question, values, geminiApiKey);

    res.status(200).json(analysisResult);

  } catch (error: any) {
    console.error('An error occurred:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}

async function getAnalysisFromAI(question: string, values: EStatDataValue[], apiKey: string) {
  // ★★★ 改善: 正しいカテゴリコード 'A1101' を使うように修正 ★★★
  const simplifiedData = values
    .filter(v => v['@cat01'] === 'A1101' && v['@area'] === '00000') 
    .filter(v => parseInt(v['@time'].substring(0, 4)) % 5 === 0)
    .map(v => ({ year: v['@time'].substring(0, 4), population: parseInt(v.$, 10) }));

  console.log(`Simplified data to ${simplifiedData.length} records for AI analysis.`);

  if (simplifiedData.length === 0) {
    throw new Error("分析対象となるデータが見つかりませんでした。e-Statのデータ構造が変更された可能性があります。");
  }

  const prompt = `
    あなたは優秀なデータアナリストです。以下の統計データとユーザーからの質問を基に、分析結果を返してください。
    **ユーザーからの質問:** 「${question}」
    **統計データ (日本の総人口推移):**
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
            "label": "総人口（人）",
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
