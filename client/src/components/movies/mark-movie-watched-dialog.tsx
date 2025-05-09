import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";

interface MarkMovieWatchedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movie: {
    id: number;
    title: string;
    notes?: string;
    personalRating?: number;
    groupId: number;
  } | null;
}

export function MarkMovieWatchedDialog({
  open,
  onOpenChange,
  movie
}: MarkMovieWatchedDialogProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(movie?.notes || "");
  const [personalRating, setPersonalRating] = useState(movie?.personalRating || 4);
  
  // Reset form values when movie changes
  useState(() => {
    if (movie) {
      setNotes(movie.notes || "");
      setPersonalRating(movie.personalRating || 4);
    }
  });
  
  const watchMutation = useMutation({
    mutationFn: async ({ movieId, notes, personalRating }: { movieId: number, notes: string, personalRating: number }) => {
      await apiRequest("PATCH", `/api/movies/${movieId}/watch`, { notes, personalRating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      queryClient.invalidateQueries({ queryKey: ["movies", movie?.groupId] });
      onOpenChange(false);
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
  
  const handleWatched = () => {
    if (!movie) return;
    
    watchMutation.mutate({
      movieId: movie.id,
      notes,
      personalRating
    });
  };

  if (!movie) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <div className="text-xs text-muted-foreground mt-1">
              {personalRating === 1 && "Poor - I didn't enjoy it"}
              {personalRating === 2 && "Below average - Somewhat disappointing"}
              {personalRating === 3 && "Average - It was okay"}
              {personalRating === 4 && "Good - I enjoyed it"}
              {personalRating === 5 && "Excellent - Loved it!"}
            </div>
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
            {watchMutation.isPending ? "Saving..." : "Mark as Watched"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}