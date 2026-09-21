const storage = require('../utils/imageUpload');
const files = new Map();
const clients = Object.fromEntries(['arvan', 'cloudinary'].map(provider => [provider, {
  async put(key, body) { files.set(`${provider}/${key}`, body); return { key, url: `https://${provider}.example.com/${key}` }; },
  async remove(key) { files.delete(`${provider}/${key}`); },
}]));
storage.createClients = () => clients;
module.exports = { files };
