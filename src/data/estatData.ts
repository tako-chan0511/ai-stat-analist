export interface FilterCondition {
  statsCode: string
  tabCode: string
  // 必要に応じて他のパラメータも追加
}

export interface CategoryDefinition {
  key: string           // 一意の識別子
  label: string         // ボタンに表示する文言
  filter: FilterCondition
}

// ここに新カテゴリを追加するだけでOK
export const categories: CategoryDefinition[] = [
  {
    key: 'population',
    label: '人口推移',
    filter: { statsCode: '00100202', tabCode: '01' }
  },
  {
    key: 'household',
    label: '世帯数推移',
    filter: { statsCode: '00100203', tabCode: '01' }
  },
  {
    key: 'ageDistribution',
    label: '年齢別人口構成',
    filter: { statsCode: '00200521', tabCode: '01' }
  },
  // ── 以降、追加したい統計ごとにオブジェクトを追加 ──
];
