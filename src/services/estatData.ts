/**
 * アプリケーションで利用する統計カテゴリの型定義
 */
export interface EStatCategory {
  id: string;
  name: string;
  defaultQuestion: string;
  filters: { [key: string]: string };
  unit: string;
  type?: 'category';
}

export interface EStatButtonSubGroup {
  type: 'subgroup';
  items: EStatCategory[];
}

export interface EStatCategoryGroup {
  groupName: string;
  items: (EStatCategory | EStatButtonSubGroup)[];
}

/**
 * 分析対象とする「福岡県」の統計カテゴリリスト（グループ化）
 */
export const estatCategoryGroups: EStatCategoryGroup[] = [
  {
    groupName: '人口・世帯',
    items: [
      // ★★★★★ ここからが修正点 ★★★★★
      // 全ての人口関連データを、単一の正しいデータソース(ID: 0000010101)に統一
      {
        type: 'category',
        id: '0000010101', // 国勢調査
        name: '総人口',
        defaultQuestion: '福岡県の総人口は、どのように推移していますか？',
        filters: { '@cat01': 'A1101', '@area': '40000' }, // 総人口のコード
        unit: '人',
      },
      {
        type: 'subgroup',
        items: [
          {
            id: '0000010101', // 国勢調査
            name: '年少人口 (0-14歳)',
            defaultQuestion: '福岡県の年少人口は、どのように推移していますか？',
            filters: { '@cat01': 'A1102', '@area': '40000' }, // 年少人口のコード
            unit: '人',
          },
          {
            id: '0000010101', // 国勢調査
            name: '生産年齢人口 (15-64歳)',
            defaultQuestion: '福岡県の生産年齢人口は、どのように推移していますか？',
            filters: { '@cat01': 'A1103', '@area': '40000' }, // 生産年齢人口のコード
            unit: '人',
          },
          {
            id: '0000010101', // 国勢調査
            name: '老年人口 (65歳以上)',
            defaultQuestion: '福岡県の老年人口は、どのように推移していますか？',
            filters: { '@cat01': 'A1104', '@area': '40000' }, // 老年人口のコード
            unit: '人',
          },
        ]
      }
      // ★★★★★ ここまでが修正点 ★★★★★
    ],
  },
  {
    groupName: '経済・雇用',
    items: [
      { id: '0003423970', name: '法人企業売上高', defaultQuestion: '...', filters: { '@cat01': '0', '@cat02': 'C3101', '@area': '40000' }, unit: '百万円' },
      { id: '0003411607', name: '製造品出荷額', defaultQuestion: '...', filters: { '@area': '40000' }, unit: '百万円' },
      { id: '0000020301', name: '有効求人倍率', defaultQuestion: '...', filters: { '@cat01': 'C2101', '@area': '40000' }, unit: '倍' },
    ],
  },
  {
    groupName: '観光・商業',
    items: [
      { id: '0003313483', name: '外国人延べ宿泊者数', defaultQuestion: '...', filters: { '@area': '40000', '@cat01': '1' }, unit: '人泊' },
      { id: '0003420401', name: '小売業年間商品販売額', defaultQuestion: '...', filters: { '@cat01': '001', '@area': '40000' }, unit: '百万円' },
    ],
  },
];
