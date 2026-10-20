const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/test', require('./api/test'));
app.get('/api/test', require('./api/test'));
app.post('/api/captura', require('./api/captura'));
app.post('/api/sessao_final', require('./api/sessao_final'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor local na porta ${port}`));
