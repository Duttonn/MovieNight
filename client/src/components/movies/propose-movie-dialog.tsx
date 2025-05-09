import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { searchMovies, type TMDBMovie } from "@/lib/tmdb";
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Film, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
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
    setSearchQuery(initialTitle); // Set search query to initial title
  }, [initialTitle, tmdbId, posterPath, form]);
  
  // Debounced movie search
  useEffect(() => {
    // Skip search if initialTitle is provided (from Discover page)
    if (initialTitle) return;
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await searchMovies(searchQuery);
        setSearchResults(data.results.slice(0, 5)); // Limit to 5 results
      } catch (error) {
        console.error("Movie search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, initialTitle]);
  
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      // Invalidate group-specific movies query if groupId is present
      if (variables && variables.groupId) {
        const groupId = parseInt(variables.groupId);
        if (!isNaN(groupId)) {
          queryClient.invalidateQueries({ queryKey: ["movies", groupId] });
        }
      }
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
  
  const handleSelectMovie = (movie: TMDBMovie) => {
    form.setValue("title", movie.title);
    form.setValue("tmdbId", movie.id);
    form.setValue("posterPath", movie.poster_path);
    setSearchQuery(movie.title);
    setOpenCombobox(false);
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
                <FormItem className="flex flex-col">
                  <FormLabel>Movie Title</FormLabel>
                  <FormControl>
                    {initialTitle ? (
                      // If initialTitle is provided (from Discover), use a simple read-only input
                      <Input placeholder="Enter movie title" {...field} readOnly={true} />
                    ) : (
                      // Otherwise, show the searchable combobox
                      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="justify-between w-full font-normal"
                          >
                            {field.value || "Search for a movie..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[300px]" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Search for a movie..." 
                              value={searchQuery}
                              onValueChange={(value) => {
                                setSearchQuery(value);
                                // Only update form value if user is manually typing
                                if (!searchResults.find(movie => movie.title === value)) {
                                  field.onChange(value);
                                  form.setValue("tmdbId", undefined);
                                  form.setValue("posterPath", null);
                                }
                              }}
                              className="h-9"
                            />
                            <CommandList>
                              {isSearching && (
                                <CommandEmpty>Searching movies...</CommandEmpty>
                              )}
                              {!isSearching && searchQuery.trim().length < 2 && (
                                <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
                              )}
                              {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                                <CommandEmpty>No movies found</CommandEmpty>
                              )}
                              <CommandGroup>
                                {searchResults.map((movie) => (
                                  <CommandItem
                                    key={movie.id}
                                    value={movie.title}
                                    onSelect={() => handleSelectMovie(movie)}
                                    className="flex items-center gap-2"
                                  >
                                    {movie.poster_path ? (
                                      <div className="h-8 w-6 flex-shrink-0 overflow-hidden rounded">
                                        <img 
                                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} 
                                          alt={movie.title}
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <Film className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <div className="flex flex-col">
                                      <span>{movie.title}</span>
                                      {movie.release_date && (
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(movie.release_date).getFullYear()}
                                        </span>
                                      )}
                                    </div>
                                    {field.value === movie.title && (
                                      <Check className="ml-auto h-4 w-4" />
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Show selected movie poster if available */}
            {form.watch("posterPath") && !initialTitle && (
              <div className="flex justify-center">
                <div className="h-40 w-28 overflow-hidden rounded-md border border-border">
                  <img 
                    src={`https://image.tmdb.org/t/p/w185${form.watch("posterPath")}`} 
                    alt={form.watch("title")}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Group</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
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
