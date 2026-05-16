package com.nyra.pulse;

import androidx.annotation.Nullable;
import androidx.media3.session.MediaLibraryService;
import androidx.media3.session.MediaSession;
import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import androidx.media3.session.LibraryResult;

public class NyraMediaService extends MediaLibraryService {
    private MediaLibrarySession mediaLibrarySession;
    private NyraVirtualPlayer virtualPlayer;

    @Override
    public void onCreate() {
        super.onCreate();
        virtualPlayer = new NyraVirtualPlayer();
        mediaLibrarySession = new MediaLibrarySession.Builder(this, virtualPlayer,
                new MediaLibrarySession.Callback() {
                    @Override
                    public ListenableFuture<LibraryResult<ImmutableList<androidx.media3.common.MediaItem>>>
                    onGetChildren(MediaLibrarySession session, MediaSession.ControllerInfo browser,
                                  String parentId, int page, int pageSize,
                                  @Nullable MediaLibraryService.LibraryParams params) {
                        return Futures.immediateFuture(
                                LibraryResult.ofItemList(ImmutableList.of(), params));
                    }
                }).build();
        NyraMediaBridge.getInstance().setService(this);
    }

    public void updateTrack(String title, String artist, String artwork, long durationMs) {
        virtualPlayer.updateTrack(title, artist, artwork, durationMs);
    }

    public void updatePlaybackState(boolean isPlaying, long positionMs) {
        virtualPlayer.updatePlaybackState(isPlaying, positionMs);
    }

    @Nullable
    @Override
    public MediaLibrarySession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaLibrarySession;
    }

    @Override
    public void onDestroy() {
        if (mediaLibrarySession != null) { mediaLibrarySession.release(); mediaLibrarySession = null; }
        if (virtualPlayer != null) { virtualPlayer.release(); virtualPlayer = null; }
        super.onDestroy();
    }
}
