/**
 * mqtt instance
 */

const tag = "mqtt";

const MQTT = require("async-mqtt");

const config = require('./config.json');

const client = MQTT.connect(config.mqtt.url, config.mqtt.auth);

client.on("connect", () => {

    console.log(tag, "就绪");

    client.subscribe("livepush/#");

})

module.exports = client;