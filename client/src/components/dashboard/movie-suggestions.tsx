import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Rating } from "@/components/ui/rating";
import { Film } from "lucide-react"; // Import Film icon

type Movie = {
  id: number;
  title: string;
  posterPath?: string | null; // Ensure posterPath is included
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
  
  const { data: movies, isLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });
  
  // ... existing rateMutation ...
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

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        {/* ... existing header ... */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Movie Suggestions</h3>
          <Link href="/movies" className="text-primary hover:text-primary/80 text-sm font-medium">
            View all
          </Link>
        </div>

        {isLoading ? (
          // ... existing skeleton loading state ...
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-secondary/20 rounded-lg overflow-hidden border border-border">
                <Skeleton className="aspect-[2/3] h-60 w-full" /> {/* Adjusted aspect ratio */}
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
          // ... existing empty state ...
          <div className="bg-secondary/20 rounded-lg p-6 text-center">
            <p className="text-muted-foreground">No movie suggestions available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Limit to first 3 movies for the dashboard view */}
            {movies.slice(0, 3).map((movie) => (
              <div key={movie.id} className="bg-secondary/20 rounded-lg overflow-hidden border border-border">
                {/* Use posterPath if available, otherwise show placeholder */}
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
                      <Film className="h-10 w-10 text-muted-foreground/50" /> {/* Placeholder icon */}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-semibold mb-2 truncate">{movie.title}</h4>
                  {/* ... existing rating and proposer info ... */}
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
                      onChange={(rating) => handleRating(movie.id, rating)}
                      readOnly={rateMutation.isPending} // Changed disabled to readOnly
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
