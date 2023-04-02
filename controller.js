/**
 * 核心控制器
 */

const tag = "controller";
const intervalTag = "interval";

const { WebSocket } = require('ws');

const ws = require('./ws');
const redis = require('./redis');
const bilibili = require('./bilibili');
const { LiveRoomInfo } = require('./mongo').schemas;

const dayjs = require("dayjs")
const duration = require('dayjs/plugin/duration')
const relativeTime = require('dayjs/plugin/relativeTime')
require('dayjs/locale/zh-cn')
dayjs.locale('zh-cn') 
dayjs.extend(relativeTime)
dayjs.extend(duration)

const config = require('./config.json');

global.nodes = {};

module.exports = {

    /**
     * 初始化
     */
    async init() {

        console.log(tag, "初始化");
        await initRedis();

        ws.on('connection', (socket) => {

            console.log("ws", "节点连接");

            socket.on('message', (data) => {

                try {
                    data = JSON.parse(data.toString());
                } catch (error) {
                    return;
                }

                if (!data.type) return;

                switch (data.type) {

                    // 上线
                    case 'online':
                        onlineHandler(data.data, socket);
                        break;

                    // 订阅
                    case 'subscribe':
                        subUpHandler(data.data, socket);
                        break;

                    // 群变更
                    case 'groupChange':
                        groupChangeHandler(data.data, socket);
                        break;

                    default:
                        return;
                }

            })

            socket.on('close', () => {
                console.log(socket.nodeId, "节点已注销");
                delete global.nodes[socket.nodeId];
            })

        })


        console.log(intervalTag, `初始化: ${config.interval} ms`);
        setInterval(updateStatusInterval, config.interval);

    }

}

async function initRedis() {

    const keys = await redis.keys('livepush:*');
    if (keys.length) {
        const count = await redis.del(keys);
        console.log(tag, "redis 已清空", count)
    } else {
        console.log(tag, "redis 为空");
    }

    let r = await bilibili.getOnlineSubList();

    r.forEach(async e => {
        await redis.hSet('livepush:liveroom', e.roomid, JSON.stringify(e));
        await redis.set(`livepush:count:offline:${e.roomid}`, 0);
    });

}

/**
 * 
 * @param {Object} payload 
 * @param {WebSocket} socket 
 * @returns 
 */
async function onlineHandler(payload, socket) {

    const { nodeId, groupList } = payload;

    if (isNaN(nodeId) || !groupList || (socket.nodeId == nodeId)) return;

    if (global.nodes[nodeId]) {
        socket.close();
        return;
    }

    socket.nodeId = nodeId;

    global.nodes[nodeId] = {
        socket,
        groupList
    }

    console.log(nodeId, `节点已注册，群数: ${groupList.length}`)

}

/**
 * 
 * @param {Object} payload 
 * @param {WebSocket} socket 
 * @returns 
 */
async function subUpHandler(payload, socket) {

    // 判断入参格式
    if (
        (payload.uid && (typeof payload.uid != 'number'))
        ||
        (payload.roomid && (typeof payload.roomid != 'number'))
    ) {
        socket.send(JSON.stringify({
            type: 'result',
            code: -1,
            msg: "请输入正确的参数"
        }));
        return;
    }

    let uid = 0;

    if (payload.roomid) {

        try {
            uid = (await bilibili.getRoomInfoByRoomid(payload.roomid)).uid;
        } catch (error) {
            socket.send(JSON.stringify({
                type: 'result',
                code: -1,
                msg: error.message
            }));
            return;
        }

    } else {

        uid = payload.uid;

    }

    let r = await bilibili.subUp(uid);

    if (r.code != 0) {
        socket.send(JSON.stringify({
            type: 'result',
            code: r.code,
            msg: r.msg
        }));
        return;
    }

    r = await bilibili.getUsernameByUid(uid);

    socket.send(JSON.stringify({
        type: 'result',
        code: 0,
        msg: 'success',
        data: {
            uid,
            username: r
        }
    }));

}

/**
 * 
 * @param {Object} payload 
 * @param {WebSocket} socket 
 * @returns 
 */
async function groupChangeHandler(payload, socket) {

    const { type, group } = payload;

    if (typeof type != 'string' || isNaN(group)) return;

    switch (type) {

        case 'quit':
            const index = global.nodes[socket.nodeId].groupList.indexOf(group);
            if (index != -1) global.nodes[socket.nodeId].groupList.splice(index, 1); 
            break;

        case 'join':
            global.nodes[socket.nodeId].groupList.push(group);
            break;

        default:
            return;
    }


}

