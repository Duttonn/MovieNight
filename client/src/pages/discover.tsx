import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MovieGrid } from "@/components/movies/movie-grid";
import { getPopularMovies, getTopRatedMovies, getUpcomingMovies, searchMovies, type TMDBMovie } from "@/lib/tmdb";
import debounce from "lodash/debounce";

type Movie = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
};

// Transform TMDB movie data to our format
function transformMovie(tmdbMovie: TMDBMovie): Movie {
  return {
    id: tmdbMovie.id,
    title: tmdbMovie.title,
    overview: tmdbMovie.overview,
    posterPath: tmdbMovie.poster_path,
    backdropPath: tmdbMovie.backdrop_path,
    releaseDate: tmdbMovie.release_date,
    voteAverage: tmdbMovie.vote_average,
  };
}

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query updates
  useEffect(() => {
    const handler = debounce((value: string) => {
      setDebouncedSearch(value);
    }, 300);

    handler(searchQuery);
    return () => handler.cancel();
  }, [searchQuery]);

  // Popular movies query
  const { data: popularMovies, isLoading: isLoadingPopular } = useQuery<Movie[]>({
    queryKey: ["movies", "popular"],
    queryFn: async () => {
      const data = await getPopularMovies();
      return data.results.map(transformMovie);
    },
    enabled: activeTab === "popular" && !debouncedSearch,
  });

  // Top rated movies query
  const { data: topRatedMovies, isLoading: isLoadingTopRated } = useQuery<Movie[]>({
    queryKey: ["movies", "toprated"],
    queryFn: async () => {
      const data = await getTopRatedMovies();
      return data.results.map(transformMovie);
    },
    enabled: activeTab === "toprated" && !debouncedSearch,
  });

  // Upcoming movies query
  const { data: upcomingMovies, isLoading: isLoadingUpcoming } = useQuery<Movie[]>({
    queryKey: ["movies", "upcoming"],
    queryFn: async () => {
      const data = await getUpcomingMovies();
      return data.results.map(transformMovie);
    },
    enabled: activeTab === "upcoming" && !debouncedSearch,
  });

  // Search query
  const { data: searchResults, isLoading: isLoadingSearch } = useQuery<Movie[]>({
    queryKey: ["movies", "search", debouncedSearch],
    queryFn: async () => {
      const data = await searchMovies(debouncedSearch);
      return data.results.map(transformMovie);
    },
    enabled: Boolean(debouncedSearch),
  });

  // Switch to search tab when there's a search query
  useEffect(() => {
    if (debouncedSearch && activeTab !== "search") {
      setActiveTab("search");
    }
  }, [debouncedSearch]);

  const getActiveMovies = () => {
    if (debouncedSearch) return searchResults;
    switch (activeTab) {
      case "popular": return popularMovies;
      case "toprated": return topRatedMovies;
      case "upcoming": return upcomingMovies;
      default: return [];
    }
  };

  const isLoading = debouncedSearch ? isLoadingSearch :
    activeTab === "popular" ? isLoadingPopular :
    activeTab === "toprated" ? isLoadingTopRated :
    isLoadingUpcoming;

  return (
    <Shell>
      <div className="container px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Discover Movies</h1>
            <p className="text-muted-foreground">Find new movies to watch with your groups</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for movies..."
              className="pl-9 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <Tabs defaultValue="popular" value={activeTab} onValueChange={setActiveTab}>
            <div className="p-4 border-b border-border">
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="popular">Popular</TabsTrigger>
                <TabsTrigger value="toprated">Top Rated</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                {debouncedSearch && (
                  <TabsTrigger value="search">Search Results</TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="popular" className="mt-0">
                <MovieGrid movies={popularMovies} isLoading={isLoadingPopular} />
              </TabsContent>
              <TabsContent value="toprated" className="mt-0">
                <MovieGrid movies={topRatedMovies} isLoading={isLoadingTopRated} />
              </TabsContent>
              <TabsContent value="upcoming" className="mt-0">
                <MovieGrid movies={upcomingMovies} isLoading={isLoadingUpcoming} />
              </TabsContent>
              {debouncedSearch && (
                <TabsContent value="search" className="mt-0">
                  <MovieGrid movies={searchResults} isLoading={isLoadingSearch} />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </Card>
      </div>
    </Shell>
  );
}