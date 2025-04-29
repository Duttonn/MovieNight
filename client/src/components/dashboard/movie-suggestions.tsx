import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { searchMovies } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";
import { Rating } from "@/components/ui/rating";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, Star, Calendar, ExternalLink, Youtube } from "lucide-react";

type Movie = {
  id: number;
  title: string;
  posterPath?: string | null;
  tmdbId?: number;
  proposerId: number;
  proposalIntent: number;
  interestScore?: number;
  watched: boolean;
  groupId?: number;
  proposer: {
    id: number;
    username: string;
    name?: string;
  };
};

export default function MovieSuggestions() {
  const { toast } = useToast();
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [movieDetails, setMovieDetails] = useState<any | null>(null);
  
  const { data: movies, isLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });
  
  // Fetch detailed movie info from TMDB when a movie is selected
  const fetchMovieDetails = async (movie: Movie) => {
    if (!movie.tmdbId) return null;
    
    try {
      // Use the search endpoint as a fallback to get movie details
      const searchResponse = await searchMovies(movie.title);
      const matchingMovie = searchResponse.results.find(
        (result) => result.id === movie.tmdbId || 
                    result.title.toLowerCase() === movie.title.toLowerCase()
      );
      return matchingMovie || null;
    } catch (error) {
      console.error("Error fetching movie details:", error);
      return null;
    }
  };
  
  const handleMovieClick = async (movie: Movie) => {
    setSelectedMovie(movie);
    setIsDetailOpen(true);
    
    // Try to fetch additional details if tmdbId is available
    if (movie.tmdbId) {
      const details = await fetchMovieDetails(movie);
      setMovieDetails(details);
    } else {
      // If no movie.tmdbId, try to search by title to get details
      const details = await fetchMovieDetails(movie);
      setMovieDetails(details);
    }
  };
  
  const rateMutation = useMutation({
    mutationFn: async ({ movieId, rating }: { movieId: number, rating: number }) => {
      await apiRequest("PATCH", `/api/movies/${movieId}/rate`, { interestScore: rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/movies/top-pick"] });
      toast({
        title: "Rating submitted",
        description: "Your rating has been saved successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleRating = (movieId: number, rating: number) => {
    rateMutation.mutate({ movieId, rating });
  };
  
  // Create YouTube search URL for the movie trailer
  const getYoutubeSearchUrl = (title: string) => {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}`;
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Movie Suggestions</h3>
            <Link href="/movies" className="text-primary hover:text-primary/80 text-sm font-medium">
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-secondary/20 rounded-lg overflow-hidden border border-border">
                  <Skeleton className="aspect-[2/3] h-60 w-full" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !movies || movies.length === 0 ? (
            <div className="bg-secondary/20 rounded-lg p-6 text-center">
              <p className="text-muted-foreground">No movie suggestions available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Limit to first 3 movies for the dashboard view */}
              {movies.slice(0, 3).map((movie) => (
                <div 
                  key={movie.id} 
                  className="bg-secondary/20 rounded-lg overflow-hidden border border-border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleMovieClick(movie)}
                >
                  <div className="aspect-[2/3] w-full bg-secondary/50">
                    {movie.posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                        alt={movie.title}
                        className="object-cover w-full h-full"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Film className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold mb-2 truncate">{movie.title}</h4>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex">
                        <Rating value={movie.proposalIntent} max={4} readOnly size="sm" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Proposed by {movie.proposer?.name || movie.proposer?.username || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                        Rate your interest:
                      </div>
                      <Rating
                        value={movie.interestScore}
                        onChange={(rating) => {
                          handleRating(movie.id, rating);
                          event?.stopPropagation(); // Prevent card click when rating
                        }}
                        readOnly={rateMutation.isPending}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Movie Details Dialog */}
      {selectedMovie && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl h-[90vh] overflow-y-auto">
            <div className="relative aspect-video mb-4 bg-black rounded-t-lg overflow-hidden">
              {movieDetails?.backdrop_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/original${movieDetails.backdrop_path}`}
                  alt={selectedMovie.title}
                  className="object-cover w-full h-full"
                />
              ) : selectedMovie.posterPath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${selectedMovie.posterPath}`}
                  alt={selectedMovie.title}
                  className="object-contain w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center justify-between">
                <span>{selectedMovie.title}</span>
                <div className="flex items-center gap-2">
                  {movieDetails && (
                    <>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {movieDetails.vote_average?.toFixed(1) || 'N/A'}
                      </Badge>
                      {movieDetails.release_date && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(movieDetails.release_date).getFullYear()}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </DialogTitle>
              
              <div className="flex items-center mt-2 mb-2">
                <span className="text-sm font-medium mr-2">Proposed by:</span>
                <span className="text-sm">
                  {selectedMovie.proposer?.name || selectedMovie.proposer?.username || 'Unknown'}
                </span>
                <span className="mx-2">•</span>
                <span className="text-sm">
                  Proposal Rating: 
                  <Rating 
                    value={selectedMovie.proposalIntent} 
                    max={4} 
                    readOnly 
                    size="sm"
                    className="inline-flex ml-1"
                  />
                </span>
              </div>
              
              <DialogDescription className="text-base !mt-4">
                {movieDetails?.overview || "No description available for this movie."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex gap-3">
              <Button 
                className="flex-1" 
                asChild
                variant="secondary"
              >
                <a 
                  href={getYoutubeSearchUrl(selectedMovie.title)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Youtube className="h-4 w-4 mr-2" />
                  Watch Trailer
                </a>
              </Button>
              
              <Button 
                className="flex-1"
                onClick={() => {
                  if (!selectedMovie.interestScore) {
                    toast({
                      title: "Please rate the movie",
                      description: "Rate how interested you are in watching this movie.",
                      variant: "default"
                    });
                  } else {
                    toast({
                      title: "Rating submitted",
                      description: `You rated "${selectedMovie.title}" ${selectedMovie.interestScore}/4`,
                    });
                  }
                }}
              >
                <Star className="h-4 w-4 mr-2" />
                {selectedMovie.interestScore ? `Your Rating: ${selectedMovie.interestScore}/4` : "Rate Movie"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
