const mongoose = require('mongoose');

const audioSchema = new mongoose.Schema({
    filename: String,
    data: Buffer,
});

const Audio = mongoose.model('Audio', audioSchema);

module.exports = Audio;