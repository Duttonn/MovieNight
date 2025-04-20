import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Rating } from "@/components/ui/rating";

type Movie = {
  id: number;
  title: string;
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
                <Skeleton className="aspect-w-16 aspect-h-9 h-40 w-full" />
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
            {movies.slice(0, 3).map((movie) => (
              <div key={movie.id} className="bg-secondary/20 rounded-lg overflow-hidden border border-border">
                <div className="aspect-w-16 aspect-h-9 w-full">
                  {/* Movie image placeholder - in real app, get from API */}
                  <div className="bg-secondary/50 flex items-center justify-center">
                    <span className="text-lg font-semibold">{movie.title}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-semibold mb-2">{movie.title}</h4>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex">
                      <Rating value={movie.proposalIntent} max={4} readOnly size="sm" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Proposed by {movie.proposer.name || movie.proposer.username}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      Rate your interest:
                    </div>
                    <Rating
                      value={movie.interestScore}
                      onChange={(rating) => handleRating(movie.id, rating)}
                      disabled={rateMutation.isPending}
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
