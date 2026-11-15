const fail = message => Object.assign(new Error(message), { status: 400 });
async function validateGameIdentity(body) {
  if (Object.hasOwn(body, 'content_type') || Object.hasOwn(body, 'parent_game_id')) {
    throw fail('Game represents the base game only. Register additional content using its own resource and game_id.');
  }
}
module.exports = { validateGameIdentity };
