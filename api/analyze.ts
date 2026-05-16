import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { summary } = req.body;

  if (!summary) {
    return res.status(400).json({ error: 'Summary is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Sos un lead de equipo. Analizá este HPPP semanal y generá un resumen ejecutivo breve en español (máx 150 palabras) con: principales logros del equipo, blockers críticos a resolver, y 2-3 recomendaciones accionables. Sé directo, sin preambles.\n\n${summary}`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error en la API de Anthropic');
    }

    const data = await response.json();
    const insight = data.content?.map((b: { text?: string }) => b.text || '').join('') || 'No se pudo generar.';

    return res.status(200).json({ insight });
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al conectar con la IA'
    });
  }
}
