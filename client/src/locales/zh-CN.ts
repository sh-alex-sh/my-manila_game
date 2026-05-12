export const zhCN = {
  app_title: '马尼拉',
  new_game: '新游戏',
  join_game: '加入游戏',
  create_room: '创建房间',

  // Game phases
  phase_harbor_master_auction: '港务长拍卖',
  phase_harbor_master_setup: '港务长设置',
  phase_placement: '放置帮手',
  phase_movement: '移动船只',
  phase_pirate_check: '海盗行动',
  phase_pilot_adjustment: '领航员调整',
  phase_profit_distribution: '利润分配',
  phase_price_increase: '价格上涨',
  phase_game_over: '游戏结束',

  // Location names
  ship_hold: '船舱',
  port: '港口',
  shipyard: '船坞',
  pirate_ship: '海盗船',
  pirate_captain: '海盗船长',
  pirate_mate: '海盗副手',
  pilot_island: '领航员岛',
  pilot_small: '小型领航（2比索）',
  pilot_large: '大型领航（5比索）',
  insurance_office: '保险公司',

  // Goods
  goods_jade: '翡翠',
  goods_silk: '丝绸',
  goods_spices: '香料',
  goods_porcelain: '瓷器',

  // Actions
  bid: '出价',
  pass: '放弃',
  place_meeple: '放置帮手',
  roll_dice: '掷骰子',
  confirm: '确认',
  cancel: '取消',
  buy_share: '购买股份',
  select_goods: '选择货物',
  set_positions: '设置起始位置',
  send_to_port: '驶向港口',
  send_to_shipyard: '驶向船坞',
  pawn_share: '典当股份',
  redeem_share: '赎回股份',
  take_insurance: '购买保险',

  // Player
  player_turn: '轮到 {name}',
  your_turn: '轮到你了',
  harbor_master: '港务长',
  cash: '现金',
  shares: '股份',
  meeples: '帮手',
  score: '分数',
  player_count: '玩家人数',
  start_game: '开始游戏',
  back: '返回',

  // Messages
  you_won: '你赢了！',
  player_won: '{name} 获胜！',
  game_ended: '游戏结束 - {goods} 价格达到30比索',
  no_valid_actions: '没有可执行的操作',
  waiting: '等待其他玩家...',
  ship_reached: '{goods}号船抵达马尼拉！',
  ship_wrecked: '{goods}号船失事了！',
  pirates_loot: '海盗掠夺了{goods}号船！',

  // Errors
  error_not_your_turn: '不是你的回合',
  error_insufficient_cash: '现金不足',
  error_invalid_placement: '无效的放置位置',
  error_connection_lost: '连接已断开',
} as const;

export type ZhCN = typeof zhCN;
