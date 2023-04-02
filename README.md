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

## payload

### 客户端上线

online

```json
{
    "type": "online",
    "data": {
        "nodeId": 2811520355,   // 节点 id
        "groupList": [
            111,
            222
        ]
    }
}
```

### 群变更

groupChange

```json
{
    "type": "groupChange",
    "data": {
        "type": "join | quit",
        "group": 111
    }
}
```

### 订阅

subscribe

```json
{
    "type": "subscribe",
    "data": {
        "uid": 12583120,        // uid || roomid 二选一
        "roomid": 1064790
    }
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
    }
}
```

### 推送

online

```json
{
    "type": "push",
    "data": {
        "status": "online",
        "uid": 12583120,
        "roomid": 1064790,
        "roomUrl": "https://live.bilibili.com/1064790",
        "username": "霜叶的玖叁",
        "title": "测试",
        "avatar": "https://i1.hdslb.com/bfs/face/ea84644c16e0ae94020121bbaa0d6a69ab39daf3.jpg",
        "coverUrl": "https://i0.hdslb.com/bfs/live/new_room_cover/462f98c2bcb6a0426cb8eb3ecb9645b73e33466a.jpg",
        "startTime": 1680417040000,
        "startTimeStr": "14:30:40",
        "groupList": [
            {
                "id": 111,
                "atAll": false
            }
        ]
    }
}
```

offline

```json
{
    "type": "push",
    "data": {
        "status": "offline",
        "uid": 12583120,
        "roomid": 1064790,
        "roomUrl": "https://live.bilibili.com/1064790",
        "username": "霜叶的玖叁",
        "title": "测试",
        "avatar": "https://i1.hdslb.com/bfs/face/ea84644c16e0ae94020121bbaa0d6a69ab39daf3.jpg",
        "coverUrl": "https://i0.hdslb.com/bfs/live/new_room_cover/462f98c2bcb6a0426cb8eb3ecb9645b73e33466a.jpg",
        "startTime": 1680417040000,
        "startTimeStr": "14:30:40",
        "durationTime": 98993,
        "durationTimeStr": "2 分钟",
        "groupList": [
            {
                "id": 111,
                "atAll": false
            }
        ]
    }
}
```