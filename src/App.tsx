import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import PlaylistView from "./pages/PlaylistView";
import PlaylistsManager from "./pages/PlaylistsManager";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import Artists from "./pages/Artists";
import ArtistProfile from "./pages/ArtistProfile";
import BecomeArtist from "./pages/BecomeArtist";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/playlists" element={<PlaylistsManager />} />
            <Route path="/playlist/:id" element={<PlaylistView />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artist/:id" element={<ArtistProfile />} />
            <Route path="/become-artist" element={<BecomeArtist />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
