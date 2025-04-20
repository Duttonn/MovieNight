import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCurrentUser } from "@/hooks/use-auth";

type User = {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
};

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
  members: GroupMember[];
};

type NextMovieNight = {
  date: string;
  proposer: User;
};

export default function UpcomingMovieNight() {
  const [user, setUser] = useState<any>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  
  // Fetch user data directly
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsUserLoading(false);
      }
    };
    
    loadUser();
  }, []);
  
  // First get the user's groups
  const { data: groups, isLoading: isGroupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    enabled: !!user && !isUserLoading,
  });
  
  // Get the next movie night for the first group (in a real app, you might want to sort by date)
  const { data: nextNight, isLoading: isNextNightLoading } = useQuery<NextMovieNight>({
    queryKey: ["/api/groups", groups?.[0]?.id, "next-movie-night"],
    enabled: !!groups && groups.length > 0,
  });
  
  const isLoading = isUserLoading || isGroupsLoading || isNextNightLoading;
  const hasData = groups && groups.length > 0 && nextNight;
  
  // Format the date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };
  
  // Format the time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (!user && !isUserLoading) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">Upcoming Movie Night</h3>
        
        {isLoading ? (
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
            <div className="flex-1 bg-secondary/20 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <Calendar className="h-5 w-5 text-primary mr-2" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="flex items-center mb-4">
                <Clock className="h-5 w-5 text-primary mr-2" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex items-center">
                <UserCircle className="h-5 w-5 text-primary mr-2" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
            <div className="flex-1 bg-secondary/20 rounded-lg p-4">
              <Skeleton className="h-6 w-36 mb-2" />
              <div className="flex flex-wrap gap-2 mb-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex -space-x-2 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-8 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        ) : !hasData ? (
          <div className="bg-secondary/20 rounded-lg p-6 text-center">
            <p className="text-muted-foreground mb-2">No upcoming movie nights scheduled.</p>
            <p className="text-sm">Create a group and schedule your first movie night!</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
            <div className="flex-1 bg-secondary/20 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <Calendar className="h-5 w-5 text-primary mr-2" />
                <span className="font-semibold">{nextNight?.date ? formatDate(nextNight.date) : 'Date not set'}</span>
              </div>
              <div className="flex items-center mb-4">
                <Clock className="h-5 w-5 text-primary mr-2" />
                <span className="font-semibold">{nextNight?.date ? formatTime(nextNight.date) : 'Time not set'}</span>
              </div>
              <div className="flex items-center">
                <UserCircle className="h-5 w-5 text-primary mr-2" />
                <span className="font-semibold">
                  Movie Proposer: <span className="text-primary">
                    {nextNight?.proposer ? (nextNight.proposer.name || nextNight.proposer.username || 'Unknown user') : 'Not assigned'}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex-1 bg-secondary/20 rounded-lg p-4">
              {groups && groups.length > 0 ? (
                <>
                  <div className="text-lg font-semibold mb-2">{groups[0].name}</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                      {groups[0].members?.length || 0} members
                    </div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                      {groups[0].scheduleType === "recurring" ? "Weekly" : "One-time"}
                    </div>
                  </div>
                  <div className="flex -space-x-2 overflow-hidden">
                    {groups[0].members && groups[0].members.slice(0, 4).map((member) => (
                      <Avatar key={member.id} className="h-8 w-8 border-2 border-card">
                        <AvatarImage src={member.avatar} alt={member.name || member.username || 'User'} />
                        <AvatarFallback>
                          {member && ((member.name || member.username) || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {groups[0].members && groups[0].members.length > 4 && (
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-xs font-medium border-2 border-card">
                        +{groups[0].members.length - 4}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No group information available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
