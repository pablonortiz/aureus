export interface TweetPhoto {
  url: string;
  width: number;
  height: number;
}

export interface TweetData {
  tweetId: string;
  text: string;
  authorName: string;
  authorAvatar: string;
  photos: TweetPhoto[];
}

function parseTweetId(url: string): string | null {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : null;
}

export async function fetchTweet(url: string): Promise<TweetData> {
  const tweetId = parseTweetId(url);
  if (!tweetId) {
    throw new Error('URL inválida. Pegá un link de Twitter/X con un tweet.');
  }

  const response = await fetch(
    `https://api.fxtwitter.com/status/${tweetId}`,
    {
      headers: {'User-Agent': 'Aureus/1.0'},
    },
  );

  if (!response.ok) {
    throw new Error('No se pudo obtener el tweet. Verificá el link.');
  }

  const data = await response.json();

  if (!data.tweet) {
    throw new Error('Tweet no encontrado.');
  }

  const tweet = data.tweet;
  const photos: TweetPhoto[] = [];

  if (tweet.media?.photos) {
    for (const photo of tweet.media.photos) {
      photos.push({
        url: photo.url,
        width: photo.width || 0,
        height: photo.height || 0,
      });
    }
  }

  if (photos.length === 0) {
    throw new Error('El tweet no contiene imágenes.');
  }

  return {
    tweetId,
    text: tweet.text || '',
    authorName: tweet.author?.name || tweet.author?.screen_name || 'Desconocido',
    authorAvatar: tweet.author?.avatar_url || '',
    photos,
  };
}
