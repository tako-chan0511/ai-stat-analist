/**
 * アプリケーションで利用する統計カテゴリの型定義
 */
export interface EStatCategory {
  id: string;
  name: string;
  defaultQuestion: string;
  filters: { [key: string]: string };
  unit: string;
}

/**
 * カテゴリをグループ化するための型定義
 */
export interface EStatCategoryGroup {
  groupName: string;
  items: EStatCategory[];
}

/**
 * 分析対象とする「福岡県」の統計カテゴリリスト（グループ化）
 */
export const estatCategoryGroups: EStatCategoryGroup[] = [
  {
    groupName: '人口・世帯',
    items: [
      {
        id: '0000010101',
        name: '総人口', // '人口推移'から変更
        defaultQuestion: '福岡県の総人口は、どのように推移していますか？',
        filters: { '@cat01': 'A1101', '@area': '40000' },
        unit: '人',
      },
      // ★★★★★ ここがご提案の改修点 ★★★★★
      {
        id: '0000010103',
        name: '年少人口 (0-14歳)',
        defaultQuestion: '福岡県の年少人口は、どのように推移していますか？',
        filters: { '@cat01': 'A1102', '@area': '40000' },
        unit: '人',
      },
      {
        id: '0000010103',
        name: '生産年齢人口 (15-64歳)',
        defaultQuestion: '福岡県の生産年齢人口は、どのように推移していますか？',
        filters: { '@cat01': 'A1103', '@area': '40000' },
        unit: '人',
      },
      {
        id: '0000010103',
        name: '老年人口 (65歳以上)',
        defaultQuestion: '福岡県の老年人口は、どのように推移していますか？',
        filters: { '@cat01': 'A1104', '@area': '40000' },
        unit: '人',
      },
    ],
  },
  {
    groupName: '経済・雇用',
    items: [
      {
        id: '0003423970',
        name: '法人企業売上高',
        defaultQuestion: '福岡県の法人企業の売上高はどのように推移していますか？',
        filters: { '@cat01': '0', '@cat02': 'C3101', '@area': '40000' },
        unit: '百万円',
      },
      {
        id: '0003411607',
        name: '製造品出荷額',
        defaultQuestion: '福岡県の製造品出荷額等は、どのように推移していますか？',
        filters: { '@area': '40000' },
        unit: '百万円',
      },
      {
        id: '0000020301',
        name: '有効求人倍率',
        defaultQuestion: '福岡県の有効求人倍率（季節調整値）は、どのように推移していますか？',
        filters: { '@cat01': 'C2101', '@area': '40000' },
        unit: '倍',
      },
    ],
  },
  {
    groupName: '観光・商業',
    items: [
      {
        id: '0003313483',
        name: '外国人延べ宿泊者数',
        defaultQuestion: '福岡県の外国人宿泊者数は、どのように推移していますか？',
        filters: { '@area': '40000', '@cat01': '1' },
        unit: '人泊',
      },
      {
        id: '0003420401',
        name: '小売業年間商品販売額',
        defaultQuestion: '福岡県の小売業の販売額は、どのように推移していますか？',
        filters: { '@cat01': '001', '@area': '40000' },
        unit: '百万円',
      },
    ],
  },
];
