import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtistCardProps {
  id: string;
  artistName: string;
  coverImageUrl?: string | null;
  albumName?: string | null;
  songCount?: number;
  className?: string;
}

const ArtistCard = ({ id, artistName, coverImageUrl, className }: ArtistCardProps) => {
  return (
    <Link 
      to={`/yt-artist/${id}`}
      className={cn("group block text-center space-y-3", className)}
    >
      <div className="relative mx-auto w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-white/5 transition-all duration-500 group-hover:scale-105 group-hover:border-primary shadow-2xl group-hover:shadow-[0_0_30px_rgba(var(--primary),0.3)]">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={artistName}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/5">
            <User className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        )}
        
        {/* Overlay glow */}
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      <div className="px-2">
        <h3 className="font-black text-sm md:text-base text-foreground truncate group-hover:text-primary transition-colors uppercase tracking-tight italic">
          {artistName}
        </h3>
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Artist</p>
      </div>
    </Link>
  );
};

export default ArtistCard;

