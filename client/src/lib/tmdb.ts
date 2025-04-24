const TMDB_API_KEY = "d853a44a56e1cf5dfaf4fac1010c5848";
const TMDB_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkODUzYTQ0YTU2ZTFjZjVkZmFmNGZhYzEwMTBjNTg0OCIsIm5iZiI6MTc0NTIzNDE4Mi4zNTAwMDAxLCJzdWIiOiI2ODA2MjkwNjQyMWEzMDk3NWNhYWI4OTAiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.yaM_ZotA9fsb_ExR8BX4q11KLFo33gmjJIgjV9nwUo0";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function tmdbFetch(endpoint: string, params: Record<string, string> = {}) {
  const queryParams = new URLSearchParams({
    ...params,
  }).toString();

  const url = `${TMDB_BASE_URL}${endpoint}${queryParams ? `?${queryParams}` : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  return response.json();
}

export async function getPopularMovies(page = 1) {
  return tmdbFetch('/movie/popular', { page: page.toString() });
}

export async function getTopRatedMovies(page = 1) {
  return tmdbFetch('/movie/top_rated', { page: page.toString() });
}

export async function getUpcomingMovies(page = 1) {
  return tmdbFetch('/movie/upcoming', { page: page.toString() });
}

export async function searchMovies(query: string, page = 1) {
  return tmdbFetch('/search/movie', {
    query,
    page: page.toString(),
    include_adult: 'false',
  });
}

export type TMDBMovie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  popularity: number;
};