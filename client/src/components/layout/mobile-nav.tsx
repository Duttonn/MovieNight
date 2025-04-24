import { useLocation } from "wouter";
import { Home, Users, Film, Group, Search } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/discover", label: "Discover", icon: Search },
    { path: "/groups", label: "Groups", icon: Group },
    { path: "/movies", label: "Movies", icon: Film },
    { path: "/friends", label: "Friends", icon: Users },
  ];

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-10">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <a
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center p-3 
                ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
