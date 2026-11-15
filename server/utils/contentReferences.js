const Game = require('../models/game.model');
const Edition = require('../models/edition.model');
const GameContent = require('../models/gameContent.model');
const fail = message => Object.assign(new Error(message), { status: 400 });

async function validateContentReferences(doc) {
  if (doc.constructor !== GameContent) return;
  const visited = new Set();
  async function walk(content) {
    if (String(content._id) === String(doc._id)) throw fail('Content items cannot form a cycle');
    if (visited.has(String(content._id))) return;
    visited.add(String(content._id));
    for (const item of content.items || []) {
      if (!item.content_id) continue;
      const child = await GameContent.findById(item.content_id);
      if (!child) throw fail('Content item not found');
      await walk(child);
    }
  }
  for (const item of doc.items) {
    const target = item.game_id ? await Game.findById(item.game_id) : item.edition_id ? await Edition.findById(item.edition_id) : await GameContent.findById(item.content_id);
    if (!target) throw fail('Content item not found');
    if (doc.type === 'season_pass') {
      const gameId = item.game_id || target.game_id;
      if (String(gameId) !== String(doc.game_id)) throw fail('Content and owner must belong to the same game');
      if (item.content_id && ['edition', 'bundle', 'subscription'].includes(target.type)) throw fail('This container cannot include another edition, bundle or subscription');
      if (doc.type === 'season_pass' && (item.game_id || item.edition_id || ['season_pass', 'demo', 'trial'].includes(target.type))) throw fail('Season passes must contain additional content');
    }
    if (item.content_id) await walk(target);
  }
}

module.exports = { validateContentReferences };
