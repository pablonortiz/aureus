const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export interface GroqQueryResult {
  platform: string;
  query_text: string;
  description: string;
}

export interface GroqResponse {
  keywords: string[];
  tip: string;
  queries: GroqQueryResult[];
}

const SYSTEM_PROMPT = `Sos un experto en OSINT y búsquedas en internet. El usuario te va a dar una consulta en lenguaje natural y vos tenés que generar queries optimizados para buscar en distintas plataformas.

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin backticks, sin texto extra) con este formato exacto:
{
  "keywords": ["keyword1", "keyword2"],
  "tip": "Un consejo útil y contextual para la búsqueda",
  "queries": [
    {
      "platform": "twitter",
      "query_text": "query optimizado para Twitter/X",
      "description": "Descripción corta de qué busca"
    }
  ]
}

Plataformas disponibles: twitter, google_news, reddit, instagram, google

Reglas:
- Generá entre 5 y 10 queries en total, distribuidos entre las plataformas relevantes
- Para Twitter: usá operadores como OR, hashtags, y búsquedas en tiempo real
- Para Reddit: usá subreddit: si es relevante
- Para Instagram: usá hashtags sin espacios (#PalabraClave)
- Para Google News: optimizá para noticias recientes
- Para Google: búsqueda general optimizada
- El tip debe ser accionable y específico para la consulta
- Keywords deben ser las palabras clave más relevantes
- Todos los textos en español salvo que la consulta sea en otro idioma`;

export async function generateRadarQueries(
  query: string,
  apiKey: string,
): Promise<GroqResponse> {
  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {role: 'system', content: SYSTEM_PROMPT},
        {role: 'user', content: query},
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No se recibió respuesta de la IA');
  }

  // Parse JSON — handle potential markdown wrapping
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed: GroqResponse = JSON.parse(jsonStr);

  if (!parsed.queries || !Array.isArray(parsed.queries)) {
    throw new Error('Formato de respuesta inválido');
  }

  return parsed;
}

export function buildLaunchUrl(platform: string, queryText: string): string {
  const encoded = encodeURIComponent(queryText);

  switch (platform) {
    case 'twitter':
      return `https://x.com/search?q=${encoded}&f=live`;
    case 'google_news':
      return `https://news.google.com/search?q=${encoded}`;
    case 'reddit':
      return `https://www.reddit.com/search/?q=${encoded}`;
    case 'instagram': {
      // Extract hashtag (remove # if present, join words)
      const tag = queryText.replace(/^#/, '').replace(/\s+/g, '');
      return `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`;
    }
    case 'google':
      return `https://www.google.com/search?q=${encoded}`;
    default:
      return `https://www.google.com/search?q=${encoded}`;
  }
}
