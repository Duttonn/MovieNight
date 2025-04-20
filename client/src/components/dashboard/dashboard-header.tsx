import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ProposeMovieDialog } from "@/components/movies/propose-movie-dialog";

interface DashboardHeaderProps {
  userName: string;
}

export default function DashboardHeader({ userName }: DashboardHeaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-6">
      <div className="flex flex-col md:flex-row justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome back, {userName}!</h2>
          <p className="text-muted-foreground">Your next movie night is coming up soon.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-secondary-foreground bg-primary hover:bg-primary/90"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            Propose a Movie
          </Button>
        </div>
      </div>
      
      <ProposeMovieDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
