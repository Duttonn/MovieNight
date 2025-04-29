import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { searchMovies } from "@/lib/tmdb";
import { Card } from "@/components/ui/card";
import { Rating } from "@/components/ui/rating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, Film, Star, Calendar, Youtube } from "lucide-react";
import type { Movie as SharedMovie, User as SharedUser } from "@shared/schema";

// Define the expected shape of the movie prop, including the nested proposer
interface SuggestionMovieCardProps {
  movie: SharedMovie & { 
    proposer?: Pick<SharedUser, 'id' | 'username' | 'name'> | null 
  };
  compact?: boolean;
}

export function SuggestionMovieCard({ movie, compact = false }: SuggestionMovieCardProps) {
  const { toast } = useToast();
  const [isWatchedDialogOpen, setIsWatchedDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [movieDetails, setMovieDetails] = useState<any | null>(null);
  const [notes, setNotes] = useState(movie.notes || ""); // Initialize with existing notes
  const [personalRating, setPersonalRating] = useState(movie.personalRating || 4); // Initialize with existing rating or default
  
  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      await apiRequest("PATCH", `/api/movies/${movie.id}/rate`, { interestScore: rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/movies/top-pick"] });
      toast({
        title: "Rating submitted",
        description: "Your interest rating has been saved successfully."
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
  
  const watchMutation = useMutation({
    mutationFn: async ({ movieId, notes, personalRating }: { movieId: number, notes: string, personalRating: number }) => {
      await apiRequest("PATCH", `/api/movies/${movieId}/watch`, { notes, personalRating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      setIsWatchedDialogOpen(false);
      toast({
        title: "Movie marked as watched",
        description: "Your notes and rating have been saved.",
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
  
  const handleRating = (rating: number) => {
    rateMutation.mutate(rating);
  };
  
  const handleWatched = () => {
    watchMutation.mutate({
      movieId: movie.id,
      notes,
      personalRating
    });
  };

  // Create YouTube search URL for the movie trailer
  const getYoutubeSearchUrl = (title: string) => {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}`;
  };
  
  // Fetch detailed movie info from TMDB when a movie is selected
  const fetchMovieDetails = async () => {
    if (!movie.tmdbId && !movie.title) return;
    
    try {
      // Use the search endpoint to get movie details
      const searchResponse = await searchMovies(movie.title);
      const matchingMovie = searchResponse.results.find(
        (result) => (movie.tmdbId && result.id === movie.tmdbId) || 
                    result.title.toLowerCase() === movie.title.toLowerCase()
      );
      
      if (matchingMovie) {
        setMovieDetails(matchingMovie);
      }
    } catch (error) {
      console.error("Error fetching movie details:", error);
    }
  };
  
  const handleMovieClick = async () => {
    setIsDetailOpen(true);
    
    // If we don't have movie details yet, fetch them
    if (!movieDetails) {
      fetchMovieDetails();
    }
  };

  const posterUrl = movie.posterPath 
    ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
    : null;

  return (
    <>
      <Card 
        className={`bg-secondary/20 rounded-lg overflow-hidden border border-border ${compact ? 'h-full' : ''} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={handleMovieClick}
      >
        {/* Display Poster or Placeholder */}
        <div className="aspect-[2/3] w-full bg-secondary/50">
          {posterUrl ? (
            <img 
              src={posterUrl}
              alt={movie.title}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <Film className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <span className="text-sm font-semibold text-muted-foreground/80 line-clamp-2">{movie.title}</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h4 className="font-semibold mb-2 truncate">{movie.title}</h4>
          <div className="flex justify-between items-center mb-3">
            <div className="flex">
              {/* Display Proposal Intent Rating */}
              <Rating value={movie.proposalIntent} max={4} readOnly size="sm" tooltipPrefix="Proposer's intent: " />
            </div>
            <span className="text-xs text-muted-foreground truncate">
              By {movie.proposer?.name || movie.proposer?.username || "Unknown"}
            </span>
          </div>
          <div className="flex flex-col space-y-2">
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              Your interest:
            </div>
            {/* Display Interest Score Rating (Editable) */}
            <Rating
              value={movie.interestScore ?? undefined} // Use ?? undefined to handle null/0 correctly
              onChange={(rating) => {
                handleRating(rating);
                event?.stopPropagation(); // Prevent card click when rating
              }}
              disabled={rateMutation.isPending || movie.watched}
              tooltipPrefix="Your interest: "
            />
          </div>
          
          {/* Show Mark as Watched button only if not compact and not watched */}
          {!compact && !movie.watched && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                setIsWatchedDialogOpen(true);
              }}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark as Watched
            </Button>
          )}
          
          {/* Show Watched indicator if watched */}
          {!compact && movie.watched && (
            <div className="mt-4 p-2 bg-green-900/20 border border-green-600/30 rounded-md">
              <p className="text-xs text-green-400 font-medium flex items-center">
                <Check className="h-3 w-3 mr-1" />
                Watched
              </p>
              {/* Optionally display personal rating and notes here */}
              {movie.personalRating && (
                <div className="mt-1 flex items-center">
                  <Rating value={movie.personalRating} max={5} readOnly size="xs" />
                </div>
              )}
              {movie.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">"{movie.notes}"</p>
              )}
            </div>
          )}
        </div>
      </Card>
      
      {/* Movie Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl h-[90vh] overflow-y-auto">
          <div className="relative aspect-video mb-4 bg-black rounded-t-lg overflow-hidden">
            {movieDetails?.backdrop_path ? (
              <img
                src={`https://image.tmdb.org/t/p/original${movieDetails.backdrop_path}`}
                alt={movie.title}
                className="object-cover w-full h-full"
              />
            ) : posterUrl ? (
              <img
                src={posterUrl}
                alt={movie.title}
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
              <span>{movie.title}</span>
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
                {movie.proposer?.name || movie.proposer?.username || 'Unknown'}
              </span>
              <span className="mx-2">•</span>
              <span className="text-sm">
                Proposal Rating: 
                <Rating 
                  value={movie.proposalIntent} 
                  max={4} 
                  readOnly 
                  size="sm"
                  className="inline-flex ml-1"
                />
              </span>
              
              {movie.interestScore !== undefined && (
                <>
                  <span className="mx-2">•</span>
                  <span className="text-sm">
                    Your Interest: 
                    <Rating 
                      value={movie.interestScore} 
                      max={4} 
                      readOnly 
                      size="sm"
                      className="inline-flex ml-1"
                    />
                  </span>
                </>
              )}
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
                href={getYoutubeSearchUrl(movie.title)} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Youtube className="h-4 w-4 mr-2" />
                Watch Trailer
              </a>
            </Button>
            
            {!movie.watched ? (
              <Button 
                className="flex-1"
                onClick={() => setIsWatchedDialogOpen(true)}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark as Watched
              </Button>
            ) : (
              <Button 
                className="flex-1"
                variant="outline"
                disabled
              >
                <Check className="h-4 w-4 mr-2" />
                Watched
              </Button>
            )}
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
          
          {movie.watched && movie.notes && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-600/30 rounded-md">
              <h4 className="text-sm font-semibold text-green-400 mb-2">Your Notes</h4>
              <p className="text-sm text-muted-foreground italic">"{movie.notes}"</p>
              {movie.personalRating && (
                <div className="mt-2 flex items-center">
                  <span className="text-sm text-muted-foreground mr-2">Your Rating:</span>
                  <Rating value={movie.personalRating} max={5} readOnly size="sm" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Watched Dialog */}
      <Dialog open={isWatchedDialogOpen} onOpenChange={setIsWatchedDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Movie as Watched</DialogTitle>
            <DialogDescription>
              Share your thoughts about "{movie.title}" after watching it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Rating (1-5)</label>
              <Rating
                value={personalRating}
                onChange={setPersonalRating}
                max={5}
                tooltipPrefix="Your rating: "
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                placeholder="Share your thoughts about the movie..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleWatched}
              disabled={watchMutation.isPending}
            >
              {watchMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
