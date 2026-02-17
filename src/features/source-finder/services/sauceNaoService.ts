export interface SauceNaoResult {
  similarity: number;
  sourceName: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  indexName: string | null;
  creators: string | null;
}

const SAUCENAO_API = 'https://saucenao.com/search.php';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function searchImage(
  imageUrl: string,
  apiKey: string,
): Promise<SauceNaoResult[]> {
  if (!apiKey) {
    throw new Error('API key de SauceNAO no configurada.');
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    url: imageUrl,
    output_type: '2',
    db: '999',
    numres: '5',
  });

  const response = await fetch(`${SAUCENAO_API}?${params.toString()}`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('API key de SauceNAO inválida o límite alcanzado.');
    }
    throw new Error('Error al buscar en SauceNAO.');
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return [];
  }

  const results: SauceNaoResult[] = [];

  for (const r of data.results) {
    const similarity = parseFloat(r.header?.similarity || '0');
    if (similarity < 50) {
      continue;
    }

    const extUrls = r.data?.ext_urls || [];
    const sourceUrl = extUrls[0] || null;

    const rawCreator = r.data?.creator;
    const creators =
      r.data?.member_name ||
      r.data?.author_name ||
      (Array.isArray(rawCreator) ? rawCreator.join(', ') : rawCreator) ||
      null;

    results.push({
      similarity,
      sourceName: r.data?.source || null,
      sourceTitle: r.data?.title || null,
      sourceUrl,
      thumbnailUrl: r.header?.thumbnail || null,
      indexName: r.header?.index_name || null,
      creators: creators || null,
    });
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

export async function searchImagesWithRateLimit(
  imageUrls: string[],
  apiKey: string,
  onProgress?: (index: number, total: number) => void,
): Promise<Map<string, SauceNaoResult[]>> {
  const resultsMap = new Map<string, SauceNaoResult[]>();

  for (let i = 0; i < imageUrls.length; i++) {
    onProgress?.(i + 1, imageUrls.length);

    try {
      const results = await searchImage(imageUrls[i], apiKey);
      resultsMap.set(imageUrls[i], results);
    } catch {
      resultsMap.set(imageUrls[i], []);
    }

    if (i < imageUrls.length - 1) {
      await delay(5000);
    }
  }

  return resultsMap;
}
