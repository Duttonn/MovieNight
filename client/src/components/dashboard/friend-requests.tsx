import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type User = {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
};

type FriendRequest = {
  id: number;
  from: User;
  createdAt: string;
};

export default function FriendRequests() {
  const { toast } = useToast();
  
  const { data: friendRequests, isLoading } = useQuery<FriendRequest[]>({
    queryKey: ["/api/friends/requests"],
  });
  
  const respondMutation = useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: number; accept: boolean }) => {
      await apiRequest("PATCH", `/api/friends/requests/${requestId}`, { accept });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Success",
        description: "Friend request processed successfully.",
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
  
  const handleAccept = (requestId: number) => {
    respondMutation.mutate({ requestId, accept: true });
  };
  
  const handleDecline = (requestId: number) => {
    respondMutation.mutate({ requestId, accept: false });
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">Friend Requests</h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full mr-3" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : !friendRequests || friendRequests.length === 0 ? (
          <div className="bg-secondary/20 rounded-lg p-6 text-center">
            <p className="text-muted-foreground mb-2">No pending friend requests.</p>
            <Link href="/friends">
              <Button variant="link" className="text-primary">
                Find friends to connect with
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {friendRequests.map((request) => (
              <div 
                key={request.id} 
                className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border"
              >
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage 
                      src={request.from.avatar} 
                      alt={request.from.name || request.from.username} 
                    />
                    <AvatarFallback>
                      {(request.from.name || request.from.username).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">
                      {request.from.name || request.from.username}
                    </div>
                    {request.from.name && (
                      <div className="text-xs text-muted-foreground">
                        @{request.from.username}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleAccept(request.id)}
                    disabled={respondMutation.isPending}
                  >
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-red-600 text-red-600 hover:bg-red-900/10"
                    onClick={() => handleDecline(request.id)}
                    disabled={respondMutation.isPending}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
