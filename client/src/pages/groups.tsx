import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar, Users, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { EditGroupDialog } from "@/components/groups/edit-group-dialog";
import { Link, useRoute } from "wouter";

type GroupMember = {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
};

type Group = {
  id: number;
  name: string;
  scheduleType: "recurring" | "oneoff";
  scheduleDay?: number;
  scheduleTime: string;
  scheduleDate?: Date;
  currentProposerIndex: number;
  lastMovieNight?: Date;
  members: GroupMember[];
};

export default function Groups() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [match, params] = useRoute<{ id: string }>("/groups/:id");
  
  const { data: groups, isLoading, isError } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };

  const formatSchedule = (group: Group) => {
    if (group.scheduleType === "recurring" && group.scheduleDay !== undefined) {
      return `Every ${getDayName(group.scheduleDay)} at ${group.scheduleTime}`;
    } else if (group.scheduleType === "oneoff" && group.scheduleDate) {
      return `${new Date(group.scheduleDate).toLocaleDateString()} at ${group.scheduleTime}`;
    }
    return `At ${group.scheduleTime}`;
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b border-border bg-card md:hidden">
        <h1 className="text-xl font-bold text-primary">Groups</h1>
        <Button variant="ghost" size="icon" onClick={() => setCreateDialogOpen(true)}>
          <PlusCircle className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 pb-24 md:pb-12">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Movie Groups</h1>
            <p className="text-muted-foreground">Manage your movie night groups and schedules</p>
          </div>
          <Button 
            className="flex items-center gap-2"
            onClick={() => setCreateDialogOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Create New Group
          </Button>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex -space-x-2">
                    {[...Array(4)].map((_, j) => (
                      <Skeleton key={j} className="h-8 w-8 rounded-full" />
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-9 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-8">
            <p className="text-destructive">Error loading groups. Please try again.</p>
          </div>
        ) : groups?.length === 0 ? (
          <Card className="mx-auto max-w-md text-center p-8">
            <h3 className="text-xl font-semibold mb-4">No Groups Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first movie night group to start scheduling watch parties with friends.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Create Your First Group
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups?.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{group.name}</span>
                    <Badge variant="outline" className="bg-primary/20 text-primary">
                      {group.scheduleType === "recurring" ? "Weekly" : "One-time"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{formatSchedule(group)}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{group.members.length} members</span>
                  </div>
                  
                  {group.lastMovieNight && (
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Last watched: {new Date(group.lastMovieNight).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  <div className="flex -space-x-2 overflow-hidden">
                    {group.members.slice(0, 4).map((member) => (
                      <Avatar key={member.id} className="h-8 w-8 border-2 border-card">
                        <AvatarImage 
                          src={member.avatar} 
                          alt={member.name || member.username} 
                        />
                        <AvatarFallback>
                          {(member.name || member.username).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {group.members.length > 4 && (
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-xs font-medium text-foreground border-2 border-card">
                        +{group.members.length - 4}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      asChild
                    >
                      <Link href={`/groups/${group.id}`}>View</Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        setEditDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      <CreateGroupDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      
      {selectedGroupId && (
        <EditGroupDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          groupId={selectedGroupId}
        />
      )}
    </>
  );
}
