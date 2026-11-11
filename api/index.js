const healthHandler = require('./health');
const samplesHandler = require('./samples');
const analyzeHandler = require('./analyze');
const chatHandler = require('./chat');

module.exports = (req, res) => {
  const url = req.url || '';
  if (url.includes('/health')) return healthHandler(req, res);
  if (url.includes('/samples')) return samplesHandler(req, res);
  if (url.includes('/analyze')) return analyzeHandler(req, res);
  if (url.includes('/chat')) return chatHandler(req, res);

  return healthHandler(req, res);
};
