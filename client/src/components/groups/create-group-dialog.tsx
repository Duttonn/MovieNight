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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Group } from "@shared/schema"; // Assuming Group type is exported from schema

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupToEdit?: Group & { members: User[] };
  initialValues?: Partial<GroupFormValues>;
  onGroupCreated?: (group: any) => void; // <-- add this
}

type User = {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
};

const groupSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name is too long"),
  scheduleType: z.enum(["recurring", "oneoff"]),
  scheduleDay: z.number().optional(),
  scheduleTime: z.string().min(1, "Time is required"),
  scheduleDate: z.date().optional(),
});

type GroupFormValues = z.infer<typeof groupSchema>;

export function CreateGroupDialog({ open, onOpenChange, groupToEdit, initialValues, onGroupCreated }: CreateGroupDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const isEditMode = !!groupToEdit;

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    // Default values are set in useEffect if editing
  });

  // Fetch current user ID when dialog opens in edit mode
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (isEditMode && open) {
        try {
          const response = await fetch('/api/user', { credentials: 'include' });
          if (response.ok) {
            const user = await response.json();
            setCurrentUserId(user.id);
          } else {
            console.error("Failed to fetch current user for edit mode");
          }
        } catch (error) {
          console.error("Error fetching current user:", error);
        }
      }
    };
    fetchCurrentUser();
  }, [isEditMode, open]);

  // Reset form and selected friends based on mode and current user ID
  useEffect(() => {
    if (open) {
      if (isEditMode && groupToEdit && currentUserId !== null) {
        form.reset({
          name: groupToEdit.name,
          scheduleType: groupToEdit.scheduleType,
          scheduleDay: groupToEdit.scheduleDay ?? undefined,
          scheduleTime: groupToEdit.scheduleTime,
          scheduleDate: groupToEdit.scheduleDate ? new Date(groupToEdit.scheduleDate) : undefined,
        });
        setSelectedFriends(groupToEdit.members.filter(member => member.id !== currentUserId));
      } else if (!isEditMode) {
        // Use initialValues if provided, otherwise defaults
        form.reset({
          name: "",
          scheduleType: initialValues?.scheduleType ?? "recurring",
          scheduleDay: initialValues?.scheduleDay ?? 5,
          scheduleTime: initialValues?.scheduleTime ?? "19:30",
          scheduleDate: initialValues?.scheduleDate ?? undefined,
        });
        setSelectedFriends([]);
      }
      setSearchQuery("");
    } else {
      setCurrentUserId(null);
    }
  }, [open, isEditMode, groupToEdit, form, currentUserId, initialValues]); // Add initialValues dependency

  const watchScheduleType = form.watch("scheduleType");

  // Fetch friends for selection
  const { data: friends } = useQuery<User[]>({
    queryKey: ["/api/friends"],
    enabled: open,
  });

  // Search results filtered by query and not already selected
  const filteredFriends = friends?.filter(
    friend => 
      !selectedFriends.some(selected => selected.id === friend.id) &&
      (friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       friend.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupMutation = useMutation({
    mutationFn: async (values: GroupFormValues) => {
      const memberIds = selectedFriends.map(friend => friend.id);
      const payload = {
        name: values.name,
        scheduleType: values.scheduleType,
        scheduleDay: values.scheduleType === "recurring" ? values.scheduleDay : undefined,
        scheduleTime: values.scheduleTime,
        scheduleDate: values.scheduleType === "oneoff" && values.scheduleDate 
          ? new Date(values.scheduleDate) 
          : undefined,
        memberIds,
      };
      let createdGroup = null;
      if (isEditMode && groupToEdit) {
        await apiRequest("PATCH", `/api/groups/${groupToEdit.id}`, payload);
      } else {
        createdGroup = await apiRequest("POST", "/api/groups", payload);
      }
      return createdGroup;
    },
    onSuccess: (createdGroup) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: isEditMode ? "Group updated" : "Group created",
        description: `Your movie night group has been ${isEditMode ? 'updated' : 'created'} successfully.`,
      });
      if (!isEditMode) {
        resetForm();
      }
      if (onGroupCreated && createdGroup) {
        onGroupCreated(createdGroup);
      }
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

  const onSubmit = (values: GroupFormValues) => {
    groupMutation.mutate(values);
  };

  const resetForm = () => {
    // Reset logic moved to useEffect
  };

  const addFriend = (friend: User) => {
    setSelectedFriends([...selectedFriends, friend]);
    setSearchQuery("");
  };
  
  const removeFriend = (friendId: number) => {
    setSelectedFriends(selectedFriends.filter(friend => friend.id !== friendId));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // Reset form state when dialog closes, regardless of mode
        form.reset(); 
        setSelectedFriends([]);
        setSearchQuery("");
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Movie Night Group" : "Create Movie Night Group"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update the details for your group." : "Set up a new group for watching movies with friends."}
          </DialogDescription>
        </DialogHeader>
        
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
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Add Friends to Group</h3>
                
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
                    placeholder="Search friends..."
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
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Schedule</h3>
              
              <FormField
                control={form.control}
                name="scheduleType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Schedule Type</FormLabel>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="recurring"
                          checked={field.value === "recurring"}
                          onCheckedChange={() => field.onChange("recurring")}
                        />
                        <label
                          htmlFor="recurring"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Recurring
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="oneoff"
                          checked={field.value === "oneoff"}
                          onCheckedChange={() => field.onChange("oneoff")}
                        />
                        <label
                          htmlFor="oneoff"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          One-time
                        </label>
                      </div>
                    </div>
                  </FormItem>
                )}
              />
              
              {watchScheduleType === "recurring" ? (
                <FormField
                  control={form.control}
                  name="scheduleDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Week</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(Number(value))} 
                        value={field.value?.toString()} // Use value prop
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type="time" 
                          placeholder="Select time" 
                          {...field} 
                        />
                      </FormControl>
                      <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)} // Just close on cancel
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={groupMutation.isPending}
              >
                {groupMutation.isPending ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Group")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
