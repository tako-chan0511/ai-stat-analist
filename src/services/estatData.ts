export interface EStatCategory {
  id: string; 
  name: string;
  unit: string;
  statsDataId: string;
  code: string; // APIに送るカテゴリコード
  type?: 'category' | 'special';
}

export interface EStatButtonSubGroup {
  type: 'subgroup';
  items: EStatCategory[];
}

export interface EStatCategoryGroup {
  groupName: string;
  items: (EStatCategory | EStatButtonSubGroup)[];
}

const POP_STATS_DATA_ID = '0000010101'; // 社会・人口統計体系

export const estatCategoryGroups: EStatCategoryGroup[] = [
  {
    groupName: '人口・世帯',
    items: [
      {
        type: 'category',
        id: 'total-population',
        name: '総人口',
        unit: '人',
        statsDataId: POP_STATS_DATA_ID,
        code: 'A1101',
      },
      {
        type: 'special',
        id: 'all-age-groups',
        name: '年齢階級別 人口',
        unit: '人',
        statsDataId: POP_STATS_DATA_ID,
        code: '', // This is a special button, code is not sent directly
      },
      {
        type: 'subgroup',
        items: [
          {
            id: 'young-population',
            name: '年少人口 (0-14歳)',
            unit: '人',
            statsDataId: POP_STATS_DATA_ID,
            code: 'A1301',
          },
          {
            id: 'working-age-population',
            name: '生産年齢人口 (15-64歳)',
            unit: '人',
            statsDataId: POP_STATS_DATA_ID,
            code: 'A1302',
          },
          {
            id: 'elderly-population',
            name: '老年人口 (65歳以上)',
            unit: '人',
            statsDataId: POP_STATS_DATA_ID,
            code: 'A1303',
          },
        ]
      }
    ],
  },
];