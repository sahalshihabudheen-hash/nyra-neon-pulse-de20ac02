package com.nyra.pulse;

public class NyraMediaBridge {
    private static NyraMediaBridge instance;
    private NyraMediaService service;
    private NyraMediaPlugin plugin;

    public static NyraMediaBridge getInstance() {
        if (instance == null) instance = new NyraMediaBridge();
        return instance;
    }

    public void setService(NyraMediaService svc) { this.service = svc; }
    public void setPlugin(NyraMediaPlugin p) { this.plugin = p; }

    public void updateTrack(String title, String artist, String artwork, long durationMs) {
        if (service != null) service.updateTrack(title, artist, artwork, durationMs);
    }

    public void updatePlaybackState(boolean isPlaying, long positionMs) {
        if (service != null) service.updatePlaybackState(isPlaying, positionMs);
    }

    public void commandWebPlayer(String command) {
        if (plugin != null) plugin.sendCommandToWeb(command, 0);
    }

    public void commandWebPlayerSeek(long positionMs) {
        if (plugin != null) plugin.sendCommandToWeb("seek", positionMs);
    }
}
