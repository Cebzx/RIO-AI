// Replace with your actual Client ID from Spotify Developer Dashboard
const CLIENT_ID = 'a6723b7b514d48a3915174094a619092'; 
// Since this is a client-side demo, we use the current window location as redirect
const REDIRECT_URI = window.location.origin + '/'; 
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-top-read'
];

export const SpotifyService = {
  getAuthUrl: () => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'token',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      show_dialog: 'true'
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  },

  getTokenFromUrl: (): { accessToken: string, expiresIn: string } | null => {
    const hash = window.location.hash.substring(1);
    if (!hash) return null;
    
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    
    if (accessToken && expiresIn) {
      return { accessToken, expiresIn };
    }
    return null;
  },

  searchAndPlay: async (query: string, token: string, type: 'track' | 'album' | 'playlist' = 'track') => {
    try {
      // 1. Search
      const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const searchData = await searchRes.json();
      let uri = '';
      let name = '';
      let image = '';

      if (type === 'track' && searchData.tracks?.items?.length > 0) {
        uri = searchData.tracks.items[0].uri;
        name = searchData.tracks.items[0].name;
        image = searchData.tracks.items[0].album.images[0]?.url;
      } else if (type === 'album' && searchData.albums?.items?.length > 0) {
        uri = searchData.albums.items[0].uri;
        name = searchData.albums.items[0].name;
        image = searchData.albums.items[0].images[0]?.url;
      } else if (type === 'playlist' && searchData.playlists?.items?.length > 0) {
        uri = searchData.playlists.items[0].uri;
        name = searchData.playlists.items[0].name;
        image = searchData.playlists.items[0].images[0]?.url;
      }

      if (!uri) return { success: false, message: 'Not found' };

      // 2. Play (PUT /me/player/play)
      // Note: This requires an active Spotify device. If none are active, we might fallback to just returning the URI for the embed.
      const playRes = await fetch(`https://api.spotify.com/v1/me/player/play`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(type === 'track' ? { uris: [uri] } : { context_uri: uri })
      });

      if (playRes.status === 204) {
        return { success: true, message: `Playing ${name}`, uri, name, image };
      } else if (playRes.status === 404) {
         // No active device found. We return success so the UI can show the Embed player instead.
         return { success: true, message: `Found ${name}. Queued on player.`, uri, name, image, deviceNotFound: true };
      } else {
         return { success: false, message: 'Could not start playback. Ensure Spotify is open.' };
      }

    } catch (e) {
      console.error(e);
      return { success: false, message: 'Spotify API Error' };
    }
  },

  controlPlayback: async (action: 'pause' | 'play' | 'next' | 'previous', token: string) => {
    const endpoint = action === 'next' ? 'next' : action === 'previous' ? 'previous' : action;
    await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
      method: action === 'play' || action === 'pause' ? 'PUT' : 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return `Playback ${action}ed`;
  },

  getTopTracks: async (token: string) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=5', {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.items || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }
};