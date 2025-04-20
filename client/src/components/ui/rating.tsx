import { useState } from 'react';
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value?: number;
  onChange?: (value: number) => void;
  max?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
}

export function Rating({
  value = 0,
  onChange,
  max = 4,
  className,
  size = "md",
  readOnly = false,
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  
  const sizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };
  
  const starSize = sizes[size];
  
  return (
    <div
      className={cn("flex space-x-1", className)}
      onMouseLeave={() => !readOnly && setHoverValue(null)}
    >
      {Array.from({ length: max }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = hoverValue 
          ? starValue <= hoverValue
          : starValue <= value;
        
        return (
          <button
            key={index}
            className={cn(
              "rating-star p-1 rounded-full transition-transform hover:scale-110",
              !readOnly && "hover:bg-secondary",
              readOnly && "cursor-default"
            )}
            onClick={() => !readOnly && onChange?.(starValue)}
            onMouseEnter={() => !readOnly && setHoverValue(starValue)}
            disabled={readOnly}
            type="button"
          >
            <Star
              className={cn(
                starSize,
                isFilled ? "text-primary fill-primary" : "text-muted-foreground"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
