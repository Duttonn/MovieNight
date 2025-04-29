import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Share, PlayCircle, Film, Star, Calendar, Youtube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { searchMovies } from "@/lib/tmdb";

type User = {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
};

type TopPickMovie = {
  id: number;
  title: string;
  posterPath?: string | null;
  tmdbId?: number;
  proposerId: number;
  proposedAt: string;
  proposalIntent: number; // 1-4
  interestScore?: number; // 1-4
  watched: boolean;
  watchedAt?: string;
  notes?: string;
  personalRating?: number;
  groupId?: number;
  proposer: User;
};

export default function WeeklyPick() {
  const { toast } = useToast();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [movieDetails, setMovieDetails] = useState<any | null>(null);
  
  const { data: topPick, isLoading, error } = useQuery<TopPickMovie | null>({
    queryKey: ["/api/movies/top-pick"],
  });

  // Calculate score out of 20 (proposalIntent + interestScore, each 1-4)
  const calculateScore = (movie: TopPickMovie) => {
    if (!movie.interestScore) return 0;
    return (movie.proposalIntent + movie.interestScore) * 2.5; // Scale to 0-20
  };
  
  // Create YouTube search URL for the movie trailer
  const getYoutubeSearchUrl = (title: string) => {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}`;
  };
  
  // Fetch detailed movie info from TMDB
  const fetchMovieDetails = async (movie: TopPickMovie) => {
    if (!movie.tmdbId && !movie.title) return null;
    
    try {
      // Use search endpoint to find movie details
      const searchResponse = await searchMovies(movie.title);
      const matchingMovie = searchResponse.results.find(
        (result) => (movie.tmdbId && result.id === movie.tmdbId) || 
                    result.title.toLowerCase() === movie.title.toLowerCase()
      );
      return matchingMovie || null;
    } catch (error) {
      console.error("Error fetching movie details:", error);
      return null;
    }
  };
  
  const handleOpenDetails = async () => {
    if (!topPick) return;
    
    setIsDetailOpen(true);
    
    // Try to fetch additional details from TMDB
    if (!movieDetails) {
      const details = await fetchMovieDetails(topPick);
      setMovieDetails(details);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">This Week's Top Pick</h3>

          {isLoading ? (
            <div className="flex flex-col md:flex-row md:space-x-6">
              <div className="w-full md:w-1/3 mb-4 md:mb-0">
                <Skeleton className="aspect-[2/3] rounded-lg h-64 w-full" />
              </div>
              <div className="w-full md:w-2/3">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-32 mb-4" />
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-5 w-40 mb-4" />
                <div className="flex space-x-3">
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-10 w-28" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-secondary/20 rounded-lg p-6 text-center">
              <p className="text-destructive">Error loading top movie pick</p>
            </div>
          ) : !topPick ? (
            <div className="bg-secondary/20 rounded-lg p-6 text-center">
              <p className="text-muted-foreground mb-2">No movie picks available yet.</p>
              <p className="text-sm">Propose movies and rate them to get suggestions!</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:space-x-6">
              <div 
                className="w-full md:w-1/3 mb-4 md:mb-0 cursor-pointer"
                onClick={handleOpenDetails}
              >
                {/* Display poster or placeholder */}
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary/50 hover:opacity-90 transition-opacity">
                  {topPick.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${topPick.posterPath}`}
                      alt={topPick.title}
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Film className="h-12 w-12 mb-2" />
                      <span className="text-sm text-center px-2">{topPick.title}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full md:w-2/3">
                <h4 
                  className="text-2xl font-bold mb-2 cursor-pointer hover:text-primary transition-colors"
                  onClick={handleOpenDetails}
                >
                  {topPick.title}
                </h4>
                <div className="flex items-center mb-4">
                  <div className="flex">
                    <Rating value={Math.round(calculateScore(topPick) / 5)} max={4} readOnly />
                  </div>
                  <span className="ml-2 text-muted-foreground">
                    Score: {calculateScore(topPick)}/20
                  </span>
                </div>
                <div className="mb-4">
                  <p className="text-muted-foreground line-clamp-3">
                    {/* Will be replaced with real overview from TMDB in the detailed view */}
                    {movieDetails?.overview || 
                     "Click on the movie poster or title to see more details about this movie."}
                  </p>
                </div>
                <div className="mb-4">
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">Proposed by:</span>
                    <div className="flex items-center">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage
                          src={topPick.proposer.avatar}
                          alt={topPick.proposer.name || topPick.proposer.username}
                        />
                        <AvatarFallback>
                          {(topPick.proposer.name || topPick.proposer.username).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {topPick.proposer.name || topPick.proposer.username}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button 
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleOpenDetails}
                  >
                    <PlayCircle className="h-5 w-5 mr-2" />
                    View Details
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex items-center"
                    asChild
                  >
                    <a 
                      href={getYoutubeSearchUrl(topPick.title)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Youtube className="h-5 w-5 mr-2" />
                      Trailer
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Movie Details Dialog */}
      {topPick && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl h-[90vh] overflow-y-auto">
            <div className="relative aspect-video mb-4 bg-black rounded-t-lg overflow-hidden">
              {movieDetails?.backdrop_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/original${movieDetails.backdrop_path}`}
                  alt={topPick.title}
                  className="object-cover w-full h-full"
                />
              ) : topPick.posterPath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${topPick.posterPath}`}
                  alt={topPick.title}
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
                <span>{topPick.title}</span>
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
                  
                  <Badge variant="outline" className="bg-primary/20 text-primary">
                    Top Pick
                  </Badge>
                </div>
              </DialogTitle>
              
              <div className="flex items-center mt-2 mb-2">
                <span className="text-sm font-medium mr-2">Proposed by:</span>
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage
                      src={topPick.proposer.avatar}
                      alt={topPick.proposer.name || topPick.proposer.username}
                    />
                    <AvatarFallback>
                      {(topPick.proposer.name || topPick.proposer.username).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {topPick.proposer.name || topPick.proposer.username}
                  </span>
                </div>
                
                <span className="mx-2">•</span>
                <span className="text-sm">
                  Proposer Rating: 
                  <Rating 
                    value={topPick.proposalIntent} 
                    max={4} 
                    readOnly 
                    size="sm"
                    className="inline-flex ml-1"
                  />
                </span>
                
                <span className="mx-2">•</span>
                <span className="text-sm">
                  Your Interest: 
                  <Rating 
                    value={topPick.interestScore} 
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
                  href={getYoutubeSearchUrl(topPick.title)} 
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
                  toast({
                    title: "Mark as Watched",
                    description: "This feature will be available soon!",
                    variant: "default"
                  });
                }}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Mark as Watched
              </Button>
            </div>
            
            {movieDetails && movieDetails.genres && movieDetails.genres.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-2">Genres</h4>
                <div className="flex flex-wrap gap-2">
                  {movieDetails.genres.map((genre: any) => (
                    <Badge key={genre.id} variant="outline">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Additional movie info could be added here when available */}
            
            <div className="mt-6 p-4 bg-secondary/20 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Why This Was Picked</h4>
              <p className="text-sm text-muted-foreground">
                This movie was selected as the top pick based on your interest rating 
                and the proposer's enthusiasm. Movies with high ratings from both 
                parties are prioritized in the recommendation system.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
