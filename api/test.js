module.exports = function test(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    return res.status(200).json({
        status: 'ok',
        message: 'API funcionando',
        timestamp: new Date().toISOString()
    });
};
