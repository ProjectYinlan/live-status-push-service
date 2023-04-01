/**
 * 直播状态推送服务
 */

require('./mqtt');
require('./redis').connect();
require('./controller').init();