import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface InviteToGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendId: number;
  friendName: string;
}

type Group = {
  id: number;
  name: string;
  scheduleType: "recurring" | "oneoff";
  members: any[];
};

export function InviteToGroupDialog({ open, onOpenChange, friendId, friendName }: InviteToGroupDialogProps) {
  const { toast } = useToast();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  
  // Fetch user's groups
  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    enabled: open,
  });
  
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId) {
        throw new Error("Please select a group");
      }
      
      await apiRequest("POST", `/api/groups/${selectedGroupId}/members`, {
        userId: friendId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Invitation sent",
        description: `${friendName} has been added to the group.`,
      });
      onOpenChange(false);
      setSelectedGroupId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleInvite = () => {
    inviteMutation.mutate();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite to Group</DialogTitle>
          <DialogDescription>
            Select a group to add {friendName} to.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">You don't have any groups yet.</p>
            <Button asChild>
              <a href="/groups">Create a Group</a>
            </Button>
          </div>
        ) : (
          <RadioGroup value={selectedGroupId} onValueChange={setSelectedGroupId} className="py-4">
            {groups.map(group => (
              <div key={group.id} className="flex items-center space-x-2 mb-2 p-2 border rounded-md hover:bg-secondary/20">
                <RadioGroupItem value={group.id.toString()} id={`group-${group.id}`} />
                <Label htmlFor={`group-${group.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium">{group.name}</div>
                  <div className="text-xs text-muted-foreground">{group.members.length} members</div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedGroupId("");
            }}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleInvite}
            disabled={!selectedGroupId || inviteMutation.isPending}
          >
            {inviteMutation.isPending ? "Inviting..." : "Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}