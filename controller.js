/**
 * 核心控制器
 */

const tag = "controller";

const mqtt = require('./mqtt');
const bilibili = require('./bilibili');

module.exports = {

    /**
     * 初始化
     */
    init() {

        console.log(tag, "初始化");

        // 注册监听
        mqtt.on('message', (topic, payload) => {

            payload = JSON.parse(payload.toString());
            
            console.log(topic, payload)

            switch (topic) {

                // 订阅
                case 'livepush/subscribe':
                    subUpHandler(payload)

                    break;
            
                default:
                    return;
            }

        })



    }

}

async function subUpHandler(payload) {

    // 先滤除无用请求
    if (payload.type != 'operate') return;

    const { data, ots } = payload;

    if (!data || !ots) return;

    // 判断入参格式
    if (
        (data.uid && (typeof data.uid != 'number'))
        ||
        (data.roomid && (typeof data.roomid != 'number'))
    ) {
        mqtt.publish('livepush/subscribe', JSON.stringify({
            type: 'result',
            code: -1,
            msg: "请输入正确的uid或roomid",
            ots
        }));
        return;
    }

    let uid = 0;

    if (data.roomid) {
        
        try {
            uid = await bilibili.getUidByRoomid(data.roomid);
        } catch (error) {
            mqtt.publish('livepush/subscribe', JSON.stringify({
                type: 'result',
                code: -1,
                msg: error.message,
                ots
            }));
            return;
        }

    } else {

        uid = data.uid;

    }

    let r = await bilibili.subUp(uid);

    if (r.code != 0) {
        mqtt.publish('livepush/subscribe', JSON.stringify({
            type: 'result',
            code: r.code,
            msg: r.msg,
            ots
        }));
        return;
    }

    r = await bilibili.getUsernameByUid(uid);

    mqtt.publish('livepush/subscribe', JSON.stringify({
        type: 'result',
        code: 0,
        msg: 'success',
        data: {
            uid,
            username: r
        },
        ots
    }));

}