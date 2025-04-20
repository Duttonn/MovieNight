import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Share } from "lucide-react";

type User = {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
};

type TopPickMovie = {
  id: number;
  title: string;
  proposerId: number;
  proposedAt: string;
  proposalIntent: number; // 1-4
  interestScore?: number; // 1-4
  watched: boolean;
  watchedAt?: string;
  notes?: string;
  personalRating?: number;
  groupId?: number;
  proposer: User;
};

export default function WeeklyPick() {
  const { data: topPick, isLoading, error } = useQuery<TopPickMovie | null>({
    queryKey: ["/api/movies/top-pick"],
  });
  
  // Calculate score out of 20 (proposalIntent + interestScore, each 1-4)
  const calculateScore = (movie: TopPickMovie) => {
    if (!movie.interestScore) return 0;
    return (movie.proposalIntent + movie.interestScore) * 2.5; // Scale to 0-20
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">This Week's Top Pick</h3>
        
        {isLoading ? (
          <div className="flex flex-col md:flex-row md:space-x-6">
            <div className="w-full md:w-1/3 mb-4 md:mb-0">
              <Skeleton className="aspect-w-2 aspect-h-3 rounded-lg h-64 w-full" />
            </div>
            <div className="w-full md:w-2/3">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-20 w-full mb-4" />
              <Skeleton className="h-5 w-40 mb-4" />
              <div className="flex space-x-3">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-secondary/20 rounded-lg p-6 text-center">
            <p className="text-destructive">Error loading top movie pick</p>
          </div>
        ) : !topPick ? (
          <div className="bg-secondary/20 rounded-lg p-6 text-center">
            <p className="text-muted-foreground mb-2">No movie picks available yet.</p>
            <p className="text-sm">Propose movies and rate them to get suggestions!</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:space-x-6">
            <div className="w-full md:w-1/3 mb-4 md:mb-0">
              <div className="aspect-w-2 aspect-h-3 rounded-lg overflow-hidden bg-secondary/50">
                {/* Movie poster placeholder - in real app, get from API */}
                <div className="flex items-center justify-center h-full bg-secondary/50 text-muted-foreground">
                  <span className="text-lg font-semibold">{topPick.title}</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-2/3">
              <h4 className="text-2xl font-bold mb-2">{topPick.title}</h4>
              <div className="flex items-center mb-4">
                <div className="flex">
                  <Rating value={Math.round(calculateScore(topPick) / 5)} max={4} readOnly />
                </div>
                <span className="ml-2 text-muted-foreground">
                  Score: {calculateScore(topPick)}/20
                </span>
              </div>
              <div className="mb-4">
                <p className="text-muted-foreground">
                  {/* Movie description placeholder - in real app, get from API */}
                  A compelling movie featuring intense drama and character development.
                </p>
              </div>
              <div className="mb-4">
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">Proposed by:</span>
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage 
                        src={topPick.proposer.avatar} 
                        alt={topPick.proposer.name || topPick.proposer.username} 
                      />
                      <AvatarFallback>
                        {(topPick.proposer.name || topPick.proposer.username).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {topPick.proposer.name || topPick.proposer.username}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Watch Now
                </Button>
                <Button variant="secondary" className="flex items-center">
                  <Share className="h-5 w-5 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
