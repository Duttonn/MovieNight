import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Users, Clock, Edit, Star, StarHalf, Film, ListOrdered, PlusCircle, CalendarDays, Check, ThumbsUp, History, EyeIcon } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { EditGroupDialog } from "@/components/groups/edit-group-dialog"; 
import { ProposeMovieDialog } from "@/components/movies/propose-movie-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkMovieWatchedDialog } from "@/components/movies/mark-movie-watched-dialog";
import { ScheduleMovieNightDialog } from "@/components/groups/schedule-movie-night-dialog";
import { formatDistanceToNow } from "date-fns";
import { SuggestionMovieCard } from "@/components/movies/suggestion-movie-card";

// Types for our API data
type GroupMember = {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
};

type MovieRating = {
  userId: number;
  interestScore: number; // 1-4 rating
};

type Movie = {
  id: number;
  title: string;
  tmdbId?: number;
  posterPath?: string;
  posterUrl?: string; // Added for convenience
  proposerId: number;
  proposer?: GroupMember;
  proposedAt: string;
  proposalIntent: number; // 1-4 score indicating how much the proposer wants to watch
  interestScore?: number; // 1-4 score from the current user
  watched: boolean;
  watchedAt?: string;
  notes?: string;
  groupId: number;
  personalRating?: number;
  ratings?: MovieRating[];
};

type Group = {
  id: number;
  name: string;
  scheduleType: "recurring" | "oneoff";
  scheduleDay?: number;
  scheduleTime: string;
  scheduleDate?: Date;
  currentProposerIndex: number;
  lastMovieNight?: Date;
  members: GroupMember[];
  decidedMovieId?: number | null; // Added from schema
  decidedMovie?: Movie | null; // Added from API response
};

// Helper function (same as in groups.tsx)
const getDayName = (day: number) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day];
};

const formatSchedule = (group: Group) => {
  if (group.scheduleType === "recurring" && group.scheduleDay !== undefined) {
    return `Every ${getDayName(group.scheduleDay)} at ${group.scheduleTime}`;
  } else if (group.scheduleType === "oneoff" && group.scheduleDate) {
    return `${new Date(group.scheduleDate).toLocaleDateString()} at ${group.scheduleTime}`;
  }
  return `At ${group.scheduleTime}`;
};

// Calculate average rating for a movie
const calculateAverageRating = (ratings?: MovieRating[]): number => {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating.interestScore, 0);
  return sum / ratings.length;
};

// Render star ratings
const StarRating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return (
    <div className="flex">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="h-4 w-4 fill-primary text-primary" />
      ))}
      {hasHalfStar && <StarHalf className="h-4 w-4 fill-primary text-primary" />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground" />
      ))}
    </div>
  );
};

// Determine the next proposer order
const getProposerOrder = (group: Group): number[] => {
  if (!group || !group.members || group.members.length === 0) return [];
  
  const startIdx = (group.currentProposerIndex + 1) % group.members.length;
  const result = [];
  
  // Add all members except current proposer in order
  for (let i = 0; i < group.members.length - 1; i++) {
    const idx = (startIdx + i) % group.members.length;
    result.push(group.members[idx].id);
  }
  
  return result;
};

// Get preference emoji for rank
const getRankEmoji = (preference?: number): string => {
  switch (preference) {
    case 1: return '1';
    case 2: return '2';
    case 3: return '3';
    case 4: return '4';
    default: return '';
  }
};

