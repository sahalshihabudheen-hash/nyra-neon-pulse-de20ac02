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
        final String title   = call.getString("title", "Unknown");
        final String artist  = call.getString("artist", "");
        final String artwork = call.getString("artwork", "");
        final long duration  = call.getLong("duration", 0L);
        // Must run on UI/main thread because SimpleBasePlayer requires it
        getActivity().runOnUiThread(() ->
            NyraMediaBridge.getInstance().updateTrack(title, artist, artwork, duration)
        );
        call.resolve();
    }

    @PluginMethod
    public void setPlaybackState(PluginCall call) {
        final boolean isPlaying = Boolean.TRUE.equals(call.getBoolean("isPlaying", false));
        final long position     = call.getLong("position", 0L);
        // Must run on UI/main thread
        getActivity().runOnUiThread(() ->
            NyraMediaBridge.getInstance().updatePlaybackState(isPlaying, position)
        );
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
