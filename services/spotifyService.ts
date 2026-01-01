
// Default to a placeholder if none provided, but UI will encourage user to provide their own
// This particular ID is just a fallback and likely won't work for random users unless whitelisted
const DEFAULT_CLIENT_ID = 'a6723b7b514d48a3915174094a619092'; 
const REDIRECT_URI = window.location.origin + '/'; 

// Scopes required for playback and reading data
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
  getAuthUrl: (customClientId?: string) => {
    const clientId = customClientId || DEFAULT_CLIENT_ID;
    const params = new URLSearchParams({
      client_id: clientId,
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

  // Search and play, preferring the local browser device if available
  searchAndPlay: async (query: string, token: string, deviceId?: string, type: 'track' | 'album' | 'playlist' = 'track') => {
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
      const body: any = type === 'track' ? { uris: [uri] } : { context_uri: uri };
      
      // If we have a local device ID from the Web Playback SDK, target it specifically
      const queryParams = deviceId ? `?device_id=${deviceId}` : '';

      const playRes = await fetch(`https://api.spotify.com/v1/me/player/play${queryParams}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (playRes.status === 204) {
        return { success: true, message: `Playing ${name}`, uri, name, image };
      } else if (playRes.status === 404) {
         return { success: true, message: `Found ${name}. Attempted play, but no active device found.`, uri, name, image, deviceNotFound: true };
      } else if (playRes.status === 403) {
         return { success: false, message: 'Playback failed. Premium account required for API playback.' };
      } else {
         return { success: false, message: 'Could not start playback.' };
      }

    } catch (e) {
      console.error(e);
      return { success: false, message: 'Spotify API Error' };
    }
  },

  controlPlayback: async (action: 'pause' | 'play' | 'next' | 'previous', token: string) => {
    const endpoint = action === 'next' ? 'next' : action === 'previous' ? 'previous' : action;
    try {
        await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: action === 'play' || action === 'pause' ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
        });
        return `Playback ${action}ed`;
    } catch (e) {
        return "Failed to control playback.";
    }
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
