const { initDatabase } = require('../backend/src/utils/db-init');

// Eagerly start DB initialization on cold start
const dbReadyPromise = initDatabase();

const app = require('../backend/src/server');

// Wrap the Express app to ensure DB is ready before handling requests
module.exports = async (req, res) => {
  await dbReadyPromise;
  return app(req, res);
};
