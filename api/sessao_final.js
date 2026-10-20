module.exports = function sessaoFinal(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    console.log('Sessão finalizada:', req.body);
    return res.status(200).json({ success: true });
};
