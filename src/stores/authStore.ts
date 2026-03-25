
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/use-toast";
import { logAppEvent } from "@/lib/analytics";

interface Profile {
  id: string;
  username: string;
  email: string;
  weeklyCount: number;
  streakDays: number;
  lastRelapse: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  levelsCompleted: number;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isFetchingProfile: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  initializeAuth: () => void;
  fetchUserProfile: (userId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateWeeklyCount: () => Promise<void>;
  updateAvatarUrl: (avatarUrl: string | null) => void;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  isAuthenticated: false,
  isFetchingProfile: false,
  isInitialized: false,
};

// Helper function to create stable profile object references
const createProfileObject = (data: any): Profile => {
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    weeklyCount: data.weekly_count,
    streakDays: data.streak_days,
    lastRelapse: data.last_relapse,
    avatarUrl: data.avatar_url,
    totalPoints: data.total_points ?? 0,
    levelsCompleted: data.levels_completed ?? 0,
  };
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...initialState,

  initializeAuth: () => {
    console.log("🔐 [AUTH] Initializing auth system...");
    
    // Get initial session synchronously
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("🔐 [AUTH] Initial session:", !!session);
      const currentUser = session?.user ?? null;
      
      set({ 
        session, 
        user: currentUser, 
        isAuthenticated: !!currentUser,
        isInitialized: true 
      });

      // Fetch profile if user exists
      if (currentUser && !get().profile) {
        get().fetchUserProfile(currentUser.id);
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔐 [AUTH] Auth state changed: event=${event}, hasSession=${!!session}`);
      const currentUser = session?.user ?? null;
      const currentState = get();
      
      // Prevent unnecessary updates if state hasn't actually changed
      if (currentState.session === session && currentState.user === currentUser) {
        return;
      }
      
      // Update core authentication status
      set({ 
        session, 
        user: currentUser, 
        isAuthenticated: !!currentUser,
        isInitialized: true
      });

      if (currentUser) {
        // Only fetch profile if we don't have one or it's for a different user
        if (!currentState.profile || currentState.profile.id !== currentUser.id) {
          console.log(`🔐 [AUTH] Fetching profile for user ${currentUser.id}`);
          setTimeout(() => get().fetchUserProfile(currentUser.id), 0);
        }
      } else {
        // Clear profile when user logs out
        set({ profile: null, isFetchingProfile: false });
      }
    });

    return () => {
      console.log("🔐 [AUTH] Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  },

  fetchUserProfile: async (userId: string) => {
    const currentState = get();
    
    // Prevent duplicate fetches
    if (currentState.isFetchingProfile || (currentState.profile?.id === userId)) {
      return;
    }
    
    console.log(`👤 [PROFILE] Fetching profile for user ${userId}`);
    set({ isFetchingProfile: true });
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("👤 [PROFILE] Error fetching profile:", error);
        toast({
          title: "Error loading profile",
          description: error.message || "Could not load your user profile.",
          variant: "destructive",
        });
        set({ profile: null, isFetchingProfile: false }); 
        return;
      }
      
      if (data) {
        const profileData = createProfileObject(data);
        set({
          profile: profileData,
          isFetchingProfile: false,
        });
        console.log("👤 [PROFILE] Profile loaded:", profileData);
      }
    } catch (e: any) { 
      console.error("👤 [PROFILE] Unexpected error fetching profile:", e);
      set({ profile: null, isFetchingProfile: false });
    }
  },

  login: async (email, password) => {
    console.log(`🔑 [LOGIN] Attempting login for ${email}`);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const uid = data.user?.id;
      if (uid) {
        void logAppEvent(uid, "login");
        void supabase
          .from("profiles")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", uid);
      }
      toast({ title: "Logged in successfully", description: "Welcome back!" });
    } catch (error: any) {
      console.error("🔑 [LOGIN] Login error:", error);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      set({ isAuthenticated: false, user: null, profile: null, session: null, isFetchingProfile: false });
      throw error;
    }
  },

  signup: async (username, email, password) => {
    console.log(`📝 [SIGNUP] Attempting signup for ${email} with username ${username}`);
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { username },
          emailRedirectTo: window.location.origin
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Signup succeeded but no user was returned");
      
      toast({ title: "Signup successful", description: "Please check your email to verify your account if required." });
    } catch (error: any) {
      console.error("📝 [SIGNUP] Signup error:", error);
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      set({ isAuthenticated: false, user: null, profile: null, session: null, isFetchingProfile: false });
      throw error;
    }
  },

  logout: async () => {
    console.log("🚪 [LOGOUT] Logging out user");
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out", description: "You have been logged out." });
    } catch (error: any) {
      console.error("🚪 [LOGOUT] Logout error:", error);
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
      set({ ...initialState, isInitialized: true });
      throw error;
    }
  },
  
  updateWeeklyCount: async () => {
    const user = get().user;
    if (!user) {
      console.warn("📊 [COUNT] Update weekly count called but no user is authenticated.");
      return;
    }
    
    try {
      const { error } = await supabase.rpc(
        'increment_relapse_count', 
        { p_user_id: user.id }
      );
      if (error) throw error;
      await get().fetchUserProfile(user.id);
    } catch (error: any) {
      console.error("📊 [COUNT] Error updating count:", error);
      toast({ title: "Error updating count", description: error.message || "Failed to log relapse.", variant: "destructive" });
    }
  },

  updateAvatarUrl: (avatarUrl: string | null) => {
    const currentProfile = get().profile;
    if (currentProfile) {
      set({
        profile: {
          ...currentProfile,
          avatarUrl
        }
      });
    }
  },
}));

// Initialize authentication when the store is created
let initialized = false;
if (!initialized) {
  initialized = true;
  useAuthStore.getState().initializeAuth();
}
