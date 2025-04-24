import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser } from "@/hooks/use-auth";
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
}

const proposeMovieSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  groupId: z.string().min(1, "Please select a group"),
  proposalIntent: z.number().min(1).max(4),
});

type ProposeMovieFormValues = z.infer<typeof proposeMovieSchema>;

export function ProposeMovieDialog({ open, onOpenChange }: ProposeMovieDialogProps) {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [proposalIntent, setProposalIntent] = useState(4);
  const [isUserLoading, setIsUserLoading] = useState(true);
  
  // Fetch user data directly instead of using useAuth
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsUserLoading(false);
      }
    };
    
    if (open) {
      loadUser();
    }
  }, [open]);
  
  const { data: groups, isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    enabled: !!user && open && !isUserLoading,
  });
  
  const form = useForm<ProposeMovieFormValues>({
    resolver: zodResolver(proposeMovieSchema),
    defaultValues: {
      title: "",
      groupId: "",
      proposalIntent: 4,
    },
  });
  
  const proposeMutation = useMutation({
    mutationFn: async (values: ProposeMovieFormValues) => {
      await apiRequest("POST", "/api/movies", {
        title: values.title,
        groupId: parseInt(values.groupId),
        proposalIntent: values.proposalIntent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      toast({
        title: "Movie proposed",
        description: "Your movie suggestion has been added successfully.",
      });
      form.reset();
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
    // Update the intent value from state
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
                    <Input placeholder="Enter movie title" {...field} />
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
                    defaultValue={field.value}
                    disabled={isLoadingGroups || !groups || groups.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a movie night group" />
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
