import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Film, Star, Calendar, Plus } from "lucide-react";

interface MovieCardProps {
  movie: {
    id: number;
    title: string;
    overview: string;
    posterPath: string;
    backdropPath: string;
    releaseDate: string;
    voteAverage: number;
  };
}

export function MovieCard({ movie }: MovieCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const posterUrl = movie.posterPath 
    ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
    : null;
  const backdropUrl = movie.backdropPath
    ? `https://image.tmdb.org/t/p/original${movie.backdropPath}`
    : null;
  const releaseYear = new Date(movie.releaseDate).getFullYear();

  return (
    <>
      <Card 
        className="group cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <div className="relative aspect-[2/3]">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={movie.title}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <Film className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent text-white">
            <h3 className="font-semibold mb-1 line-clamp-1">{movie.title}</h3>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                <span>{movie.voteAverage.toFixed(1)}</span>
              </div>
              <span>•</span>
              <span>{releaseYear}</span>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl h-[90vh] overflow-y-auto">
          <div className="relative aspect-video mb-4 bg-black rounded-t-lg overflow-hidden">
            {backdropUrl ? (
              <img
                src={backdropUrl}
                alt={movie.title}
                className="object-cover w-full h-full"
              />
            ) : posterUrl ? (
              <img
                src={posterUrl}
                alt={movie.title}
                className="object-contain w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center justify-between">
              <span>{movie.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {movie.voteAverage.toFixed(1)}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {releaseYear}
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription className="text-base !mt-4">
              {movie.overview}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            <Button className="w-full" onClick={() => {/* Open propose movie dialog */}}>
              <Plus className="h-4 w-4 mr-2" />
              Propose Movie
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
