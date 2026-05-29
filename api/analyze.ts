import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { summary, language = 'es', totalPeople = 0, totalEntries = 0 } = req.body;

  if (!summary) {
    return res.status(400).json({ error: 'Summary is required' });
  }

  // Calcular límite de palabras dinámicamente (mínimo 200, máximo 500)
  const wordLimit = Math.min(500, Math.max(200, totalPeople * 40));

  // Definir prompts según idioma
  const prompts = {
    es: `Sos un lead de equipo analizando ${totalEntries} HPPP${totalEntries > 1 ? 's' : ''} de ${totalPeople} persona${totalPeople > 1 ? 's' : ''}.

IMPORTANTE: Debés analizar e incluir información de TODAS las personas mencionadas abajo. No omitas a nadie.

Generá un resumen ejecutivo completo en español (máx ${wordLimit} palabras) que incluya:

1. **Logros principales**: Destacar los highlights más importantes de TODO el equipo
2. **Progreso general**: Resumir en qué avanzó cada área/persona
3. **Blockers críticos**: TODOS los problemas reportados que requieren atención inmediata
4. **Planes**: Qué planea hacer el equipo la próxima semana
5. **Recomendaciones**: 2-3 acciones concretas para el líder

Sé específico, menciona nombres cuando sea relevante, y asegurate de cubrir a TODAS las personas.

DATOS DEL EQUIPO:
${summary}`,
    en: `You're a team lead analyzing ${totalEntries} HPPP${totalEntries > 1 ? 's' : ''} from ${totalPeople} person${totalPeople > 1 ? 's' : ''}.

IMPORTANT: You MUST analyze and include information from ALL people mentioned below. Don't omit anyone.

Generate a comprehensive executive summary in English (max ${wordLimit} words) that includes:

1. **Main achievements**: Highlight the most important highlights from the ENTIRE team
2. **Overall progress**: Summarize what each area/person progressed on
3. **Critical blockers**: ALL reported problems requiring immediate attention
4. **Plans**: What the team plans to do next week
5. **Recommendations**: 2-3 concrete actions for the leader

Be specific, mention names when relevant, and make sure to cover ALL people.

TEAM DATA:
${summary}`,
    pt: `Você é um líder de equipe analisando ${totalEntries} HPPP${totalEntries > 1 ? 's' : ''} de ${totalPeople} pessoa${totalPeople > 1 ? 's' : ''}.

IMPORTANTE: Você DEVE analisar e incluir informações de TODAS as pessoas mencionadas abaixo. Não omita ninguém.

Gere um resumo executivo completo em português (máx ${wordLimit} palavras) que inclua:

1. **Principais conquistas**: Destacar os highlights mais importantes de TODA a equipe
2. **Progresso geral**: Resumir em que cada área/pessoa progrediu
3. **Bloqueios críticos**: TODOS os problemas reportados que requerem atenção imediata
4. **Planos**: O que a equipe planeja fazer na próxima semana
5. **Recomendações**: 2-3 ações concretas para o líder

Seja específico, mencione nomes quando relevante, e certifique-se de cobrir TODAS as pessoas.

DADOS DA EQUIPE:
${summary}`
  };

  const prompt = prompts[language as keyof typeof prompts] || prompts.es;

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: Math.min(2000, Math.max(1000, totalPeople * 150)), // Más tokens para equipos grandes
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error en la API de Groq');
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || 'No se pudo generar.';

    return res.status(200).json({ insight });
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al conectar con la IA'
    });
  }
}
