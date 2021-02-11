const { model, Schema } = require('mongoose');

const websiteSchema = new Schema({
    url: String,
    history: [
      {
        statusCode: Number,
        timestamp: String,
      }
    ],
    latestStatus: Number,
    monitered: Boolean,
    title: String,
    email: String,
});

module.exports = model('Website', websiteSchema);
