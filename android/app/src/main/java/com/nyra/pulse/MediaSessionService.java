package com.nyra.pulse;

import android.content.Intent;
import android.os.Bundle;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import androidx.media3.session.MediaLibraryService;
import androidx.media3.session.MediaLibraryService.MediaLibrarySession;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.Futures;
import java.util.List;

public class MediaSessionService extends MediaLibraryService {
    private MediaLibrarySession mediaLibrarySession;
    private ExoPlayer player;

    @Override
    public void onCreate() {
        super.onCreate();
        
        player = new ExoPlayer.Builder(this)
                .setAudioAttributes(AudioAttributes.DEFAULT, true)
                .setHandleAudioBecomingNoisy(true)
                .build();

        mediaLibrarySession = new MediaLibrarySession.Builder(this, player, new MediaLibrarySession.Callback() {
            @Override
            public ListenableFuture<LibraryResult<MediaItem>> onGetItem(MediaLibrarySession session, ControllerInfo browser, String mediaId) {
                return super.onGetItem(session, browser, mediaId);
            }

            @Override
            public ListenableFuture<LibraryResult<List<MediaItem>>> onGetChildren(MediaLibrarySession session, ControllerInfo browser, String parentId, int page, int pageSize, @Nullable LibraryResult.QueryParams params) {
                return super.onGetChildren(session, browser, parentId, page, pageSize, params);
            }
        }).build();
    }

    @Nullable
    @Override
    public MediaLibrarySession onGetSession(ControllerInfo controllerInfo) {
        return mediaLibrarySession;
    }

    @Override
    public void onDestroy() {
        if (player != null) {
            player.release();
            player = null;
        }
        if (mediaLibrarySession != null) {
            mediaLibrarySession.release();
            mediaLibrarySession = null;
        }
        super.onDestroy();
    }
}
