// src/services/musicEnrichment.ts

interface EnrichmentData {
    rank: number | null;
    previewUrl: string | null;
}

async function getDeezerRank(title: string, artist: string): Promise<number | null> {
    try {
        const query = encodeURIComponent(`artist:"${artist}" track:"${title}"`);
        const response = await fetch(`https://api.deezer.com/search?q=${query}&limit=1`);

        if (!response.ok) return null;

        const data = await response.json();
        return data?.data?.[0]?.rank ?? null;
    } catch (error) {
        console.error('Erro ao buscar rank no Deezer:', error);
        return null;
    }
}
async function getItunesPreviewUrl(title: string, artist: string): Promise<string | null> {
    try {
        const term = encodeURIComponent(`${artist} ${title}`);
        const response = await fetch(
            `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`
        );

        if (!response.ok) return null;

        const data = await response.json();
        return data?.results?.[0]?.previewUrl ?? null;
    } catch (error) {
        console.error('Erro ao buscar preview no iTunes:', error);
        return null;
    }
}

export async function enrichSongData(title: string, artist: string): Promise<EnrichmentData> {
    const [rank, previewUrl] = await Promise.all([
        getDeezerRank(title, artist),
        getItunesPreviewUrl(title, artist)
    ]);

    return { rank, previewUrl };
}