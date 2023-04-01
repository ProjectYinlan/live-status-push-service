/**
 * b站相关操作
 */

const tag = "bilibili";

const config = require('./config.json');

const qs = require('querystring');
const axios = require('axios').create({
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': config.bilibili.Cookie
    }
})

// 请求拦截器
axios.interceptors.request.use((originData) => {

    if (originData.method != 'post') return originData;

    originData.data.csrf = config.bilibili.csrf;

    originData.data = qs.stringify(originData.data);

    return originData;

}, (error) => {

    return Promise.reject(error);

});

module.exports = {

    /**
     * 获取当前直播中的订阅列表
     */
    async getOnlineSubList() {

        let r = await axios({
            method: 'get',
            url: 'https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/w_live_users?size=2000'
        }).then(a => a.data);

        if (r.code != 0) {
            console.error(tag, r.msg);
            throw new Error;
        }

        console.log(r);

        return r.data.items;

    },


    /**
     * 订阅 up 主
     * @param {Number} uid 
     */
    async subUp(uid) {

        let r = await axios({
            method: 'post',
            url: 'https://api.bilibili.com/x/relation/modify',
            data: {
                fid: uid,
                act: 1
            }
        }).then(a => a.data);

        let rs = {
            code: r.code,
            msg: r.message
        }

        console.log(r);

        if (r.code == 22002) rs.msg = "服务所用账号已被拉黑。";

        return rs;

    },

    /**
     * 通过房间id获取uid
     * @param {Number} roomid
     * @return {Number}
     */
    async getUidByRoomid(roomid) {

        let r = await axios({
            url: `https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomid}`,
            method: 'get'
        }).then(a => a.data);

        if (r.code != 0) throw new Error(r.msg);

        return r.data.uid;
    },

    /**
     * 通过uid获取用户昵称
     * @param {Number} uid
     * @return {Number}
     */
    async getUsernameByUid(uid) {
        
        let r = await axios({
            url: `https://api.bilibili.com/x/space/acc/info?mid=${uid}`,
            method: 'get'
        }).then(a => a.data);

        return r.data.name;

    }
}