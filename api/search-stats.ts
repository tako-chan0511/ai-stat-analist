import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { searchWord } = req.query;
  const eStatAppId = process.env.ESTAT_APP_ID;

  if (!searchWord || typeof searchWord !== 'string' || !eStatAppId) {
    return res.status(400).json({ error: 'リクエスト情報が不完全です。' });
  }

  try {
    const params = new URLSearchParams({
      appId: eStatAppId,
      lang: 'J',
      searchWord: searchWord,
      limit: '50', 
    });

    const eStatUrl = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsList?${params.toString()}`;
    console.log(`[Info] Searching e-Stat: ${eStatUrl}`);
    
    const response = await fetch(eStatUrl);
    if (!response.ok) {
      throw new Error(`e-Stat API request failed: ${response.status}`);
    }

    const data = await response.json();
    const result = data.GET_STATS_LIST.RESULT;

    if (result.STATUS !== 0) {
      if (result.ERROR_MSG.includes('該当するデータは存在しません')) {
        return res.status(200).json([]);
      }
      throw new Error(`e-Stat API returned an error: ${result.ERROR_MSG}`);
    }
    
    let tableList = data.GET_STATS_LIST.DATALIST_INF.TABLE_INF;
    
    if (!tableList) {
        return res.status(200).json([]);
    }
    if (!Array.isArray(tableList)) {
      tableList = [tableList];
    }
    
    const uniqueTableList = Array.from(new Map(tableList.map((item: any) => [item['@id'], item])).values());

    // ★★★ ここからが修正点 ★★★
    uniqueTableList.sort((a: any, b: any) => {
      // SURVEY_DATEをString()で文字列に変換してから、年を抽出する
      const yearA = parseInt(String(a.SURVEY_DATE || '1900').substring(0, 4));
      const yearB = parseInt(String(b.SURVEY_DATE || '1900').substring(0, 4));
      return yearB - yearA; // 降順ソート
    });
    // ★★★ ここまでが修正点 ★★★

    res.status(200).json(uniqueTableList);

  } catch (error: any) {
    console.error('An error occurred in search-stats handler:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}