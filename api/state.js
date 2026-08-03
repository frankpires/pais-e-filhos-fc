const { Redis } = require('@upstash/redis');

const STATE_KEY = 'fila-quadra-estado';
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const state = await redis.get(STATE_KEY);
    res.status(200).json(state || null);
    return;
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = null;
      }
    }
    if (!body) {
      res.status(400).json({ error: 'corpo inválido' });
      return;
    }
    await redis.set(STATE_KEY, body);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'método não permitido' });
};
