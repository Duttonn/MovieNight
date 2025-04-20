import { Switch, Route, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Movies from "@/pages/movies";
import Groups from "@/pages/groups";
import Friends from "@/pages/friends";
import UsernameEntry from "@/pages/username-entry";
import { ProtectedRoute } from "./lib/protected-route";
import Sidebar from "./components/layout/sidebar";
import MobileNav from "./components/layout/mobile-nav";

// Simple layout component that doesn't rely on useAuth
function App() {
  const [location] = useLocation();
  
  // Special case for auth page or username entry - don't show sidebar
  if (location === "/auth" || location === "/username") {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-full">
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <Route path="/username" component={UsernameEntry} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </div>
    );
  }
  
  // Standard layout with sidebar
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 md:pl-64">
        <Switch>
          <ProtectedRoute path="/" component={Dashboard} />
          <ProtectedRoute path="/movies" component={Movies} />
          <ProtectedRoute path="/groups" component={Groups} />
          <ProtectedRoute path="/groups/:id" component={Groups} />
          <ProtectedRoute path="/friends" component={Friends} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/username" component={UsernameEntry} />
          <Route component={NotFound} />
        </Switch>
        <MobileNav />
      </div>
    </div>
  );
}

export default App;
