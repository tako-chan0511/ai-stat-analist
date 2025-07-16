import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { searchWord } = req.query;
  const eStatAppId = process.env.ESTAT_APP_ID;

  if (!searchWord || typeof searchWord !== 'string') {
    return res.status(400).json({ error: '検索キーワードが必要です。' });
  }
  if (!eStatAppId) {
    return res.status(500).json({ error: 'APIキーがサーバー側で設定されていません。' });
  }

  try {
    const params = new URLSearchParams({
      appId: eStatAppId,
      lang: 'J',
      searchWord: searchWord,
      limit: '20', // 少し多めに取得
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
    if (!Array.isArray(tableList)) {
      tableList = [tableList];
    }
    
    // ★★★ ここで日付の新しい順にソート ★★★
    tableList.sort((a: any, b: any) => {
      const dateA = new Date(a['@releaseDate']).getTime();
      const dateB = new Date(b['@releaseDate']).getTime();
      return dateB - dateA; // 降順ソート
    });

    res.status(200).json(tableList);

  } catch (error: any) {
    console.error('An error occurred in search-stats handler:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}