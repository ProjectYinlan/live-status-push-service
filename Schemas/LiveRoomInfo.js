/**
 * LiveRoomInfo
 */

const { Schema, model } = require('mongoose');

module.exports = model('LiveRoomInfo', new Schema ({
    roomid: Number,
    uid: Number,
    face: String,
    uname: String,
    status: Number,
    title: String,
	cover: String,
	keyframe: String,
    startTime: Date,
	pending: [{
		bot: Number,
		status: Number
	}],
    group: [{
		id: Number,
		atAll: Boolean
	}],
    history: [{
        title: String,
        startTime: Date,
        endTime: Date,
        lastTime: Number,
		cover: String
    }]
}));