async function updateStatusInterval() {

    let newList = await bilibili.getOnlineSubList();
    if (!newList) return;
    let newListRoomids = newList.map(e => e.roomid);

    let oldList = await redis.hGetAll('livepush:liveroom');
    Object.keys(oldList).forEach(e => {
        oldList[e] = JSON.parse(oldList[e]);
    })
    let oldListRoomids = Object.keys(oldList).filter(e => oldList[e].status == 'online').map(e => parseInt(e));

    // 新上播
    let newOnline = newListRoomids.filter(roomid => !oldListRoomids.includes(roomid));
    newOnline.forEach(async roomid => {

        console.log(tag, "新上播", roomid);

        // 获取直播间信息
        let infoObj = newList.find(item => item.roomid == roomid);

        const data = await bilibili.getRoomInfoByRoomid(roomid);

        let startTime = new Date(data.live_time);

        Object.assign(infoObj, {
            coverUrl: data.user_cover,
            startTime: startTime.getTime(),
            startTimeStr: startTime.toLocaleTimeString(),
        });

        // 写入 redis
        await redis.hSet('livepush:liveroom', roomid, JSON.stringify(infoObj));
        await redis.set(`livepush:count:offline:${roomid}`, 0);

        // 获取绑定信息
        let liveroomObj = await LiveRoomInfo.findOne({ roomid });

        // 如果没有绑定信息
        if (!liveroomObj) return;

        // 写入 mongo
        // 主要是为了兼容原数据库
        await LiveRoomInfo.findOneAndUpdate({ roomid }, {
            $set: {
                status: 1,
                startTime,
                title: infoObj.title,
                cover: infoObj.cover
            }
        })

        // 获取绑定信息
        let bindGroupList = liveroomObj.group;

        // 获取在线节点信息
        let nodes = global.nodes;
        Object.keys(nodes).forEach(async nodeId => {
            const node = nodes[nodeId];
            const nodeGroupList = node.groupList;
            const nodeSocket = node.socket;

            const pushGroupList = bindGroupList.filter(e => nodeGroupList.includes(e.id));
            infoObj.groupList = pushGroupList;
            await nodeSocket.send(JSON.stringify({
                type: 'push',
                data: infoObj
            }))
        })

    })

    // 新下播
    // 出现一次
    let newOfflineTemp = oldListRoomids.filter(roomid => !newListRoomids.includes(roomid));
    newOfflineTemp.forEach(async roomid => {

        // 判断消抖参数
        const count = await redis.get(`livepush:count:offline:${roomid}`);

        if (count < 5) {
            await redis.incr(`livepush:count:offline:${roomid}`);
            return;
        }

        console.log(tag, "新下播", roomid);

        // 获取直播间信息
        let infoObj = oldList[roomid];

        infoObj.status = "offline";

        let durationTime = (new Date()).getTime() - (new Date(infoObj.startTime));

        Object.assign(infoObj, {
            durationTime: durationTime,
            durationTimeStr: dayjs.duration(durationTime).humanize(),
        });

        // 写入 redis
        await redis.hSet('livepush:liveroom', roomid, JSON.stringify(infoObj));
        await redis.set(`livepush:count:offline:${roomid}`, 0);

        // 获取绑定信息
        let liveroomObj = await LiveRoomInfo.findOne({ roomid });

        // 如果没有绑定信息
        if (!liveroomObj) return;

        // 写入 mongo
        // 主要是为了兼容原数据库
        await LiveRoomInfo.findOneAndUpdate({ roomid }, {
            $set: {
                status: 0
            }
        })

        // 获取绑定信息
        let bindGroupList = liveroomObj.group;

        // 获取在线节点信息
        let nodes = global.nodes;
        Object.keys(nodes).forEach(async nodeId => {
            const node = nodes[nodeId];
            const nodeGroupList = node.groupList;
            const nodeSocket = node.socket;

            const pushGroupList = bindGroupList.filter(e => nodeGroupList.includes(e.id));
            
            // 去重
            bindGroupList = bindGroupList.filter(e => pushGroupList.map(f => f.id).includes(e.id));

            infoObj.groupList = pushGroupList;
            await nodeSocket.send(JSON.stringify({
                type: 'push',
                data: infoObj
            }))
        })

    })

}