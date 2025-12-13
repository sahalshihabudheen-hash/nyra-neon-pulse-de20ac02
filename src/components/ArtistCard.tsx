import { Link } from "react-router-dom";
import { Music } from "lucide-react";

interface ArtistCardProps {
  id: string;
  artistName: string;
  albumName?: string;
  coverImageUrl?: string | null;
  songCount?: number;
}

const ArtistCard = ({ id, artistName, albumName, coverImageUrl, songCount = 0 }: ArtistCardProps) => {
  return (
    <Link 
      to={`/artist/${id}`}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-xl bg-card/50 border border-border/30 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20">
        {/* Album Cover */}
        <div className="aspect-square overflow-hidden">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={`${artistName} - ${albumName}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Music className="h-16 w-16 text-primary/50" />
            </div>
          )}
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Info */}
        <div className="p-4">
          <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
            {artistName}
          </h3>
          {albumName && (
            <p className="text-sm text-muted-foreground truncate mt-1">
              {albumName}
            </p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-2">
            {songCount} {songCount === 1 ? 'song' : 'songs'}
          </p>
        </div>

        {/* Glow effect on hover */}
        <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
          <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_20px_rgba(var(--primary),0.1)]" />
        </div>
      </div>
    </Link>
  );
};

export default ArtistCard;
