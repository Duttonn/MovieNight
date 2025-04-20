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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, X } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type User = {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
};

export function AddFriendDialog({ open, onOpenChange }: AddFriendDialogProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  // Debounce search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, 300);
    
    setSearchTimeout(timeout);
  };
  
  // Query for user search
  const {
    data: searchResults,
    isLoading: isSearching,
    isError: isSearchError
  } = useQuery<User[]>({
    queryKey: ["/api/users/search", debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) return [];
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(debouncedSearchTerm)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search users");
      return res.json();
    },
    enabled: debouncedSearchTerm.length >= 2,
  });
  
  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (username: string) => {
      await apiRequest("POST", "/api/friends/requests", { username });
    },
    onSuccess: () => {
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully.",
      });
      setSearchTerm("");
      setDebouncedSearchTerm("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSendRequest = (username: string) => {
    sendRequestMutation.mutate(username);
  };
  
  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add a Friend</DialogTitle>
          <DialogDescription>
            Search for users by username or name to send them a friend request.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or name..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="min-h-[200px] max-h-[250px] overflow-y-auto border border-border rounded-md">
            {isSearching ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : isSearchError ? (
              <div className="flex items-center justify-center h-full text-sm text-destructive">
                An error occurred while searching. Please try again.
              </div>
            ) : !debouncedSearchTerm ? (
              <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p>Search for users by typing their username or name</p>
              </div>
            ) : searchResults?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
                <UserPlus className="h-8 w-8 mb-2 opacity-50" />
                <p>No users found matching "{debouncedSearchTerm}"</p>
              </div>
            ) : (
              <div className="p-1">
                {searchResults?.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-md"
                  >
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage 
                          src={user.avatar} 
                          alt={user.name || user.username} 
                        />
                        <AvatarFallback>
                          {(user.name || user.username).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {user.name || user.username}
                        </div>
                        {user.name && (
                          <div className="text-xs text-muted-foreground">
                            @{user.username}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(user.username)}
                      disabled={sendRequestMutation.isPending}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
