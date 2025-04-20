import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Movie } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposeMovieDialog } from "@/components/movies/propose-movie-dialog";
import { MovieCard } from "@/components/movies/movie-card";

export default function Movies() {
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  
  const { data: movies, isLoading, isError } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  // Filter movies based on the selected tab
  const getFilteredMovies = () => {
    if (!movies) return [];
    
    if (filter === "rated") {
      return movies.filter(movie => movie.interestScore !== undefined);
    } else if (filter === "unrated") {
      return movies.filter(movie => movie.interestScore === undefined);
    }
    
    return movies;
  };

  const filteredMovies = getFilteredMovies();

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b border-border bg-card md:hidden">
        <h1 className="text-xl font-bold text-primary">Movies</h1>
        <Button variant="ghost" size="icon" onClick={() => setProposeDialogOpen(true)}>
          <PlusCircle className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 pb-24 md:pb-12">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Movie Collection</h1>
            <p className="text-muted-foreground">Browse and rate movie suggestions for your groups</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button 
              className="flex items-center gap-2"
              onClick={() => setProposeDialogOpen(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Propose Movie
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <CardTitle>Movie Suggestions</CardTitle>
              <Tabs defaultValue="all" value={filter} onValueChange={setFilter}>
                <TabsList>
                  <TabsTrigger value="all">All Movies</TabsTrigger>
                  <TabsTrigger value="rated">Rated</TabsTrigger>
                  <TabsTrigger value="unrated">Unrated</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-secondary/20 rounded-lg overflow-hidden border border-border">
                    <Skeleton className="h-40 w-full" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-8">
                <p className="text-destructive">Error loading movies. Please try again.</p>
              </div>
            ) : filteredMovies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No movies found. Start by proposing a movie!</p>
                <Button className="mt-4" onClick={() => setProposeDialogOpen(true)}>
                  Propose a Movie
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMovies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      <ProposeMovieDialog 
        open={proposeDialogOpen}
        onOpenChange={setProposeDialogOpen}
      />
    </>
  );
}
