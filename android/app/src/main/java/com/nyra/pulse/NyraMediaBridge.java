package com.nyra.pulse;

public class NyraMediaBridge {
    private static NyraMediaBridge instance;
    private NyraMediaService service;
    private NyraMediaPlugin plugin;

    // Cache the latest track state
    private String lastTitle = "Unknown";
    private String lastArtist = "";
    private String lastArtwork = "";
    private long lastDuration = 0L;
    private boolean lastIsPlaying = false;
    private long lastPosition = 0L;

    public static NyraMediaBridge getInstance() {
        if (instance == null) instance = new NyraMediaBridge();
        return instance;
    }

    public void setService(NyraMediaService svc) { 
        this.service = svc; 
        if (this.service != null) {
            // Push the cached state to the newly created service immediately
            this.service.updateTrack(lastTitle, lastArtist, lastArtwork, lastDuration);
            this.service.updatePlaybackState(lastIsPlaying, lastPosition);
        }
    }
    
    public void setPlugin(NyraMediaPlugin p) { this.plugin = p; }

    public void updateTrack(String title, String artist, String artwork, long durationMs) {
        this.lastTitle = title;
        this.lastArtist = artist;
        this.lastArtwork = artwork;
        this.lastDuration = durationMs;
        if (service != null) service.updateTrack(title, artist, artwork, durationMs);
    }

    public void updatePlaybackState(boolean isPlaying, long positionMs) {
        this.lastIsPlaying = isPlaying;
        this.lastPosition = positionMs;
        if (service != null) service.updatePlaybackState(isPlaying, positionMs);
    }

    public void commandWebPlayer(String command) {
        if (plugin != null) plugin.sendCommandToWeb(command, 0);
    }

    public void commandWebPlayerSeek(long positionMs) {
        if (plugin != null) plugin.sendCommandToWeb("seek", positionMs);
    }
}
