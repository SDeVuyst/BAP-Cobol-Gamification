import { useState, useEffect } from "react";
import { Avatar as RadixAvatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { AvatarProps, DEFAULT_AVATAR_SIZE } from "./types";
import { cn } from "@/lib/utils";

export const Avatar = ({
  src,
  alt = "Profile picture",
  size = DEFAULT_AVATAR_SIZE,
  className,
  fallback,
  userId
}: AvatarProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Download image from Supabase Storage
  const downloadImage = async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📷 [AVATAR] Downloading image from path:', path);
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .download(path);
      
      if (error) {
        console.error('📷 [AVATAR] Download error:', error);
        throw error;
      }
      
      const url = URL.createObjectURL(data);
      console.log('📷 [AVATAR] Image downloaded and blob URL created');
      setAvatarUrl(url);
    } catch (error: any) {
      console.error('📷 [AVATAR] Error downloading avatar:', error);
      setError(error.message);
      setAvatarUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to load avatar when src changes
  useEffect(() => {
    if (!src) {
      setAvatarUrl(null);
      return;
    }

    // Allow fully-qualified URLs (or public-path URLs) without downloading from Supabase Storage.
    // Supabase Storage paths are typically like "userId/filename.png" (no leading slash).
    const isDirectUrl =
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("data:") ||
      src.startsWith("/");

    if (isDirectUrl) {
      setError(null);
      setIsLoading(false);
      setAvatarUrl(src);
      return;
    }

    downloadImage(src);

    // Cleanup object URL to prevent memory leaks
    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [src]);

  // Generate fallback initials from fallback text or userId
  const getFallbackText = () => {
    if (fallback) {
      return fallback.charAt(0).toUpperCase();
    }
    if (userId) {
      return userId.charAt(0).toUpperCase();
    }
    return "?";
  };

  const sizeStyles = typeof size === 'number' 
    ? { width: `${size}px`, height: `${size}px` } 
    : { width: size, height: size };

  return (
    <RadixAvatar 
      className={cn("relative", className)} 
      style={sizeStyles}
    >
      {/* Show loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-full">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      
      {/* Show avatar image if available */}
      {avatarUrl && !error && (
        <AvatarImage 
          src={avatarUrl} 
          alt={alt}
          className="object-cover"
        />
      )}
      
      {/* Fallback to initials */}
      <AvatarFallback className="bg-vercel-purple/20 text-vercel-purple font-medium">
        {getFallbackText()}
      </AvatarFallback>
    </RadixAvatar>
  );
}; 