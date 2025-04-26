const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    post_id: String,
    headimg: String,
    hashtag: String,
    title: String,
    address: String,
    metro: {type: String, default: 'Masofa uzoq'},
    count: String,
    salary: String,
    status: {type: String, default: 'Faol'},
    requirements: {type: String, default: '...'},
    duties: {type: String, default: '...'},
    additional: {type: String, default: '...'},
    contacts: String,
    adminLink: {type: String, default: '@bk_juraev'},
    botAd: {type: String, default: '@IshTopdimRuBot — сизнинг ёрдамчингиз!'},
    category: {type: String, default: 'kunlik'},
    hous: {type: String, default: 'yo\'q'},
    city: {type: String, default: 'Moskva'},
    reviews: Array,
    telegram: String,
    instagram: String,
    website: String,
    images: String,
    locationimages: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);