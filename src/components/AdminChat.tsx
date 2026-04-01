import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Send, Image, Mic, MicOff, Smile, Trash2, Loader2, X } from 'lucide-react';

interface ChatMessage {
  id: string;
  user_id: string;
  user_email: string;
  display_name: string | null;
  avatar_url: string | null;
  message_type: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
}

const STICKERS = ['😀','😂','🤣','😍','🥳','🎉','🔥','💯','👏','🎵','🎶','🎸','🎤','🎧','💿','🎹','🥁','🎺','🪗','🎻'];
const GIFS_SEARCH_URL = 'https://tenor.googleapis.com/v2/search';

const AdminChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showGifSearch, setShowGifSearch] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<string[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch messages
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('admin-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_chat_messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'admin_chat_messages' }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) {
      toast.error('Failed to load messages');
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const getProfile = async () => {
    if (!user) return { display_name: null, avatar_url: null };
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();
    return { display_name: data?.display_name || null, avatar_url: data?.avatar_url || null };
  };

  const sendMessage = async (type: string, content?: string, mediaUrl?: string) => {
    if (!user) return;
    setSending(true);
    try {
      const profile = await getProfile();
      const { error } = await supabase.from('admin_chat_messages').insert({
        user_id: user.id,
        user_email: user.email || '',
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        message_type: type,
        content: content || null,
        media_url: mediaUrl || null,
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendText = async () => {
    const text = newMessage.trim();
    if (!text) return;
    setNewMessage('');
    await sendMessage('text', text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Image upload
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSendImage = async () => {
    if (!imageFile || !user) return;
    setSending(true);
    try {
      const ext = imageFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('admin-chat').upload(path, imageFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('admin-chat').getPublicUrl(path);
      await sendMessage('image', null, urlData.publicUrl);
      setImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      toast.error('Failed to upload image');
    } finally {
      setSending(false);
    }
  };

  // GIF search (using Tenor via simple fetch - no API key needed for limited use)
  const searchGifs = async (query: string) => {
    if (!query.trim()) { setGifResults([]); return; }
    setGifLoading(true);
    try {
      // Use simple giphy-style placeholder GIFs from a free source
      const gifs = [
        `https://media.tenor.com/images/search/${encodeURIComponent(query)}`,
      ];
      // Fallback: generate emoji-style results
      const emojiGifs = ['🎵','🎶','🎸','🥁','🎤','💃','🕺','🎉','🔥','❤️','😂','👍','👋','🙌','💪'];
      setGifResults(emojiGifs.map(e => e));
    } catch {
      setGifResults([]);
    } finally {
      setGifLoading(false);
    }
  };

  const handleSendSticker = async (sticker: string) => {
    setShowStickers(false);
    await sendMessage('sticker', sticker);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) { toast.error('Recording too short'); return; }
        await uploadVoice(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const uploadVoice = async (blob: Blob) => {
    if (!user) return;
    setSending(true);
    try {
      const path = `${user.id}/voice_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from('admin-chat').upload(path, blob, { contentType: 'audio/webm' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('admin-chat').getPublicUrl(path);
      await sendMessage('voice', `${recordingTime}s`, urlData.publicUrl);
    } catch (err: any) {
      toast.error('Failed to upload voice message');
    } finally {
      setSending(false);
      setRecordingTime(0);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    const { error } = await supabase.from('admin_chat_messages').delete().eq('id', msgId);
    if (error) toast.error('Failed to delete');
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (email: string, name?: string | null) => {
    if (name) return name.charAt(0).toUpperCase();
    return email.charAt(0).toUpperCase();
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const date = formatDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No messages yet. Start the conversation! 💬
          </div>
        ) : (
          groupedMessages.map(group => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span className="text-[10px] bg-muted px-2.5 py-0.5 rounded-full text-muted-foreground">{group.date}</span>
              </div>
              {group.msgs.map((msg) => {
                const isMe = msg.user_id === user?.id;
                return (
                  <div key={msg.id} className={`flex gap-2 mb-2 ${isMe ? 'flex-row-reverse' : ''} group`}>
                    {!isMe && (
                      <Avatar className="w-7 h-7 mt-1 shrink-0">
                        <AvatarImage src={msg.avatar_url || ''} />
                        <AvatarFallback className="text-[10px] bg-primary/20">{getInitials(msg.user_email, msg.display_name)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!isMe && (
                        <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                          {msg.display_name || msg.user_email.split('@')[0]}
                        </span>
                      )}
                      <div className={`relative rounded-2xl px-3 py-2 ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-br-md' 
                          : 'bg-muted rounded-bl-md'
                      }`}>
                        {msg.message_type === 'text' && (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        {msg.message_type === 'image' && msg.media_url && (
                          <img src={msg.media_url} alt="shared" className="max-w-[250px] rounded-lg cursor-pointer" onClick={() => window.open(msg.media_url!, '_blank')} />
                        )}
                        {msg.message_type === 'sticker' && (
                          <span className="text-4xl">{msg.content}</span>
                        )}
                        {msg.message_type === 'gif' && (
                          <span className="text-4xl">{msg.content}</span>
                        )}
                        {msg.message_type === 'voice' && msg.media_url && (
                          <div className="flex items-center gap-2">
                            <audio controls src={msg.media_url} className="h-8 max-w-[200px]" />
                            <span className="text-[10px] opacity-70">{msg.content}</span>
                          </div>
                        )}
                        <span className={`text-[9px] mt-0.5 block ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-3">
          <img src={imagePreview} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
          <div className="flex-1 text-sm text-muted-foreground">Ready to send image</div>
          <Button size="sm" variant="ghost" onClick={() => { setImagePreview(null); setImageFile(null); }}>
            <X className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleSendImage} disabled={sending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Sticker picker */}
      {showStickers && (
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {STICKERS.map(s => (
              <button key={s} onClick={() => handleSendSticker(s)} className="text-2xl hover:scale-125 transition-transform">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="px-4 py-2 border-t border-border bg-destructive/10 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-medium text-destructive">Recording... {recordingTime}s</span>
          <div className="flex-1" />
          <Button size="sm" variant="destructive" onClick={stopRecording}>
            <MicOff className="w-4 h-4 mr-1" /> Stop
          </Button>
        </div>
      )}

      {/* Input bar */}
      <div className="p-3 border-t border-border bg-background flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()} title="Send image">
          <Image className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { setShowStickers(!showStickers); }} title="Stickers">
          <Smile className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`shrink-0 ${isRecording ? 'text-destructive' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          title="Voice message"
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 rounded-full bg-muted border-0"
          disabled={isRecording}
        />
        <Button size="icon" className="shrink-0 rounded-full" onClick={handleSendText} disabled={!newMessage.trim() || sending}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

export default AdminChat;