export default function GroupDetail() {
  const [, params] = useRoute<{ id: string }>("/groups/:id");
  const groupId = params?.id ? parseInt(params.id, 10) : null;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [proposeMovieOpen, setProposeMovieOpen] = useState(false);
  const [selectedProposer, setSelectedProposer] = useState<number | null>(null);
  const [votingMovieId, setVotingMovieId] = useState<number | null>(null);
  const [watchFilter, setWatchFilter] = useState<"all" | "watched" | "unwatched">("all");
  const [selectedMovieForWatch, setSelectedMovieForWatch] = useState<Movie | null>(null);
  const [showWatchedDialog, setShowWatchedDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showMovieDetail, setShowMovieDetail] = useState<Movie | null>(null);
  
  // Access auth context to get the current user
  const { user } = useAuth();
  const currentUserId = user?.id;
  
  // Create query client to invalidate queries
  const queryClient = useQueryClient();
  
  // Fetch group data (now includes decidedMovie)
  const { data: group, isLoading, isError, error } = useQuery<Group>({
    queryKey: ["groups", groupId], 
    queryFn: async () => {
      if (!groupId) throw new Error("Group ID not found");
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch group: ${res.statusText}`);
      }
      const groupData = await res.json();
      // Ensure decidedMovie has posterUrl if it exists
      if (groupData.decidedMovie && groupData.decidedMovie.posterPath) {
        groupData.decidedMovie.posterUrl = `https://image.tmdb.org/t/p/w500${groupData.decidedMovie.posterPath}`;
      }
      return groupData;
    },
    enabled: !!groupId,
  });

  // Fetch movies for this group
  const { data: movies = [], isLoading: isLoadingMovies } = useQuery<Movie[]>({
    queryKey: ["movies", groupId],
    queryFn: async () => {
      if (!groupId) throw new Error("Group ID not found");
      const res = await fetch(`/api/movies?groupId=${groupId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch movies: ${res.statusText}`);
      }
      const moviesData = await res.json();
      
      // Add posterUrl for convenience
      return moviesData.map((movie: Movie) => ({
        ...movie,
        posterUrl: movie.posterPath ? `https://image.tmdb.org/t/p/w500${movie.posterPath}` : null,
      }));
    },
    enabled: !!groupId,
  });

  // Extract user ratings from fetched movies
  const userRatings = movies.reduce((acc, movie) => {
    if (movie.interestScore && currentUserId) {
      acc[movie.id] = movie.interestScore;
    }
    return acc;
  }, {} as Record<number, number>);
  
  // Placeholder for preference rankings - would need an API endpoint to support this
  const [userPreferences, setUserPreferences] = useState<Record<number, number>>({});
  
  // Mutation for rating a movie
  const rateMutation = useMutation({
    mutationFn: async ({ movieId, rating }: { movieId: number, rating: number }) => {
      const res = await fetch(`/api/movies/${movieId}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interestScore: rating }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to rate movie");
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["movies", groupId] });
    },
  });

  // Mutation for deciding a movie
  const decideMutation = useMutation({
    mutationFn: async (movieId: number | null) => {
      console.log(`Attempting to decide on movie ID: ${movieId}`);
      if (!groupId) throw new Error("Group ID not found");
      
      try {
        const res = await fetch(`/api/groups/${groupId}/decide`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movieId }),
        });
        
        console.log(`Response status: ${res.status}`);
        
        if (!res.ok) {
          // Try to get the response text to diagnose the issue
          const responseText = await res.text();
          console.error("Full error response:", responseText);
          throw new Error(`Failed to decide movie: ${res.status} - ${responseText.substring(0, 200)}...`);
        }
        
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Full error object:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", groupId] });
    },
    onError: (error) => {
      console.error("Error deciding movie:", error);
      // Add user feedback (toast) if desired
    }
  });

  // Mutation for marking a movie as watched (and rotating proposer)
  const watchMutation = useMutation({
    mutationFn: async (movieId: number) => {
      const res = await fetch(`/api/movies/${movieId}/watch`, { method: 'PATCH' });
      if (!res.ok) {
        console.error("Failed to mark movie as watched:", res.status, await res.text());
        throw new Error("Failed to mark movie as watched");
      }
      console.log("Movie marked as watched successfully.");
      return res.json();
    },
    onSuccess: () => {
      console.log("Invalidating group and movie queries after watch...");
      queryClient.invalidateQueries({ queryKey: ["groups", groupId] });
      queryClient.invalidateQueries({ queryKey: ["movies", groupId] });
      console.log("Queries invalidated after watch.");
    },
    onError: (error) => {
      console.error("Error marking movie as watched:", error);
      // Add user feedback (toast) if desired
    }
  });

  // Set the current proposer when the group data loads
  useEffect(() => {
    if (group && group.members.length > 0) {
      const proposerIndex = group.currentProposerIndex % group.members.length;
      const proposerId = group.members[proposerIndex]?.id;
      setSelectedProposer(proposerId || null);
    }
  }, [group]);

  // Filter movies based on selected proposer and watch status
  const filteredMovies = movies
    .filter(movie => selectedProposer ? movie.proposerId === selectedProposer : true)
    .filter(movie => {
      if (watchFilter === "all") return true;
      if (watchFilter === "watched") return movie.watched;
      if (watchFilter === "unwatched") return !movie.watched;
      return true;
    });

  const handleEditDialogClose = (open: boolean) => {
    setEditDialogOpen(open);
  };

  const handleProposeMovieOpen = (open: boolean) => {
    setProposeMovieOpen(open);
  };

  const handleWatchedDialogOpen = (movie: Movie) => {
    setSelectedMovieForWatch(movie);
    setShowWatchedDialog(true);
  };

  const handleWatchedDialogClose = () => {
    setSelectedMovieForWatch(null);
    setShowWatchedDialog(false);
  };

  const getCurrentProposerId = (): number | null => {
    if (!group || group.members.length === 0) return null;
    const proposerIndex = group.currentProposerIndex % group.members.length;
    return group.members[proposerIndex]?.id || null;
  };

  const handleRateMovie = (movieId: number, rating: number) => {
    rateMutation.mutate({ movieId, rating });
    setVotingMovieId(null);
  };
  
  const handleSetPreference = (movieId: number, preference: number) => {
    // This would normally call an API endpoint to save the preference
    setUserPreferences(prev => {
      const updated = { ...prev };
      
      // If the user clicks the already selected preference, toggle it off
      if (updated[movieId] === preference) {
        delete updated[movieId];
        return updated;
      }
      
      // Find if any other movie already has this preference rank
      const existingMovieWithRank = Object.entries(updated).find(
        ([id, rank]) => rank === preference && Number(id) !== movieId
      );
      
      if (existingMovieWithRank) {
        const [existingMovieId] = existingMovieWithRank;
        
        // If this movie already had a different preference, swap them
        if (updated[movieId]) {
          const oldRank = updated[movieId];
          updated[Number(existingMovieId)] = oldRank;
        } else {
          // Otherwise just remove the rank from the other movie
          delete updated[Number(existingMovieId)];
        }
      }
      
      // Set the new preference for this movie
      updated[movieId] = preference;
      return updated;
    });
    
    // Close voting interface after setting preference
    setVotingMovieId(null);
  };

  // Check if the current user is the proposer
  const isCurrentUserProposer = currentUserId && getCurrentProposerId() === currentUserId;

  // Get last watched movie
  const lastWatchedMovie = movies
    .filter(movie => movie.watched)
    .sort((a, b) => {
      // Sort by watchedAt date descending
      if (!a.watchedAt) return 1;
      if (!b.watchedAt) return -1;
      return new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime();
    })[0];

  // Helper: Get movies proposed by the current proposer (not watched)
  const proposerMovies = movies.filter(
    (m) => m.proposerId === getCurrentProposerId() && !m.watched
  );
  // Helper: Get waiting list movies (not by proposer, not watched)
  const waitingListMovies = movies.filter(
    (m) => m.proposerId !== getCurrentProposerId() && !m.watched
  );

  // Cap logic for proposer and waiting list
  const canPropose = proposerMovies.length < 4;
  const canAddToWaitingList = waitingListMovies.length < 4;

  // Weighted average algorithm for deciding the movie - now calls the mutation
  const decideMovie = () => {
    console.log("decideMovie function called"); // Log function entry
    if (!filteredMovies.length) {
      console.log("No filtered movies, exiting decideMovie");
      return;
    }
    
    // CRITICAL FIX: Ensure we only consider movies that belong to this group
    // Filter out already watched movies and movies that don't belong to this group
    const unwatchedFiltered = filteredMovies.filter(m => 
      !m.watched && // Movie must be unwatched 
      m.groupId === groupId // Movie must belong to current group
    );
    
    if (!unwatchedFiltered.length) {
      console.log("No unwatched filtered movies that belong to this group, exiting decideMovie");
      return; // No suitable movies to decide from
    }

    // Weighted: proposalIntent (weight 2), interestScore (weight 1)
    const scored = unwatchedFiltered.map((movie) => {
      const avgInterest = calculateAverageRating(movie.ratings);
      // Ensure proposalIntent is treated as a number
      const proposalIntentNum = Number(movie.proposalIntent) || 0; 
      const score = (proposalIntentNum * 2 + avgInterest * 1) / 3;
      return { ...movie, score };
    });
    scored.sort((a, b) => b.score - a.score);
    
    // Call the mutation to set the decided movie on the backend
    if (scored[0]) {
      console.log(`Deciding on movie ID: ${scored[0].id}, which belongs to group ${scored[0].groupId}`); // Log movie ID being decided
      decideMutation.mutate(scored[0].id);
    } else {
      console.log("No movie found after scoring");
    }
  };

  // Use group.decidedMovie from the query data
  const decidedMovie = group?.decidedMovie;

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 flex items-center h-16 px-4 border-b border-border bg-card md:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/groups">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold text-primary mx-auto">
          {isLoading ? "Loading..." : group?.name || "Group Details"}
        </h1>
        {group && (
          <Button variant="ghost" size="icon" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 pb-24 md:pb-12">
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
              <div className="flex flex-wrap gap-2">
                {[...Array(5)].map((_, j) => (
                  <Skeleton key={j} className="h-16 w-16 rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : isError ? (
          <Card className="text-center p-8">
            <h3 className="text-xl font-semibold mb-4 text-destructive">Error Loading Group</h3>
            <p className="text-muted-foreground mb-6">
              Could not load details for this group. {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <Button asChild variant="secondary">
              <Link href="/groups">Back to Groups</Link>
            </Button>
          </Card>
        ) : !group ? (
           <Card className="text-center p-8">
            <h3 className="text-xl font-semibold mb-4">Group Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The group you are looking for does not exist or could not be loaded.
            </p>
            <Button asChild variant="secondary">
              <Link href="/groups">Back to Groups</Link>
            </Button>
          </Card>
        ) : (
          <>
            {/* Header with group info */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-4 mb-1">
                      <Button variant="ghost" size="icon" className="hidden md:inline-flex" asChild>
                        <Link href="/groups">
                          <ArrowLeft className="h-5 w-5" />
                        </Link>
                      </Button>
                      <CardTitle className="text-2xl">{group.name}</CardTitle>
                      <Badge variant="outline" className="bg-primary/20 text-primary">
                        {group.scheduleType === "recurring" ? "Weekly" : "One-time"}
                      </Badge>
                    </div>
                    <CardDescription className="md:ml-14">Details and movie suggestions for your group.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowScheduleDialog(true)} className="w-full md:w-auto">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                    <Button variant="outline" onClick={() => setEditDialogOpen(true)} className="w-full md:w-auto">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Group
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Schedule Info */}
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{formatSchedule(group)}</span>
                </div>
                {/* Last Watched Info */}
                {group.lastMovieNight && (
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Last watched: {new Date(group.lastMovieNight).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Last Watched Movie Section - New Addition */}
            {lastWatchedMovie && (
              <Card className="mb-6 bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Last Watched Movie
                  </CardTitle>
                  <CardDescription>
                    Movie your group watched recently
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="w-full md:w-1/4 aspect-[2/3] rounded-md overflow-hidden">
                      {lastWatchedMovie.posterUrl ? (
                        <img 
                          src={lastWatchedMovie.posterUrl} 
                          alt={lastWatchedMovie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <Film className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{lastWatchedMovie.title}</h3>
                      <div className="flex flex-wrap gap-3 items-center text-sm text-muted-foreground mb-4">
                        {lastWatchedMovie.watchedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Watched {formatDistanceToNow(new Date(lastWatchedMovie.watchedAt), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                        {lastWatchedMovie.proposer && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>Proposed by {lastWatchedMovie.proposer.name || lastWatchedMovie.proposer.username}</span>
                          </div>
                        )}
                        {lastWatchedMovie.personalRating && (
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            <StarRating rating={lastWatchedMovie.personalRating} />
                          </div>
                        )}
                      </div>
                      {lastWatchedMovie.notes && (
                        <div>
                          <p className="text-sm font-medium mb-1">Notes:</p>
                          <p className="text-sm italic text-muted-foreground">"{lastWatchedMovie.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* New Layout: Sidebar and Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Sidebar with Members */}
              <div className="md:col-span-1 sticky top-6"> {/* MODIFIED: Was md:col-span-1 h-full */}
                <Card className=""> {/* MODIFIED: Removed sticky top-20 */}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Members
                    </CardTitle>
                    <CardDescription>
                      {getCurrentProposerId() ? "Current proposer highlighted" : "All members"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {/* Members List */}
                    <div className="space-y-3">
                      {group.members.map((member) => {
                        const isCurrentProposer = member.id === getCurrentProposerId();
                        return (
                          <div 
                            key={member.id}
                            className={`flex items-center gap-3 p-2 rounded-md transition-all cursor-pointer ${
                              isCurrentProposer 
                                ? 'bg-primary/10 border border-primary' 
                                : 'hover:bg-secondary'
                            }`}
                            onClick={() => setSelectedProposer(member.id)}
                          >
                            <Avatar className={`h-10 w-10 ${isCurrentProposer ? 'ring-2 ring-primary' : ''}`}> 
                              <AvatarImage
                                src={member.avatar}
                                alt={member.name || member.username}
                              />
                              <AvatarFallback>
                                {(member.name || member.username).substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {member.name || member.username}
                              </div>
                              {isCurrentProposer && (
                                <span className="text-xs text-primary">Current Proposer</span>
                              )}
                            </div>
                            {isCurrentProposer && (
                              <div className="h-2 w-2 bg-primary rounded-full" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Propose Movie Button moved here */}
                {isCurrentUserProposer && (
                  <Button 
                    className="w-full mt-4" 
                    variant="default"
                    onClick={() => setProposeMovieOpen(true)}
                    disabled={!canPropose}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Propose a Movie
                  </Button>
                )}

                {/* Waiting List */}
                {group && (
                  <Card className="mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ListOrdered className="h-5 w-5 text-primary" />
                        Waiting List
                      </CardTitle>
                      <CardDescription>
                        Movies other members want to propose
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      {group.members.length > 0 && getProposerOrder(group).length > 0 ? (
                        <div className="space-y-4">
                          {getProposerOrder(group).map((userId, index) => {
                            const member = group.members.find(m => m.id === userId);
                            if (!member) return null;
                            
                            return (
                              <div key={userId} className="border-t border-border pt-3 first:border-0 first:pt-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage
                                      src={member.avatar}
                                      alt={member.name || member.username}
                                    />
                                    <AvatarFallback>
                                      {(member.name || member.username).substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{member.name || member.username}</div>
                                    <div className="text-xs text-muted-foreground">Next in {index + 1} turn{index > 0 ? 's' : ''}</div>
                                  </div>
                                </div>
                                
                                <div className="text-center p-2 bg-secondary/20 rounded-md">
                                  <span className="text-sm text-muted-foreground">No upcoming movies yet</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-muted-foreground text-sm">No waiting list</div>
                        </div>
                      )}
                      
                      {getCurrentProposerId() !== null && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full mt-4 flex items-center gap-2"
                          onClick={() => setProposeMovieOpen(true)}
                          disabled={!canAddToWaitingList}
                        >
                          <PlusCircle className="h-4 w-4" />
                          Add to Waiting List
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Main Content: Movie Grid */}
              <div className="md:col-span-3">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Film className="h-5 w-5 text-primary" />
                        Movie Suggestions
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button 
                          variant={selectedProposer === null ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setSelectedProposer(null)}
                        >
                          All Movies
                        </Button>
                        {getCurrentProposerId() && (
                          <Button 
                            variant={selectedProposer === getCurrentProposerId() ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedProposer(getCurrentProposerId())}
                          >
                            Current Proposer
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {selectedProposer ? 
                        `Movies proposed by ${group.members.find(m => m.id === selectedProposer)?.name || 'selected member'}` : 
                        'All movie suggestions for this group'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Tabs value={watchFilter} onValueChange={setWatchFilter as any} className="mb-4">
                      <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="unwatched">Unwatched</TabsTrigger>
                        <TabsTrigger value="watched">Watched</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    
                    {/* Use group.decidedMovie from query */}
                    {decidedMovie ? ( 
                      <div className="w-full flex flex-col items-center justify-center min-h-[400px]">
                        <h2 className="text-3xl font-bold mb-4">Selected Movie for Movie Night</h2>
                        <div className="w-full max-w-xl">
                          {/* Pass the decidedMovie from group data */}
                          <SuggestionMovieCard movie={decidedMovie} /> 
                        </div>
                        <Button 
                          className="mt-6" 
                          variant="success" 
                          size="lg"
                          onClick={() => {
                            if (!decidedMovie) return;
                            // Call the watch mutation
                            watchMutation.mutate(decidedMovie.id); 
                          }}
                          // Disable if already watched OR mutation is pending
                          disabled={decidedMovie.watched || watchMutation.isPending} 
                        >
                          {watchMutation.isPending ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <Check className="h-5 w-5 mr-2" />
                              Mark as Watched
                            </>
                          )}
                        </Button>
                        {/* Optional: Button to undo decision */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={() => decideMutation.mutate(null)} // Set decidedMovieId to null
                          disabled={decideMutation.isPending}
                        >
                          Choose a different movie
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Decide Button - Disable if mutation is pending */}
                        {filteredMovies.filter(m => !m.watched).length > 0 && !isLoadingMovies && ( 
                          <div className="flex justify-end mb-4">
                            <Button 
                              variant="default" // Changed from primary
                              size="lg" 
                              onClick={decideMovie} // Check this handler
                              disabled={decideMutation.isPending} // Disable while deciding
                            >
                              {decideMutation.isPending ? 'Deciding...' : 'Decide Movie Night'}
                            </Button>
                          </div>
                        )}
                        {/* Movie Suggestions Grid */}
                        {isLoadingMovies ? ( // Added loading state for movies
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMovies.map((movie) => (
                              <div key={movie.id} onClick={() => setShowMovieDetail(movie)} style={{ cursor: 'pointer' }}>
                                <SuggestionMovieCard
                                  movie={movie}
                                  onRemove={isCurrentUserProposer && movie.proposerId === currentUserId && !movie.watched ? async () => {
                                    // Add error handling to remove as well
                                    try {
                                      const deleteRes = await fetch(`/api/movies/${movie.id}`, { method: 'DELETE' });
                                      if (!deleteRes.ok) {
                                        console.error("Failed to delete movie:", deleteRes.status, await deleteRes.text());
                                        return;
                                      }
                                      console.log("Movie deleted successfully.");
                                      queryClient.invalidateQueries({ queryKey: ["movies", groupId] });
                                    } catch (error) {
                                      console.error("Error deleting movie:", error);
                                    }
                                  } : undefined}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {/* Movie Detail Dialog */}
                    {showMovieDetail && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowMovieDetail(null)}> {/* Close on backdrop click */}
                        <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full p-6 relative" onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside */}
                          <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={() => setShowMovieDetail(null)}>
                            <svg width="15" height="15" viewBox="0  0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80697 12.0062 3.44303 11.7816 3.21843C11.557 2.99383 11.1931 2.99383 10.9685 3.21843L7.5 6.6869L4.03157 3.21843C3.80697 2.99383 3.44303 2.99383 3.21843 3.21843C2.99383 3.44303 2.99383 3.80697 3.21843 4.03157L6.6869 7.5L3.21843 10.9685C2.99383 11.1931 2.99383 11.557 3.21843 11.7816C3.44303 12.0062 3.80697 12.0062 4.03157 11.7816L7.5 8.3131L10.9685 11.7816C11.1931 12.0062 11.557 12.0062 11.7816 11.7816C12.0062 11.557 12.0062 11.1931 11.7816 10.9685L8.3131 7.5L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                          </Button>
                          {/* Ensure SuggestionMovieCard doesn't have its own close logic interfering */}
                          <SuggestionMovieCard movie={showMovieDetail} />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Edit Group Dialog */}
      {groupId !== null && (
        <EditGroupDialog
          open={editDialogOpen}
          onOpenChange={handleEditDialogClose}
          groupId={groupId}
        />
      )}
      
      {/* Propose Movie Dialog */}
      {groupId !== null && (
        <ProposeMovieDialog
          open={proposeMovieOpen}
          onOpenChange={handleProposeMovieOpen}
        />
      )}
      
      {/* Mark Movie as Watched Dialog */}
      {selectedMovieForWatch && (
        <MarkMovieWatchedDialog
          open={showWatchedDialog}
          onOpenChange={handleWatchedDialogClose}
          movie={selectedMovieForWatch}
        />
      )}

      {/* Schedule Movie Night Dialog */}
      {groupId !== null && group && (
        <ScheduleMovieNightDialog
          open={showScheduleDialog}
          onOpenChange={(open) => setShowScheduleDialog(open)}
          groupId={groupId}
          currentSchedule={{
            scheduleType: group.scheduleType,
            scheduleDay: group.scheduleDay,
            scheduleTime: group.scheduleTime,
            scheduleDate: group.scheduleDate ? new Date(group.scheduleDate) : undefined,
          }}
        />
      )}
    </>
  );
}