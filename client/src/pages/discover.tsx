import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MovieGrid } from "@/components/movies/movie-grid";

type Movie = {
  id: number;
  title: string;
  overview: string;
  posterPath: string;
  backdropPath: string;
  releaseDate: string;
  voteAverage: number;
};

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: moviesData, isLoading: isLoadingMovies } = useQuery<Movie[]>({
    queryKey: ["movies", "discover", activeTab],
    queryFn: async () => {
      // Using mock data for now, will be replaced with TMDB API call
      return mockMovies;
    },
  });

  return (
    <Shell>
      <div className="container px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Discover Movies</h1>
            <p className="text-muted-foreground">Find new movies to watch with your groups</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for movies..."
              className="pl-9 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <Tabs defaultValue="popular" value={activeTab} onValueChange={setActiveTab}>
            <div className="p-4 border-b border-border">
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="popular">Popular</TabsTrigger>
                <TabsTrigger value="toprated">Top Rated</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="popular" className="mt-0">
                <MovieGrid movies={moviesData} isLoading={isLoadingMovies} />
              </TabsContent>
              <TabsContent value="toprated" className="mt-0">
                <MovieGrid movies={moviesData} isLoading={isLoadingMovies} />
              </TabsContent>
              <TabsContent value="upcoming" className="mt-0">
                <MovieGrid movies={moviesData} isLoading={isLoadingMovies} />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </Shell>
  );
}

// Mock data for testing UI
const mockMovies = [
  {
    id: 1197306,
    title: "A Working Man",
    overview: "Levon Cade left behind a decorated military career in the black ops to live a simple life working construction. But when his boss's daughter, who is like family to him, is taken by human traffickers, his search to bring her home uncovers a world of corruption far greater than he ever could have imagined.",
    posterPath: "/xUkUZ8eOnrOnnJAfusZUqKYZiDu.jpg",
    backdropPath: "/fTrQsdMS2MUw00RnzH0r3JWHhts.jpg",
    releaseDate: "2025-03-26",
    voteAverage: 6.318
  },
  {
    id: 950387,
    title: "A Minecraft Movie",
    overview: "Four misfits find themselves struggling with ordinary problems when they are suddenly pulled through a mysterious portal into the Overworld: a bizarre, cubic wonderland that thrives on imagination.",
    posterPath: "/yFHHfHcUgGAxziP1C3lLt0q2T4s.jpg",
    backdropPath: "/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg",
    releaseDate: "2025-03-31",
    voteAverage: 6.2
  },
  {
    id: 324544,
    title: "In the Lost Lands",
    overview: "A queen sends the powerful and feared sorceress Gray Alys to the ghostly wilderness of the Lost Lands in search of a magical power, where she and her guide, the drifter Boyce, must outwit and outfight both man and demon.",
    posterPath: "/t6HJH3gXtUqVinyFKWi7Bjh73TM.jpg",
    backdropPath: "/op3qmNhvwEvyT7UFyPbIfQmKriB.jpg",
    releaseDate: "2025-02-27",
    voteAverage: 6.294
  },
  {
    id: 822119,
    title: "Captain America: Brave New World",
    overview: "After meeting with newly elected U.S. President Thaddeus Ross, Sam finds himself in the middle of an international incident. He must discover the reason behind a nefarious global plot before the true mastermind has the entire world seeing red.",
    posterPath: "/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg",
    backdropPath: "/jhL4eTpccoZSVehhcR8DKLSBHZy.jpg",
    releaseDate: "2025-02-12",
    voteAverage: 6.146
  },
  {
    id: 1092899,
    title: "The Siege",
    overview: "International assassin Walker is compromised during a mission and sent to a reassignment center for a new identity. During his stay at the facility, a ruthless assault team storms the compound searching for someone their boss has lost.",
    posterPath: "/hVh4hMzkXNLnScudbid6hDvjMPk.jpg",
    backdropPath: "/4eC0tsU9OxR3Adlo1yRJYUDraW9.jpg",
    releaseDate: "2023-03-10",
    voteAverage: 5.265
  },
  {
    id: 1045938,
    title: "G20",
    overview: "After the G20 Summit is overtaken by terrorists, President Danielle Sutton must bring all her statecraft and military experience to defend her family and her fellow leaders.",
    posterPath: "/wv6oWAleCJZUk5htrGg413t3GCy.jpg",
    backdropPath: "/k32XKMjmXMGeydykD32jfER3BVI.jpg",
    releaseDate: "2025-04-09",
    voteAverage: 6.651
  }
];