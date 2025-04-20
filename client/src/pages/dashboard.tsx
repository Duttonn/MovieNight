import { useState, useEffect } from "react";
import { getCurrentUser } from "@/hooks/use-auth";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import UpcomingMovieNight from "@/components/dashboard/upcoming-movie-night";
import WeeklyPick from "@/components/dashboard/weekly-pick";
import MovieSuggestions from "@/components/dashboard/movie-suggestions";
import MyGroups from "@/components/dashboard/my-groups";
import FriendRequests from "@/components/dashboard/friend-requests";
import { Loader2 } from "lucide-react";
import { User } from "@shared/schema";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) return null;

  const userName = user.name || user.username;

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 flex items-center h-16 px-4 border-b border-border bg-card md:hidden">
        <h1 className="ml-4 text-xl font-bold text-primary">Movie Night</h1>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 pb-24 md:pb-12">
        <div className="pb-12 space-y-6">
          <DashboardHeader userName={userName} />
          <UpcomingMovieNight />
          <WeeklyPick />
          <MovieSuggestions />
          <MyGroups />
          <FriendRequests />
        </div>
      </main>
    </>
  );
}
