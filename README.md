# live-status-push-service

## 流程

1. 服务启动，清空 Redis，`获取当前直播中的订阅列表`，存入 Redis，作为初始状态

2. 每隔 10s 进行一次`获取当前直播中的订阅列表`，比对 Redis 中的状态判断状态变更

### 状态变更判断方案

#### 开播

- Redis 中并无原有状态 且 包含在当前直播中的订阅列表

- Redis 中原有状态为 离线 且 包含在当前直播中的订阅列表

#### 下播

- Redis 中原有状态为 在线 且 不包含在当前直播中的订阅列表 且 消抖参数大于 5

下播事件触发后，消抖参数归 0

## topic 说明

### topic

| topic | 作用 |
| :---  | :-- |
| livepush/subscirbe | 关注新的 up |
| livepush/liveroom | 上下播事件 |
| livepush/status | 各端上下线事件 |

### payload

#### livepush/subscirbe

operate

```json
{
    "type": "operate",
    "data": {
        "uid": 12583120,    // uid || roomid 二选一
        "roomid": 1064790
    },
    "ots": 1600000000       // 事件识别码
}
```

result

```json
{
    "type": "result",
    "code": 0,
    "msg": "success",       // 错误信息
    "data": {               // 用户信息
        "uid": 12583120,
        "username": "霜叶的玖叁"
    },
    "ots": 1600000000       // 事件识别码
}
```

#### livepush/liveroom

online

```json
{
    "type": "online",
    "data": {
        "uid": 12583120,
        "roomid": 1064790,
        "username": "霜叶的玖叁",
        "title": "",
        "roomUrl": "",
        "avatarUrl": "",
        "roomCardUrl": "",
        "onlineTime": 1600000000,
        "onlineTimeStr": ""
    }
}
```

offline

```json
{
    "type": "offline",
    "data": {
        "uid": 12583120,
        "roomid": 1064790,
        "username": "霜叶的玖叁",
        "durationTime": 1600000000,
        "durationTimeStr": ""
    }
}
```

#### livepush/status

> todo