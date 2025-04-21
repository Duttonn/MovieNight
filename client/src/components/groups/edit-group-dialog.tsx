import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
}

type User = {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
};

type GroupMember = {
  id: number;
  userId: number;
  groupId: number;
};

const editGroupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters"),
  scheduleType: z.enum(["recurring", "oneoff"]),
  scheduleDay: z.number().optional(),
  scheduleTime: z.string(),
  scheduleDate: z.string().optional(),
  currentProposerIndex: z.number().optional(),
});

type EditGroupFormValues = z.infer<typeof editGroupSchema>;

export function EditGroupDialog({ open, onOpenChange, groupId }: EditGroupDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  // Added state to track original friends before edits
  const [originalFriends, setOriginalFriends] = useState<User[]>([]);
  
  // Fetch the current user ID for filtering members
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (open) {
        try {
          const response = await fetch('/api/user', { credentials: 'include' });
          if (response.ok) {
            const user = await response.json();
            setCurrentUserId(user.id);
          } else {
            console.error("Failed to fetch current user");
          }
        } catch (error) {
          console.error("Error fetching current user:", error);
        }
      }
    };
    fetchCurrentUser();
  }, [open]);
  
  // Fetch the group data
  const { data: group, isLoading, isError } = useQuery({
    queryKey: ["/api/groups", groupId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/groups/${groupId}`);
      return await res.json();
    },
    enabled: open && !!groupId,
  });

  // Fetch friends for selection
  const { data: friends } = useQuery<User[]>({
    queryKey: ["/api/friends"],
    enabled: open,
  });
  
  const form = useForm<EditGroupFormValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: "",
      scheduleType: "recurring",
      scheduleDay: 5, // Friday by default
      scheduleTime: "19:00", // 7:00 PM by default
      scheduleDate: "", // Initialize with empty string instead of undefined
      currentProposerIndex: 0, // Initialize with 0 instead of undefined
    },
  });
  
  // Update form values and selected friends when group data is loaded
  useEffect(() => {
    if (group && currentUserId !== null) {
      form.reset({
        name: group.name,
        scheduleType: group.scheduleType,
        scheduleDay: group.scheduleDay,
        scheduleTime: group.scheduleTime,
        scheduleDate: group.scheduleDate ? new Date(group.scheduleDate).toISOString().split('T')[0] : "",
        currentProposerIndex: group.currentProposerIndex || 0,
      });
      
      // Filter out the current user
      const filteredMembers = group.members.filter(member => member.id !== currentUserId);
      // Store both the current selection and original selection
      setSelectedFriends(filteredMembers);
      setOriginalFriends(filteredMembers);
    }
  }, [group, form, currentUserId]);
  
  // Handle dialog close and reset
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset to original state when closing without saving
      setSearchQuery("");
      if (originalFriends.length > 0) {
        setSelectedFriends([...originalFriends]);
      }
      // Let parent component know dialog is closed
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };
  
  const watchScheduleType = form.watch("scheduleType");
  
  // Filter friends for search results (exclude already selected and current user)
  const filteredFriends = friends?.filter(
    friend => 
      !selectedFriends.some(selected => selected.id === friend.id) &&
      friend.id !== currentUserId &&
      (friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       friend.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const updateGroupMutation = useMutation({
    mutationFn: async (values: EditGroupFormValues) => {
      const memberIds = selectedFriends.map(friend => friend.id);
      
      const payload = {
        ...values,
        memberIds
      };
      
      await apiRequest("PATCH", `/api/groups/${groupId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      toast({
        title: "Group updated",
        description: "Your group has been updated successfully.",
      });
      // Update original friends to match current selection when saved successfully
      setOriginalFriends([...selectedFriends]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating group",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: EditGroupFormValues) {
    updateGroupMutation.mutate(values);
  }
  
  const addFriend = (friend: User) => {
    setSelectedFriends([...selectedFriends, friend]);
    setSearchQuery("");
  };
  
  const removeFriend = (friendId: number) => {
    setSelectedFriends(selectedFriends.filter(friend => friend.id !== friendId));
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Movie Night Group</DialogTitle>
          <DialogDescription>
            Update the details for your movie night group.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center py-6">
            <p className="text-destructive mb-4">Error loading group details.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Friday Night Movies" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Group Members Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Group Members</h3>
                  
                  {/* Selected friends */}
                  {selectedFriends.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedFriends.map(friend => (
                        <Badge 
                          key={friend.id} 
                          variant="secondary"
                          className="flex items-center gap-1 pl-1"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage 
                              src={friend.avatar} 
                              alt={friend.name || friend.username} 
                            />
                            <AvatarFallback className="text-[10px]">
                              {(friend.name || friend.username).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{friend.name || friend.username}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 ml-1"
                            onClick={() => removeFriend(friend.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search friends to add..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {/* Search results */}
                  {searchQuery && filteredFriends && filteredFriends.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-md p-1 bg-background">
                      {filteredFriends.map(friend => (
                        <div 
                          key={friend.id}
                          className="flex items-center p-2 hover:bg-secondary rounded cursor-pointer"
                          onClick={() => addFriend(friend)}
                        >
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage 
                              src={friend.avatar} 
                              alt={friend.name || friend.username} 
                            />
                            <AvatarFallback>
                              {(friend.name || friend.username).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">
                              {friend.name || friend.username}
                            </div>
                            {friend.name && (
                              <div className="text-xs text-muted-foreground">
                                @{friend.username}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {searchQuery && (!filteredFriends || filteredFriends.length === 0) && (
                    <div className="mt-2 p-2 text-sm text-muted-foreground">
                      No friends found matching your search.
                    </div>
                  )}
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="scheduleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule Type</FormLabel>
                    <FormControl>
                      <RadioGroup 
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="recurring" id="recurring" />
                          <Label htmlFor="recurring">Weekly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="oneoff" id="oneoff" />
                          <Label htmlFor="oneoff">One-time</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {watchScheduleType === "recurring" ? (
                <FormField
                  control={form.control}
                  name="scheduleDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of the Week</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="scheduleDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="scheduleTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currentProposerIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Proposer Position</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                  disabled={updateGroupMutation.isPending}
                >
                  {updateGroupMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}