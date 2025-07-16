import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { statsDataId } = req.query;
  const eStatAppId = process.env.ESTAT_APP_ID;

  if (!statsDataId || typeof statsDataId !== 'string') {
    return res.status(400).json({ error: '統計表ID（statsDataId）が必要です。' });
  }
  if (!eStatAppId) {
    return res.status(500).json({ error: 'APIキーがサーバー側で設定されていません。' });
  }

  try {
    const params = new URLSearchParams({
      appId: eStatAppId,
      lang: 'J',
      statsDataId: statsDataId,
    });

    const eStatUrl = `https://api.e-stat.go.jp/rest/3.0/app/json/getMetaInfo?${params.toString()}`;
    console.log(`[Info] Getting meta info from e-Stat: ${eStatUrl}`);
    
    const response = await fetch(eStatUrl);
    if (!response.ok) {
      throw new Error(`e-Stat API request failed: ${response.status}`);
    }

    const data = await response.json();
    const result = data.GET_META_INFO.RESULT;

    if (result.STATUS !== 0) {
      throw new Error(`e-Stat API returned an error: ${result.ERROR_MSG}`);
    }
    
    const classInfo = data.GET_META_INFO.METADATA_INF.CLASS_INF.CLASS_OBJ;
    res.status(200).json(classInfo);

  } catch (error: any) {
    console.error('An error occurred in get-meta-info handler:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}