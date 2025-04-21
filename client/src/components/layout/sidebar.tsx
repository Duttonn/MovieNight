import { useLocation } from "wouter";
import { Home, Users, Film, Group, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

export default function Sidebar() {
  const [location] = useLocation();
  
  // Don't show sidebar on auth or username entry pages
  if (location === "/auth" || location === "/username") {
    return null;
  }
  
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // Fetch user data without using hooks
    const fetchUserData = async () => {
      try {
        // Direct fetch call instead of using getCurrentUser
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.status === 401) {
          setUserData(null);
          setIsLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const user = await response.json();
        setUserData(user);
      } catch (e) {
        console.error("Failed to load user data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Function to handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Update local state
        setUserData(null);
        toast({
          title: "Logged out",
          description: "You have been successfully logged out."
        });
        // Redirect to username entry page instead of auth
        window.location.href = '/username';
      } else {
        toast({
          title: "Logout failed",
          description: "There was an error logging out.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out.",
        variant: "destructive"
      });
    }
  };

  // Show loading state while user data is loading
  if (isLoading) {
    return (
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-10">
        <div className="flex flex-col flex-grow border-r border-border bg-card overflow-y-auto">
          <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-border">
            <h1 className="text-xl font-bold text-primary">Movie Night</h1>
          </div>
          <div className="flex-grow flex flex-col">
            <nav className="flex-1 px-2 py-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center px-2 py-2">
                  <Skeleton className="h-5 w-5 mr-3 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-border p-4">
            <div className="flex items-center">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="ml-3">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // No user data is available yet
  if (!userData) return null;

  const user = userData;
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/groups", label: "My Groups", icon: Group },
    { path: "/movies", label: "Movie List", icon: Film },
    { path: "/friends", label: "Friends", icon: Users },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  // Get initials for avatar fallback
  const getInitials = () => {
    if (user.name) {
      return user.name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-10">
      <div className="flex flex-col flex-grow border-r border-border bg-card overflow-y-auto">
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Movie Night</h1>
        </div>
        <div className="flex-grow flex flex-col">
          <nav className="flex-1 px-2 py-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;
              
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md 
                    ${isActive 
                      ? 'bg-secondary text-foreground' 
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    } group`}
                >
                  <Icon 
                    className={`h-5 w-5 mr-3 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} 
                  />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-border p-4">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center">
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.name || user.username} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">{user.name || user.username}</p>
                <p className="text-xs text-muted-foreground">View profile</p>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
