/**
 * アプリケーションで利用する統計カテゴリの型定義
 */
export interface EStatCategory {
  id: string; // e-Statの統計表ID (statsDataId)
  name: string; // UIに表示するカテゴリ名
  description: string; // カテゴリの簡単な説明
  defaultQuestion: string; // AIへの質問の例文
  // ★★★ 変更: 汎用的なフィルター条件オブジェクト ★★★
  filters: { [key: string]: string }; 
  unit: string; // データの単位
}

/**
 * 分析対象とする統計カテゴリの厳選リスト
 * ★★★ 変更: 各カテゴリに専用のフィルター条件を追加 ★★★
 */
export const estatCategories: EStatCategory[] = [
  {
    id: '0000010101',
    name: '人口推移',
    description: '日本の総人口が過去からどう変化したか',
    defaultQuestion: '日本の総人口は、どのように推移していますか？その背景にある社会的な要因も踏まえて解説してください。',
    filters: { '@cat01': 'A1101' }, // 男女別総人口の「総数」
    unit: '人',
  },
  {
    id: '0000010104',
    name: '平均寿命',
    description: '男女別の平均寿命の推移',
    defaultQuestion: '日本の男女別の平均寿命は、どのように推移していますか？長寿化の要因は何ですか？',
    filters: { '@cat02': 'A210101' }, // 男女計
    unit: '歳',
  },
  {
    id: '0000020203',
    name: '完全失業率',
    description: '景気の動向を示す、完全失業率の推移',
    defaultQuestion: '日本の完全失業率（季節調整値）は、どのように推移していますか？近年の傾向について教えてください。',
    filters: { '@cat01': 'B1111' }, // 男女計（季節調整値）
    unit: '％',
  },
  {
    id: '0000020301',
    name: '有効求人倍率',
    description: '仕事の探しやすさを示す、有効求人倍率',
    defaultQuestion: '日本の有効求人倍率（季節調整値）は、どのように推移していますか？この数値から何が読み取れますか？',
    filters: { '@cat01': 'C2101' }, // パートタイムを含む（季節調整値）
    unit: '倍',
  },
  {
    id: '0000020201',
    name: '消費者物価指数',
    description: 'モノの値段の変動を示す、物価の指標',
    defaultQuestion: '日本の消費者物価指数（総合指数）は、どのように推移していますか？最近の物価の動向を解説してください。',
    filters: { '@cat01': '000' }, // 総合
    unit: ' ',
  },
  {
    id: '0003445203',
    name: '実質GDP',
    description: '国の経済規模がどう成長しているか',
    defaultQuestion: '日本の実質GDP（国内総生産）は、どのように推移していますか？経済成長の動向について解説してください。',
    filters: { '@cat01': '1' }, // 実質・支出側
    unit: '億円',
  },
];
