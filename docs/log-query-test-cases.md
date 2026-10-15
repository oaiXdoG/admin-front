# 日志条件查询测试数据

生成时间 2026-10-14 22:37，项目「测试项目」，日志库 `logs_test`（ClickHouse 时区 UTC）。测试日志的 `log_id` 以 `QA` 开头，时间都在 2026-10-14 04:37 ～ 2026-10-14 22:37 之间，查询时时间范围要包含这一段（例如「最近 2 天」）。

「期望」按理想语义计算：字段不存在或为 null 的行不命中任何条件；「实际」是调用 `/api/log/query` 的结果。

## 数据

| 事件 | 条数 | 字段 |
| --- | --- | --- |
| order_pay | 40 | orderId 文本；amount 数字（6/30/68/128/328/648.5/0.99，第 0、13、26 条缺失，第 17、34 条为 null）；currency 文本；channel 文本（wechat/alipay/apple/WeChat）；success 是/否（第 7 条缺失）；paidAt 文本时间（东八区，无时区）；createdMs 毫秒时间戳；player.level/vip 数字、player.name 中文；items 对象数组；coupon（NEW10 / null / 缺失）；uid 数字（第 38、39 条为超过双精度的大整数）；score 数字和数字文本混合 |
| chat_message | 15 | text 文本（含 %、_、引号、注入、表情、空串、换行、反斜杠）；channel；length |
| player_login | 30 | ip；region 中文；isNewUser 是/否；loginAt ISO 时间（UTC，带 Z）；device.os / device.model |
| item_change | 25 | itemId；itemName 中文；delta 正负数；reason；tags 文本数组 |

## 场景

在「日志查询」里事件只选表中的一个，点「添加条件」按下表填写；类型是该字段在「事件管理」里的类型（自动发现的类型不对时在那里改）。

在页面上复现时注意：自动发现按样例推断类型，以下几个字段要先在「事件管理」里改类型（或直接按下表的类型配置）：`createdMs` 是毫秒数，会被推断成数字，改为「时间」；`score` 数字和文本混合，会被推断成文本，改为「数字」；`uid` 在 #10 用「数字」、#11 用「文本」。#32 的 `time` 是日志自带时间，页面上用「时间范围」筛选，不在字段条件里。

