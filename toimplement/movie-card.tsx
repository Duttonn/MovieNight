import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Rating } from "@/components/ui/rating";
import { Button } from "@/components/ui/button";
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
import { useState } from "react";
import { Check, Film } from "lucide-react";

interface MovieCardProps {
  movie: {
    id: number;
    title: string;
    proposerId: number;
    proposalIntent: number;
    interestScore?: number;
    watched: boolean;
    groupId?: number;
    proposer?: {
      id: number;
      username: string;
      name?: string;
    };
    posterPath?: string;
  };
  compact?: boolean;
}

export function MovieCard({ movie, compact = false }: MovieCardProps) {
  const { toast } = useToast();
  const [isWatchedDialogOpen, setIsWatchedDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [personalRating, setPersonalRating] = useState(4);
  
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

  return (
    <>
      <Card className={`bg-secondary/20 rounded-lg overflow-hidden border border-border ${compact ? 'h-full' : ''}`}>
        <div className="aspect-w-16 aspect-h-9 w-full">
          {movie.posterPath ? (
            <img 
              src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
              alt={movie.title}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center bg-secondary/50 p-4">
              <Film className="h-10 w-10 text-muted-foreground/50 mr-2" />
              <span className="text-lg font-semibold truncate">{movie.title}</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h4 className="font-semibold mb-2">{movie.title}</h4>
          <div className="flex justify-between items-center mb-3">
            <div className="flex">
              <Rating value={movie.proposalIntent} max={4} readOnly size="sm" />
            </div>
            <span className="text-xs text-muted-foreground">
              Proposed by {movie.proposer?.name || movie.proposer?.username || "Unknown"}
            </span>
          </div>
          <div className="flex flex-col space-y-2">
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              Rate your interest:
            </div>
            <Rating
              value={movie.interestScore}
              onChange={handleRating}
              disabled={rateMutation.isPending || movie.watched}
            />
          </div>
          
          {!compact && !movie.watched && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => setIsWatchedDialogOpen(true)}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark as Watched
            </Button>
          )}
          
          {!compact && movie.watched && (
            <div className="mt-4 p-2 bg-green-900/20 border border-green-600/30 rounded-md">
              <p className="text-xs text-green-400 font-medium flex items-center">
                <Check className="h-3 w-3 mr-1" />
                Watched
              </p>
            </div>
          )}
        </div>
      </Card>
      
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
              <label className="text-sm font-medium">Your Rating</label>
              <Rating
                value={personalRating}
                onChange={setPersonalRating}
                max={5}
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
