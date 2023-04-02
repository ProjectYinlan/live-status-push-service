/**
 * 直播状态推送服务
 */

async function main() {

    await require('./mongo').connect();
    await require('./redis').connect();
    require('./ws');
    await require('./controller').init();

}

main();