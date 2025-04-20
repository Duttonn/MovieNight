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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
}

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
  
  // Fetch the group data
  const { data: group, isLoading, isError } = useQuery({
    queryKey: ["/api/groups", groupId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/groups/${groupId}`);
      return await res.json();
    },
    enabled: open && !!groupId,
  });
  
  const form = useForm<EditGroupFormValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: "",
      scheduleType: "recurring",
      scheduleDay: 5, // Friday by default
      scheduleTime: "19:00", // 7:00 PM by default
    },
  });
  
  // Update form values when group data is loaded
  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
        scheduleType: group.scheduleType,
        scheduleDay: group.scheduleDay,
        scheduleTime: group.scheduleTime,
        scheduleDate: group.scheduleDate ? new Date(group.scheduleDate).toISOString().split('T')[0] : undefined,
        currentProposerIndex: group.currentProposerIndex,
      });
    }
  }, [group, form]);
  
  const watchScheduleType = form.watch("scheduleType");
  
  const updateGroupMutation = useMutation({
    mutationFn: async (values: EditGroupFormValues) => {
      await apiRequest("PATCH", `/api/groups/${groupId}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      toast({
        title: "Group updated",
        description: "Your group has been updated successfully.",
      });
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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