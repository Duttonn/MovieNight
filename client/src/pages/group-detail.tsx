import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Users, Clock, Edit } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { EditGroupDialog } from "@/components/groups/edit-group-dialog"; // Assuming this exists and works

// Types (should match the ones in groups.tsx or be imported)
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

// Helper function (same as in groups.tsx)
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


export default function GroupDetail() {
  const [, params] = useRoute<{ id: string }>("/groups/:id");
  const groupId = params?.id ? parseInt(params.id, 10) : null;
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: group, isLoading, isError, error } = useQuery<Group>({
    queryKey: ["/api/groups", groupId], // Use groupId in queryKey
    queryFn: async () => {
      if (!groupId) throw new Error("Group ID not found");
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch group: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!groupId, // Only run query if groupId is valid
  });

  const handleEditDialogClose = (open: boolean) => {
    setEditDialogOpen(open);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 flex items-center h-16 px-4 border-b border-border bg-card md:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/groups">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold text-primary mx-auto">
          {isLoading ? "Loading..." : group?.name || "Group Details"}
        </h1>
        {/* Optional: Add Edit button here for mobile */}
         {group && (
           <Button variant="ghost" size="icon" onClick={() => setEditDialogOpen(true)}>
             <Edit className="h-5 w-5" />
           </Button>
         )}
      </div>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 pb-24 md:pb-12">
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
              <div className="flex flex-wrap gap-2">
                {[...Array(5)].map((_, j) => (
                  <Skeleton key={j} className="h-16 w-16 rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : isError ? (
          <Card className="text-center p-8">
            <h3 className="text-xl font-semibold mb-4 text-destructive">Error Loading Group</h3>
            <p className="text-muted-foreground mb-6">
              Could not load details for this group. {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <Button asChild variant="secondary">
              <Link href="/groups">Back to Groups</Link>
            </Button>
          </Card>
        ) : !group ? (
           <Card className="text-center p-8">
            <h3 className="text-xl font-semibold mb-4">Group Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The group you are looking for does not exist or could not be loaded.
            </p>
            <Button asChild variant="secondary">
              <Link href="/groups">Back to Groups</Link>
            </Button>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-4 mb-1">
                     <Button variant="ghost" size="icon" className="hidden md:inline-flex" asChild>
                       <Link href="/groups">
                         <ArrowLeft className="h-5 w-5" />
                       </Link>
                     </Button>
                    <CardTitle className="text-2xl">{group.name}</CardTitle>
                    <Badge variant="outline" className="bg-primary/20 text-primary">
                      {group.scheduleType === "recurring" ? "Weekly" : "One-time"}
                    </Badge>
                  </div>
                   <CardDescription className="md:ml-14">Details and members of your movie group.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setEditDialogOpen(true)} className="w-full md:w-auto">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Group
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Schedule Info */}
              <div className="flex items-center text-sm text-muted-foreground gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{formatSchedule(group)}</span>
              </div>

              {/* Last Watched Info */}
              {group.lastMovieNight && (
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Last watched: {new Date(group.lastMovieNight).toLocaleDateString()}</span>
                </div>
              )}

              {/* Members Section */}
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                   <Users className="h-5 w-5 text-primary" />
                   Members ({group.members.length})
                 </h4>
                <div className="flex flex-wrap gap-4">
                  {group.members.map((member) => (
                    <div key={member.id} className="flex flex-col items-center gap-1 w-20 text-center">
                      <Avatar className="h-12 w-12 border-2 border-card">
                        <AvatarImage
                          src={member.avatar}
                          alt={member.name || member.username}
                        />
                        <AvatarFallback>
                          {(member.name || member.username).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate w-full" title={member.name || member.username}>
                        {member.name || member.username}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TODO: Add Movie History/Suggestions for this group? */}

            </CardContent>
          </Card>
        )}
      </main>

       {/* Edit Dialog */}
       {groupId !== null && (
        <EditGroupDialog
          open={editDialogOpen}
          onOpenChange={handleEditDialogClose}
          groupId={groupId}
        />
      )}
    </>
  );
}
