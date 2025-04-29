import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Rating } from "@/components/ui/rating";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type Group = {
  id: number;
  name: string;
};

interface ProposeMovieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle?: string; // Added prop
  tmdbId?: number;       // Added prop
  posterPath?: string | null; // Added prop
}

const proposeMovieSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  groupId: z.string().min(1, "Please select a group"),
  proposalIntent: z.number().min(1).max(4),
  tmdbId: z.number().optional(), // Added field
  posterPath: z.string().optional().nullable(), // Added field
});

type ProposeMovieFormValues = z.infer<typeof proposeMovieSchema>;

export function ProposeMovieDialog({ 
  open, 
  onOpenChange, 
  initialTitle = "", // Default value
  tmdbId, 
  posterPath 
}: ProposeMovieDialogProps) {
  const { toast } = useToast();
  const [proposalIntent, setProposalIntent] = useState(4);
  
  const { data: groups, isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    enabled: open, // Fetch groups whenever the dialog is open
  });
  
  const form = useForm<ProposeMovieFormValues>({
    resolver: zodResolver(proposeMovieSchema),
    // Use props for default values
    defaultValues: {
      title: initialTitle,
      groupId: "",
      proposalIntent: 4,
      tmdbId: tmdbId,
      posterPath: posterPath,
    },
  });

  // Reset form when initialTitle changes (e.g., opening dialog for a different movie)
  useEffect(() => {
    form.reset({
      title: initialTitle,
      groupId: "",
      proposalIntent: 4,
      tmdbId: tmdbId,
      posterPath: posterPath,
    });
    setProposalIntent(4); // Reset rating state as well
  }, [initialTitle, tmdbId, posterPath, form]);
  
  const proposeMutation = useMutation({
    mutationFn: async (values: ProposeMovieFormValues) => {
      // Ensure tmdbId and posterPath are included in the payload
      await apiRequest("POST", "/api/movies", {
        title: values.title,
        groupId: parseInt(values.groupId),
        proposalIntent: values.proposalIntent,
        tmdbId: values.tmdbId,
        posterPath: values.posterPath,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      toast({
        title: "Movie proposed",
        description: "Your movie suggestion has been added successfully.",
      });
      form.reset(); // Reset form on success
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: ProposeMovieFormValues) => {
    // Update the intent value from state before submitting
    values.proposalIntent = proposalIntent;
    proposeMutation.mutate(values);
  };
  
  const handleRatingChange = (value: number) => {
    setProposalIntent(value);
    form.setValue("proposalIntent", value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Propose a Movie</DialogTitle>
          <DialogDescription>
            Suggest a movie for your next movie night. Rate how much you want to watch it.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Movie Title</FormLabel>
                  <FormControl>
                    {/* Make input readOnly if proposing from Discover page */}
                    <Input placeholder="Enter movie title" {...field} readOnly={!!initialTitle} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Group</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} // Use value prop for controlled component
                    disabled={isLoadingGroups || !groups || groups.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingGroups ? "Loading groups..." : "Select a movie night group"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups?.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <Label htmlFor="proposal-intent">How much do you want to watch this movie?</Label>
              <Rating
                value={proposalIntent}
                onChange={handleRatingChange}
                max={4}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {proposalIntent === 1 && "I'm open to it, but not enthusiastic"}
                {proposalIntent === 2 && "I'd like to watch it"}
                {proposalIntent === 3 && "I really want to watch this"}
                {proposalIntent === 4 && "Absolute must-see!"}
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={proposeMutation.isPending}
              >
                {proposeMutation.isPending ? "Submitting..." : "Propose Movie"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
