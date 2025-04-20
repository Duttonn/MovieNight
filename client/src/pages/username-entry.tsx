import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function UsernameEntry() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Register and automatically log in with a simple username
      const response = await apiRequest("POST", "/api/simple-auth", { 
        username,
        // Generate a random password
        password: Math.random().toString(36).slice(2),
        email: `${username}@example.com` 
      });
      
      const user = await response.json();
      
      // Update the cache with the user
      queryClient.setQueryData(["/api/user"], user);
      
      toast({
        title: "Welcome!",
        description: `Welcome to Movie Night Planner, ${username}!`,
      });
      
      // Navigate to the dashboard
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to enter app",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Form Column */}
      <div className="flex w-full lg:w-1/2 items-center justify-center">
        <div className="w-full max-w-md p-6 space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary">Movie Night Planner</h1>
            <p className="text-muted-foreground mt-2">Enter a username to continue</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>No sign-up needed - just enter a username to get started!</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium">
                    Username
                  </label>
                  <Input
                    id="username"
                    placeholder="Enter your preferred username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                      Entering...
                    </span>
                  ) : (
                    "Enter App"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
      
      {/* Hero Column */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary/20 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <h2 className="text-4xl font-bold mb-6">
            <span className="text-primary">Movie Night</span> with Friends Made Easy
          </h2>
          <p className="text-muted-foreground mb-8">
            Suggest movies, rate each others' picks, and schedule perfect movie nights with friends.
            Never argue about what to watch again!
          </p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-card/50 p-4 rounded-lg">
              <div className="text-xl mb-2 text-primary">Rate Movies</div>
              <p className="text-sm text-muted-foreground">Score your friends' movie suggestions</p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg">
              <div className="text-xl mb-2 text-primary">Group Watch</div>
              <p className="text-sm text-muted-foreground">Create movie nights with different friend groups</p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg">
              <div className="text-xl mb-2 text-primary">Schedule</div>
              <p className="text-sm text-muted-foreground">Plan recurring or one-time movie nights</p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg">
              <div className="text-xl mb-2 text-primary">Friends</div>
              <p className="text-sm text-muted-foreground">Connect with friends who love movies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}