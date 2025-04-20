import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, UserPlus, UserCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AddFriendDialog } from "@/components/friends/add-friend-dialog";
import { InviteToGroupDialog } from "@/components/friends/invite-to-group-dialog";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function Friends() {
  const [addFriendDialogOpen, setAddFriendDialogOpen] = useState(false);
  const [inviteToGroupDialogOpen, setInviteToGroupDialogOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  const { data: friends, isLoading: isFriendsLoading } = useQuery<User[]>({
    queryKey: ["/api/friends"],
  });

  const { data: friendRequests, isLoading: isRequestsLoading } = useQuery<FriendRequest[]>({
    queryKey: ["/api/friends/requests"],
  });

  // Accept friend request mutation
  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PATCH", `/api/friends/requests/${requestId}`, { 
        status: "accepted" 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({
        title: "Friend request accepted",
        description: "You are now friends with this user.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error accepting friend request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Decline friend request mutation
  const declineRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PATCH", `/api/friends/requests/${requestId}`, { 
        status: "declined" 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({
        title: "Friend request declined",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error declining friend request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAcceptRequest = (requestId: number) => {
    acceptRequestMutation.mutate(requestId);
  };

  const handleDeclineRequest = (requestId: number) => {
    declineRequestMutation.mutate(requestId);
  };

  // Filter friends based on search query
  const filteredFriends = friends?.filter(friend => 
    (friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b border-border bg-card md:hidden">
        <h1 className="text-xl font-bold text-primary">Friends</h1>
        <Button variant="ghost" size="icon" onClick={() => setAddFriendDialogOpen(true)}>
          <UserPlus className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 pb-24 md:pb-12">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Friends</h1>
            <p className="text-muted-foreground">Manage your friends for movie night groups</p>
          </div>
          <Button 
            className="flex items-center gap-2"
            onClick={() => setAddFriendDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Add Friend
          </Button>
        </div>
        
        <Tabs defaultValue="friends">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <TabsList>
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span>My Friends</span>
                {friends && friends.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                    {friends.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Friend Requests</span>
                {friendRequests && friendRequests.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                    {friendRequests.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <TabsContent value="friends">
            <Card>
              <CardHeader>
                <CardTitle>My Friends</CardTitle>
              </CardHeader>
              <CardContent>
                {isFriendsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                        <div className="flex items-center">
                          <Skeleton className="h-10 w-10 rounded-full mr-3" />
                          <div>
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24 mt-1" />
                          </div>
                        </div>
                        <Skeleton className="h-9 w-20" />
                      </div>
                    ))}
                  </div>
                ) : !friends || filteredFriends?.length === 0 ? (
                  <div className="text-center py-8">
                    {searchQuery ? (
                      <p className="text-muted-foreground">No friends match your search</p>
                    ) : (
                      <>
                        <p className="text-muted-foreground mb-4">You don't have any friends yet</p>
                        <Button onClick={() => setAddFriendDialogOpen(true)}>
                          Find Friends
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredFriends?.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={friend.avatar} alt={friend.name || friend.username} />
                            <AvatarFallback>
                              {(friend.name || friend.username).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{friend.name || friend.username}</div>
                            {friend.name && (
                              <div className="text-xs text-muted-foreground">@{friend.username}</div>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedFriend(friend);
                            setInviteToGroupDialogOpen(true);
                          }}
                        >
                          Invite to Group
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Friend Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {isRequestsLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                        <div className="flex items-center">
                          <Skeleton className="h-10 w-10 rounded-full mr-3" />
                          <div>
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24 mt-1" />
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
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">You don't have any pending friend requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={request.from.avatar} alt={request.from.name || request.from.username} />
                            <AvatarFallback>
                              {(request.from.name || request.from.username).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{request.from.name || request.from.username}</div>
                            {request.from.name && (
                              <div className="text-xs text-muted-foreground">@{request.from.username}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={acceptRequestMutation.isPending}
                          >
                            {acceptRequestMutation.isPending && acceptRequestMutation.variables === request.id ? 'Accepting...' : 'Accept'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-red-600 text-red-600 hover:bg-red-900/10"
                            onClick={() => handleDeclineRequest(request.id)}
                            disabled={declineRequestMutation.isPending}
                          >
                            {declineRequestMutation.isPending && declineRequestMutation.variables === request.id ? 'Declining...' : 'Decline'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <AddFriendDialog 
        open={addFriendDialogOpen}
        onOpenChange={setAddFriendDialogOpen}
      />

      {selectedFriend && (
        <InviteToGroupDialog
          open={inviteToGroupDialogOpen}
          onOpenChange={setInviteToGroupDialogOpen}
          friendId={selectedFriend.id}
          friendName={selectedFriend.name || selectedFriend.username}
        />
      )}
    </>
  );
}
