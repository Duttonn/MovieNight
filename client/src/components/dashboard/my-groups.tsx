import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { EditGroupDialog } from "@/components/groups/edit-group-dialog";
import { PlusCircle } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
  scheduleDate?: string;
  members: GroupMember[];
};

export default function MyGroups() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });
  
  // Handle opening edit dialog
  const handleEditGroup = (groupId: number) => {
    setSelectedGroupId(groupId);
    setEditDialogOpen(true);
  };
  
  // Handle closing edit dialog
  const handleEditDialogClose = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      // Optional: set a slight delay before clearing the ID to ensure
      // the dialog transitions out smoothly
      setTimeout(() => setSelectedGroupId(null), 300);
    }
  };
  
  const formatSchedule = (group: Group) => {
    if (group.scheduleType === "recurring" && group.scheduleDay !== undefined) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `Every ${days[group.scheduleDay]} at ${group.scheduleTime}`;
    } else if (group.scheduleType === "oneoff" && group.scheduleDate) {
      const date = new Date(group.scheduleDate);
      return `${date.toLocaleDateString()} at ${group.scheduleTime}`;
    }
    return `At ${group.scheduleTime}`;
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">My Groups</h3>
          <Button
            size="sm"
            className="inline-flex items-center text-secondary-foreground bg-primary hover:bg-primary/90"
            onClick={() => setCreateDialogOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            New Group
          </Button>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-secondary/20 p-4 rounded-lg border border-border">
                <div className="flex justify-between mb-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full mb-3" />
                <div className="flex -space-x-2 overflow-hidden mb-4">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-6 w-6 rounded-full" />
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="bg-secondary/20 rounded-lg p-6 text-center">
            <p className="text-muted-foreground mb-4">You don't have any groups yet.</p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create Your First Group
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <div key={group.id} className="bg-secondary/20 p-4 rounded-lg border border-border">
                <div className="flex justify-between mb-3">
                  <h4 className="font-semibold">{group.name}</h4>
                  <Badge variant="outline" className="bg-primary/20 text-primary">
                    {group.scheduleType === "recurring" ? "Weekly" : "One-time"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {formatSchedule(group)}
                </div>
                <div className="flex -space-x-2 overflow-hidden mb-4">
                  {group.members.slice(0, 4).map((member) => (
                    <Avatar key={member.id} className="h-6 w-6 border-2 border-card">
                      <AvatarImage src={member.avatar} alt={member.name || member.username} />
                      <AvatarFallback>
                        {(member.name || member.username).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {group.members.length > 4 && (
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-secondary text-xs font-medium border-2 border-card">
                      +{group.members.length - 4}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Link href={`/groups/${group.id}`}>
                    <Button variant="secondary" size="sm">View</Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditGroup(group.id)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <CreateGroupDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      
      {selectedGroupId !== null && (
        <EditGroupDialog
          open={editDialogOpen}
          onOpenChange={handleEditDialogClose}
          groupId={selectedGroupId}
        />
      )}
    </div>
  );
}
