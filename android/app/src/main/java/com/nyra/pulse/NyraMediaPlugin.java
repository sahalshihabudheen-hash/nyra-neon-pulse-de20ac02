package com.nyra.pulse;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NyraMedia")
public class NyraMediaPlugin extends Plugin {

    @Override
    public void load() {
        NyraMediaBridge.getInstance().setPlugin(this);
    }

    @PluginMethod
    public void updateTrack(PluginCall call) {
        String title   = call.getString("title", "Unknown");
        String artist  = call.getString("artist", "");
        String artwork = call.getString("artwork", "");
        long duration  = call.getLong("duration", 0L);
        NyraMediaBridge.getInstance().updateTrack(title, artist, artwork, duration);
        call.resolve();
    }

    @PluginMethod
    public void setPlaybackState(PluginCall call) {
        boolean isPlaying = Boolean.TRUE.equals(call.getBoolean("isPlaying", false));
        long position     = call.getLong("position", 0L);
        NyraMediaBridge.getInstance().updatePlaybackState(isPlaying, position);
        call.resolve();
    }

    /** Called by native car controls → sends JS event back to the WebView */
    public void sendCommandToWeb(String command, long seekPositionMs) {
        JSObject data = new JSObject();
        data.put("command", command);
        data.put("position", seekPositionMs);
        notifyListeners("carCommand", data);
    }
}
