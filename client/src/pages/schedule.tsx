import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, CalendarClock, Check } from "lucide-react";
import { format, addDays, getDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Schedule() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<"one-time" | "recurring">("one-time");
  const [movieNightName, setMovieNightName] = useState("");
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogDefaults, setCreateDialogDefaults] = useState<any>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Sample movie nights data - in a real app this would come from an API
  const [movieNights, setMovieNights] = useState<Array<{
    id: string;
    name: string;
    date?: Date;
    dayOfWeek?: number;
    time: string;
    type: "one-time" | "recurring";
    votes?: number;
  }>>([
    {
      id: "1",
      name: "Marvel Marathon",
      date: addDays(new Date(), 3),
      time: "19:00",
      type: "one-time",
      votes: 5
    },
    {
      id: "2",
      name: "Weekly Horror Night",
      dayOfWeek: 5, // Friday
      time: "20:30",
      type: "recurring",
      votes: 8
    }
  ]);

  useEffect(() => {
    if (!calendarRef.current) return;
    // Find header cells (Su, Mo, Tu, etc.)
    const headerCells = calendarRef.current.querySelectorAll('thead tr th');
    headerCells.forEach((cell, idx) => {
      cell.style.cursor = 'pointer';
      cell.onclick = () => handleDayHeaderClick(idx);
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('aria-label', `Schedule recurring movie night for ${DAYS_OF_WEEK[idx]}`);
    });
    // Cleanup
    return () => {
      headerCells.forEach(cell => {
        cell.onclick = null;
      });
    };
  }, [calendarRef.current]);

  // Function to handle calendar date click
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCreateDialogDefaults({
        scheduleType: "oneoff",
        scheduleDate: date,
        scheduleDay: undefined,
      });
      setCreateDialogOpen(true);
    }
  };

  // Function to handle day of week header click
  const handleDayHeaderClick = (dayIndex: number) => {
    setCreateDialogDefaults({
      scheduleType: "recurring",
      scheduleDay: dayIndex,
      scheduleDate: undefined,
    });
    setCreateDialogOpen(true);
  };

  // Function to create a new movie night
  const handleCreateMovieNight = () => {
    if (!movieNightName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a name for your movie night.",
        variant: "destructive"
      });
      return;
    }

    const newMovieNight: {
      id: string;
      name: string;
      date?: Date;
      dayOfWeek?: number;
      time: string;
      type: "one-time" | "recurring";
      votes: number;
    } = {
      id: Date.now().toString(),
      name: movieNightName,
      time: selectedTime,
      type: scheduleType,
      votes: 0
    };

    if (scheduleType === "one-time" && selectedDate) {
      newMovieNight.date = selectedDate;
    } else if (scheduleType === "recurring" && selectedDayOfWeek !== null) {
      newMovieNight.dayOfWeek = selectedDayOfWeek;
    }

    setMovieNights([...movieNights, newMovieNight]);
    setIsCreateDialogOpen(false);
    setMovieNightName("");

    toast({
      title: "Movie night created!",
      description: `Your ${scheduleType} movie night has been scheduled.`,
      variant: "default"
    });
  };

  // Function to render calendar day contents with indicators for scheduled movie nights
  const renderCalendarDay = (day: Date, modifiers: any) => {
    const dateString = format(day, "yyyy-MM-dd");
    const hasMovieNight = movieNights.some(mn =>
      mn.type === "one-time" && mn.date && format(mn.date, "yyyy-MM-dd") === dateString ||
      mn.type === "recurring" && mn.dayOfWeek === getDay(day)
    );
    return (
      <button
        type="button"
        tabIndex={0}
        className={
          `relative w-full h-full flex items-center justify-center rounded transition-colors ` +
          `hover:bg-accent focus:bg-accent cursor-pointer select-none outline-none`
        }
        style={{ minHeight: 40 }}
        onClick={e => {
          e.stopPropagation();
          handleDateSelect(day);
        }}
        aria-label={`Schedule movie night for ${format(day, 'PPP')}`}
      >
        {day.getDate()}
        {hasMovieNight && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
          </div>
        )}
      </button>
    );
  };

  // Calculate the upcoming movie nights
  const upcomingMovieNights = [...movieNights].sort((a, b) => {
    // For one-time events, sort by date
    if (a.type === "one-time" && b.type === "one-time" && a.date && b.date) {
      return a.date.getTime() - b.date.getTime();
    }

    // One-time events come before recurring
    if (a.type === "one-time" && b.type === "recurring") return -1;
    if (a.type === "recurring" && b.type === "one-time") return 1;

    // For recurring events, sort by day of week
    if (a.dayOfWeek !== undefined && b.dayOfWeek !== undefined) {
      const today = getDay(new Date());
      const aDiff = (a.dayOfWeek - today + 7) % 7;
      const bDiff = (b.dayOfWeek - today + 7) % 7;
      return aDiff - bDiff;
    }

    return 0;
  });

  return (
    <>
      <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 pb-24 md:pb-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Movie Night Scheduling</h1>
          <p className="text-muted-foreground">Schedule and vote for movie nights with your friends</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5" />
                Choose a Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                {/* Calendar Component */}
                <div className="bg-card border border-border rounded-md overflow-hidden" ref={calendarRef}>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    className="w-full max-w-none p-0"
                    classNames={{
                      months: "w-full",
                      month: "w-full",
                      table: "w-full",
                      row: "flex w-full justify-between",
                      cell: "h-14 w-full text-center p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                      day: "h-14 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-none transition-colors",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      head_row: "flex w-full",
                      head_cell: "text-muted-foreground rounded-md w-full font-normal text-sm cursor-pointer py-2 hover:bg-accent transition-colors"
                    }}
                    components={{
                      Day: ({ date, ...props }) => renderCalendarDay(date, props)
                    }}
                  />
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Scheduled movie night</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Click on a day to schedule a one-time movie night</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarClock className="h-4 w-4" />
                    <span>Click on day names for weekly events</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Movie Nights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarClock className="mr-2 h-5 w-5" />
                Upcoming Movie Nights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingMovieNights.length === 0 ? (
                  <p className="text-center text-muted-foreground p-4">
                    No movie nights scheduled yet. Create one by selecting a date on the calendar.
                  </p>
                ) : (
                  upcomingMovieNights.map(movieNight => (
                    <div
                      key={movieNight.id}
                      className="p-3 rounded-lg border border-border bg-card hover:bg-accent/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{movieNight.name}</h3>
                          <div className="text-sm text-muted-foreground mt-1">
                            {movieNight.type === "one-time" && movieNight.date ? (
                              <>
                                <span>{format(movieNight.date, "MMM d, yyyy")}</span>
                                <span className="mx-1">•</span>
                              </>
                            ) : movieNight.dayOfWeek !== undefined ? (
                              <>
                                <span>Every {DAYS_OF_WEEK[movieNight.dayOfWeek]}</span>
                                <span className="mx-1">•</span>
                              </>
                            ) : null}
                            <span>at {movieNight.time}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {movieNight.votes} votes
                        </Badge>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="secondary" size="sm" className="w-full">
                          Vote
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <CreateGroupDialog
          key={JSON.stringify(createDialogDefaults)}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          groupToEdit={undefined}
          initialValues={createDialogDefaults}
          onGroupCreated={(group) => {
            // Add the new group to movieNights for instant yellow dot update
            if (group) {
              setMovieNights((prev) => [
                ...prev,
                {
                  id: group.id,
                  name: group.name,
                  date: group.scheduleType === 'oneoff' && group.scheduleDate ? new Date(group.scheduleDate) : undefined,
                  dayOfWeek: group.scheduleType === 'recurring' ? group.scheduleDay : undefined,
                  time: group.scheduleTime,
                  type: group.scheduleType === 'oneoff' ? 'one-time' : 'recurring',
                  votes: 0
                }
              ]);
            }
          }}
        />
      </main>

      {/* Create Movie Night Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {scheduleType === "one-time" ? "Schedule One-Time Movie Night" : "Schedule Recurring Movie Night"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Movie Night Name</Label>
              <Input
                id="name"
                placeholder="e.g., Marvel Marathon, Sci-Fi Friday"
                value={movieNightName}
                onChange={(e) => setMovieNightName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Movie Night Type</Label>
              <RadioGroup
                value={scheduleType}
                onValueChange={(value) => setScheduleType(value as "one-time" | "recurring")}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one-time" id="one-time" />
                  <Label htmlFor="one-time" className="cursor-pointer">
                    One-time event
                    {selectedDate && <span className="ml-2 text-muted-foreground">({format(selectedDate, "MMM d, yyyy")})</span>}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurring" id="recurring" />
                  <Label htmlFor="recurring" className="cursor-pointer">
                    Weekly recurring
                    {selectedDayOfWeek !== null && (
                      <span className="ml-2 text-muted-foreground">(Every {DAYS_OF_WEEK[selectedDayOfWeek]})</span>
                    )}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Start Time</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateMovieNight}>Create Movie Night</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}