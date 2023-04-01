/**
 * redis instance
 */

const tag = "redis";

const redis = require('redis');

const config = require('./config.json');

const client = redis.createClient(config.redis);

client.on('connect', () => {
    console.log(tag, "初始化");
})

client.on('ready', () => {
    console.log(tag, "就绪");
})

module.exports = client;