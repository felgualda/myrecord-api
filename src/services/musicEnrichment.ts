// src/services/musicEnrichment.ts

interface EnrichmentData {
    deezerUrl: string | null;
    deezerRank: number | null;
    itunesUrl: string | null;
    itunesPreviewUrl: string | null;
}

async function getDeezerData(title: string, artist: string): Promise<{url: string | null; rank: number | null}> {
    try {
        const query = encodeURIComponent(`artist:"${artist}" track:"${title}"`);
        const response = await fetch(`https://api.deezer.com/search?q=${query}&limit=1`);

        if (!response.ok) return { rank: null, url: null };

        const data = await response.json();
        const track = data?.data?.[0];

        return {
            url: track?.link ?? null,
            rank: track?.rank ?? null
        };
    } catch (error) {
        console.error('Erro ao buscar dados no Deezer:', error);
        return { rank: null, url: null };
    }
}
async function getItunesData(title: string, artist: string): Promise<{url: string | null; previewUrl: string | null}> {
    try {
        const term = encodeURIComponent(`${artist} ${title}`);
        const response = await fetch(
            `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`
        );

        if (!response.ok) return {url: null, previewUrl: null};

        const data = await response.json();
        const track = data?.results?.[0];
        
        return {
            url: track?.trackViewUrl ?? null,
            previewUrl: track?.previewUrl ?? null
        }
    } catch (error) {
        console.error('Erro ao buscar preview no iTunes:', error);
        return {url: null, previewUrl: null};
    }
}

export async function enrichSongData(title: string, artist: string): Promise<EnrichmentData> {
    const [deezerData, itunesData] = await Promise.all([
        getDeezerData(title, artist),
        getItunesData(title, artist)
    ]);

    return { 
            deezerUrl: deezerData.url, 
            deezerRank: deezerData.rank,
            itunesUrl: itunesData.url,
            itunesPreviewUrl: itunesData.previewUrl
        };
}