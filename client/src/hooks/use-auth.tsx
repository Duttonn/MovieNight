import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  email: z.string().email(),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.name || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper functions that don't require context
export async function loginUser(credentials: LoginData, toast: any) {
  try {
    const res = await apiRequest("POST", "/api/login", credentials);
    const user = await res.json();
    queryClient.setQueryData(["/api/user"], user);
    toast({
      title: "Login successful",
      description: `Welcome back, ${user.name || user.username}!`,
    });
    return user;
  } catch (error: any) {
    toast({
      title: "Login failed",
      description: error.message,
      variant: "destructive",
    });
    throw error;
  }
}

export async function registerUser(credentials: RegisterData, toast: any) {
  try {
    const res = await apiRequest("POST", "/api/register", credentials);
    const user = await res.json();
    queryClient.setQueryData(["/api/user"], user);
    toast({
      title: "Registration successful",
      description: `Welcome, ${user.name || user.username}!`,
    });
    return user;
  } catch (error: any) {
    toast({
      title: "Registration failed",
      description: error.message,
      variant: "destructive",
    });
    throw error;
  }
}

export async function logoutUser(toast: any) {
  try {
    await apiRequest("POST", "/api/logout");
    queryClient.setQueryData(["/api/user"], null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  } catch (error: any) {
    toast({
      title: "Logout failed",
      description: error.message,
      variant: "destructive",
    });
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const res = await apiRequest("GET", "/api/user");
    if (res.status === 401) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}