| # | 分组 | 场景 | 事件 | 条件（字段［类型］方式 值） | 期望 | 实际 | 结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 数字 | 金额 = 68 | order_pay | amount［数字］等于 `68` | 6 | 6 | ✅ |
| 2 | 数字 | 金额 ≥ 128 | order_pay | amount［数字］大于等于 `128` | 14 | 14 | ✅ |
| 3 | 数字 | 金额 < 10（含小数 0.99；缺少金额的行不应命中） | order_pay | amount［数字］小于 `10` | 8 | 8 | ✅ |
| 4 | 数字 | 金额 ≠ 6（缺少金额的行不应命中） | order_pay | amount［数字］不等于 `6` | 29 | 29 | ✅ |
| 5 | 数字 | 金额 介于 30～328 | order_pay | amount［数字］介于 `30` ～ `328` | 22 | 22 | ✅ |
| 6 | 数字 | 金额 = 648.5（小数） | order_pay | amount［数字］等于 `648.5` | 4 | 4 | ✅ |
| 7 | 数字 | 道具变化 < 0（负数） | item_change | delta［数字］小于 `0` | 5 | 5 | ✅ |
| 8 | 数字 | 嵌套：玩家等级 介于 10～30 | order_pay | player.level［数字］介于 `10` ～ `30` | 15 | 15 | ✅ |
| 9 | 数字 | 混合类型：score ≥ 200（部分行是文本 "210"，数字文本也按数字比较） | order_pay | score［数字］大于等于 `200` | 20 | 20 | ✅ |
| 10 | 数字 | 大整数：uid = 9007199254740993（已知限制：超过 2^53 按数字比较会丢精度，ID 类字段请设为文本） | order_pay | uid［数字］等于 `9007199254740993` | 1 | 2（多 QAORDE038） | ⚠️ |
| 11 | 文本 | 大整数按文本：uid 等于 9007199254740993 | order_pay | uid［文本］等于 `9007199254740993` | 1 | 1 | ✅ |
| 12 | 文本 | 渠道 等于 wechat（区分大小写） | order_pay | channel［文本］等于 `wechat` | 10 | 10 | ✅ |
| 13 | 文本 | 渠道 包含 WECHAT（不区分大小写） | order_pay | channel［文本］包含 `WECHAT` | 20 | 20 | ✅ |
| 14 | 文本 | 渠道 不等于 apple | order_pay | channel［文本］不等于 `apple` | 30 | 30 | ✅ |
| 15 | 文本 | 中文：道具名 等于 钻石 | item_change | itemName［文本］等于 `钻石` | 5 | 5 | ✅ |
| 16 | 文本 | 嵌套中文：玩家名 包含 张 | order_pay | player.name［文本］包含 `张` | 7 | 7 | ✅ |
| 17 | 文本 | 特殊字符：包含 %（不是通配符） | chat_message | text［文本］包含 `%` | 1 | 1 | ✅ |
| 18 | 文本 | 特殊字符：包含 _（不是通配符） | chat_message | text［文本］包含 `_` | 1 | 1 | ✅ |
| 19 | 文本 | 注入：等于 x' OR 1=1 --（只命中这一条） | chat_message | text［文本］等于 `x' OR 1=1 --` | 1 | 1 | ✅ |
| 20 | 文本 | 双引号：包含 "双引号" | chat_message | text［文本］包含 `"双引号"` | 1 | 1 | ✅ |
| 21 | 文本 | 表情：包含 😀 | chat_message | text［文本］包含 `😀` | 1 | 1 | ✅ |
| 22 | 文本 | 空字符串：等于 "" | chat_message | text［文本］等于 （空） | 1 | 1 | ✅ |
| 23 | 文本 | null 与缺失：优惠券 不等于 NEW10（null/缺失不应命中） | order_pay | coupon［文本］不等于 `NEW10` | 0 | 0 | ✅ |
| 24 | 文本 | 数组：标签 包含 limited | item_change | tags［文本］包含 `limited` | 13 | 13 | ✅ |
| 25 | 文本 | 对象数组：道具 包含 sword | order_pay | items［文本］包含 `sword` | 10 | 10 | ✅ |
| 26 | 是/否 | 支付成功 = 是 | order_pay | success［是/否］等于 是 | 31 | 31 | ✅ |
| 27 | 是/否 | 支付成功 = 否（缺失的行不应命中） | order_pay | success［是/否］等于 否 | 8 | 8 | ✅ |
| 28 | 是/否 | 新用户 ≠ 否 | player_login | isNewUser［是/否］不等于 否 | 5 | 5 | ✅ |
| 29 | 时间 | 毫秒时间戳 createdMs 在最近 6 小时内 | order_pay | createdMs［时间］大于等于 2026-10-14 16:37:53 | 14 | 14 | ✅ |
| 30 | 时间 | 文本时间 paidAt（东八区，无时区）介于 3～9 小时前 | order_pay | paidAt［时间］介于 2026-10-14 13:37:53 ～ 2026-10-14 19:37:53 | 15 | 15 | ✅ |
| 31 | 时间 | ISO 时间 loginAt（UTC，带 Z）在最近 5 小时内 | player_login | loginAt［时间］大于等于 2026-10-14 17:37:53 | 9 | 9 | ✅ |
| 32 | 时间 | 日志自带时间 time 早于 12 小时前 | order_pay | time［时间］小于 2026-10-14 10:37:53 | 11 | 11 | ✅ |
| 33 | 组合 | 全部满足：金额 ≥ 30 且 渠道 = alipay | order_pay | amount［数字］大于等于 `30` 且 channel［文本］等于 `alipay` | 7 | 7 | ✅ |
| 34 | 组合 | 任一满足：金额 ≥ 328 或 VIP ≥ 5 | order_pay | amount［数字］大于等于 `328` 或 player.vip［数字］大于等于 `5` | 13 | 13 | ✅ |
| 35 | 组合 | 任一满足不越出事件：系统 = iOS 或 地区 = 海外 | player_login | device.os［文本］等于 `iOS` 或 region［文本］等于 `海外` | 20 | 20 | ✅ |
| 36 | 组合 | 三个条件：成功 且 CNY 且 等级 > 20 | order_pay | success［是/否］等于 是 且 currency［文本］等于 `CNY` 且 player.level［数字］大于 `20` | 17 | 17 | ✅ |
