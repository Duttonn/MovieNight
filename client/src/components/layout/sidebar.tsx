import { useLocation } from "wouter";
import { Home, Users, Film, Group, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Safely try to use auth hook - will be available after providers are initialized
export default function Sidebar() {
  const [location] = useLocation();
  const [user, setUser] = useState(null);
  const [logout, setLogout] = useState(() => () => {});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamically import useAuth to avoid the provider error
    const loadAuth = async () => {
      try {
        const { useAuth } = await import("@/hooks/use-auth");
        try {
          const auth = useAuth();
          setUser(auth.user);
          setLogout(() => () => auth.logoutMutation.mutate());
        } catch (e) {
          console.error("Failed to initialize auth:", e);
        }
        setIsLoading(false);
      } catch (e) {
        console.error("Failed to load auth module:", e);
        setIsLoading(false);
      }
    };
    
    loadAuth();
  }, []);

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
  if (!user) return null;

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
                    onClick={logout}
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
