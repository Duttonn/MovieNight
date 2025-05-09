import { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface ScheduleMovieNightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  currentSchedule?: {
    scheduleType: "recurring" | "oneoff";
    scheduleDay?: number;
    scheduleTime: string;
    scheduleDate?: Date;
  };
}

export function ScheduleMovieNightDialog({
  open,
  onOpenChange,
  groupId,
  currentSchedule,
}: ScheduleMovieNightDialogProps) {
  const { toast } = useToast();
  const [scheduleType, setScheduleType] = useState<"recurring" | "oneoff">(
    currentSchedule?.scheduleType || "recurring"
  );
  const [scheduleDay, setScheduleDay] = useState<number | undefined>(
    currentSchedule?.scheduleDay
  );
  const [scheduleTime, setScheduleTime] = useState(
    currentSchedule?.scheduleTime || "19:00"
  );
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(
    currentSchedule?.scheduleDate ? new Date(currentSchedule.scheduleDate) : undefined
  );

  // Reset form when opening dialog
  useEffect(() => {
    if (open && currentSchedule) {
      setScheduleType(currentSchedule.scheduleType);
      setScheduleDay(currentSchedule.scheduleDay);
      setScheduleTime(currentSchedule.scheduleTime);
      setScheduleDate(
        currentSchedule.scheduleDate ? new Date(currentSchedule.scheduleDate) : undefined
      );
    }
  }, [open, currentSchedule]);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/groups/${groupId}/schedule`, {
        scheduleType,
        scheduleDay: scheduleType === "recurring" ? scheduleDay : undefined,
        scheduleTime,
        scheduleDate: scheduleType === "oneoff" ? scheduleDate : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", groupId] });
      toast({
        title: "Schedule updated",
        description: "Your movie night schedule has been updated.",
      });
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

  const handleScheduleUpdate = () => {
    // Validate form
    if (scheduleType === "recurring" && scheduleDay === undefined) {
      toast({
        title: "Day required",
        description: "Please select a day for recurring movie nights.",
        variant: "destructive",
      });
      return;
    }

    if (scheduleType === "oneoff" && !scheduleDate) {
      toast({
        title: "Date required",
        description: "Please select a date for your movie night.",
        variant: "destructive",
      });
      return;
    }

    scheduleMutation.mutate();
  };

  // Generate time options
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 9; hour <= 23; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMin = min.toString().padStart(2, "0");
        options.push(`${formattedHour}:${formattedMin}`);
      }
    }
    return options;
  };

  const dayOptions = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Movie Night</DialogTitle>
          <DialogDescription>
            Set up a regular schedule or a specific date for your next movie night.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            defaultValue={scheduleType}
            value={scheduleType}
            onValueChange={(value) => setScheduleType(value as "recurring" | "oneoff")}
            className="space-y-3"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="recurring" id="recurring" />
              <div className="grid gap-1.5">
                <Label htmlFor="recurring" className="font-medium">
                  Recurring (Weekly)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Same day and time every week
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="oneoff" id="oneoff" />
              <div className="grid gap-1.5">
                <Label htmlFor="oneoff" className="font-medium">
                  One-time Event
                </Label>
                <p className="text-sm text-muted-foreground">
                  Specific date and time
                </p>
              </div>
            </div>
          </RadioGroup>

          {scheduleType === "recurring" && (
            <div className="space-y-3">
              <Label htmlFor="day">Day of the week</Label>
              <Select
                value={scheduleDay?.toString()}
                onValueChange={(value) => setScheduleDay(parseInt(value))}
              >
                <SelectTrigger id="day">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scheduleType === "oneoff" && (
            <div className="space-y-3">
              <Label>Select Date</Label>
              <div className="border rounded-md p-4">
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                  className="mx-auto"
                />
              </div>
              <div className="text-sm text-center text-muted-foreground">
                {scheduleDate
                  ? `Selected: ${format(scheduleDate, "PPP")}`
                  : "Please select a date"}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="time">Time</Label>
            <Select
              value={scheduleTime}
              onValueChange={setScheduleTime}
            >
              <SelectTrigger id="time">
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {generateTimeOptions().map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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
            onClick={handleScheduleUpdate}
            disabled={scheduleMutation.isPending}
          >
            {scheduleMutation.isPending ? "Saving..." : "Save Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}