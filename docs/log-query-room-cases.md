# 直播间场景测试数据

生成时间 2026-10-14 23:38，项目「测试项目」，日志库 `logs_test`，`log_id` 以 `QAROOM` 开头，时间在 2026-10-14 12:38 ～ 2026-10-14 23:38 之间，服务器 `live-1`。

约定：主播和玩家都记在「用户」（actor）里，事件名前缀区分 `anchor_*` / `player_*`；直播间里的所有事件都带 `data.anchorId`（主播自己的事件填自己）。

| 事件 | 条数 | 用户 | data |
| --- | --- | --- | --- |
| anchor_live_start | 3 | 主播 | anchorId、title |
| anchor_gift_confirm | 3 | 主播 | anchorId、total |
| anchor_live_end | 3 | 主播 | anchorId |
| player_join_room | 12 | 玩家 | anchorId、from（square / share / reconnect） |
| player_recharge | 17 | 玩家 | anchorId、orderId、amount、channel |
| player_send_gift | 9 | 玩家 | anchorId、giftId、count |

主播 A1001 的房间有 P01～P04，A1002 有 P03、P05、P06（P03 两个房间都去过），A1003 有 P07、P08；P02、P05、P08 有一次断线重连。

## 场景

在「日志查询」里按下表选择事件、填「用户」，主播条件用「添加条件」→ 字段 `anchorId` 等于主播 ID。

| # | 场景 | 事件 | 用户 | 字段条件 | 期望 | 实际 | 结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 直播间 A1001 的所有充值 | player_recharge | — | anchorId 等于 `A1001` | 7 | 7 | ✅ |
| 2 | 直播间 A1001 里玩家 P03 的充值 | player_recharge | P03 | anchorId 等于 `A1001` | 3 | 3 | ✅ |
| 3 | 玩家 P03 在所有直播间的充值（不加主播条件） | player_recharge | P03 | — | 5 | 5 | ✅ |
| 4 | 玩家 P03 在直播间 A1002 的充值 | player_recharge | P03 | anchorId 等于 `A1002` | 2 | 2 | ✅ |
| 5 | 直播间 A1001 的全部事件（多选 6 个事件，含主播自己的开播、关播） | anchor_live_start、player_join_room、player_recharge、player_send_gift、anchor_gift_confirm、anchor_live_end | — | anchorId 等于 `A1001` | 19 | 19 | ✅ |
| 6 | 直播间 A1002 里玩家的进房和送礼（多选 2 个事件） | player_join_room、player_send_gift | — | anchorId 等于 `A1002` | 7 | 7 | ✅ |
| 7 | 玩家 P02 在 A1001 的进房记录（含断线重连） | player_join_room | P02 | anchorId 等于 `A1001` | 2 | 2 | ✅ |
| 8 | 主播 A1003 自己的操作（用户填主播 ID，事件选 anchor_*） | anchor_live_start、anchor_gift_confirm、anchor_live_end | A1003 | — | 3 | 3 | ✅ |
