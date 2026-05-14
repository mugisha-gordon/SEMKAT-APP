import { useState, useRef, useEffect, type WheelEvent, type TouchEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Sparkles, Volume2, VolumeX, ChevronUp, ChevronDown, Trash2, MessageSquareText, Send, Plus, Play, Pause } from "lucide-react";
import { addVideoComment, deleteVideo, subscribeToVideoComments, toggleVideoLike } from "@/integrations/firebase/videos";
import type { VideoCommentDocument, VideoDocument } from "@/integrations/firebase/videos";
import { useAuth } from "@/context/AuthContext";
import { getUserDocument } from "@/integrations/firebase/users";
import { toast } from "sonner";
import VideoPostForm from "@/components/video/VideoPostForm";
import MessageDialog from "@/components/messaging/MessageDialog";
import { deleteFile } from "@/integrations/firebase/storage";
import { subscribeToVideosFeed } from "@/integrations/firebase/videosFeed";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Explore = () => {
  const EXPLORE_PLAYBACK_KEY = "semkat_explore_playback_v1";
  const { user, role } = useAuth();
  const shuffleSeedRef = useRef<number>(Date.now());
  const [clips, setClips] = useState<VideoDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorNames, setAuthorNames] = useState<{ [userId: string]: string }>({});
  const [authorAvatars, setAuthorAvatars] = useState<{ [userId: string]: string | undefined }>({});
  const authorFetchInFlightRef = useRef<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const userToggledMuteRef = useRef(false);
  const autoplayForcedMutedRef = useRef(false);
  const [muted, setMuted] = useState(() => {
    const raw = localStorage.getItem('semkat_explore_muted');
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    // Default preference: sound ON.
    return false;
  });
  const [paused, setPaused] = useState(false);
  const userPausedRef = useRef(false);
  const [readyByClipId, setReadyByClipId] = useState<Record<string, boolean>>({});
  const [errorByClipId, setErrorByClipId] = useState<Record<string, boolean>>({});
  const [messageOpen, setMessageOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<VideoCommentDocument[]>([]);
  const [focusCommentId, setFocusCommentId] = useState<string | null>(null);
  const [showJumpBanner, setShowJumpBanner] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VideoDocument | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const restorePlaybackRef = useRef<{ id: string; time: number } | null>(null);
  const hasAppliedRestoreRef = useRef(false);
  const lastNavAtRef = useRef<number>(0);
  const navLockRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const currentClip = clips[currentIndex];

  // Header is intentionally removed on Explore for an immersive full-screen feed.

  const readSavedPlayback = () => {
    try {
      const raw = sessionStorage.getItem(EXPLORE_PLAYBACK_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (typeof parsed.id !== "string") return null;
      const time = Number(parsed.time || 0);
      return { id: parsed.id, time: Number.isFinite(time) ? Math.max(0, time) : 0 };
    } catch {
      return null;
    }
  };

  const savePlayback = (id: string, time: number) => {
    try {
      sessionStorage.setItem(
        EXPLORE_PLAYBACK_KEY,
        JSON.stringify({
          id,
          time: Number.isFinite(time) ? Math.max(0, time) : 0,
          savedAt: Date.now(),
        })
      );
    } catch {
      // ignore storage failures
    }
  };

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (!currentClip?.id) return;
    const video = videoRefs.current[currentIndex];
    savePlayback(currentClip.id, video?.currentTime || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentClip?.id]);

  const attemptPlayByIndex = async (index: number, tryCount: number = 0) => {
    const video = videoRefs.current[index];
    if (!video) {
      if (tryCount < 4) {
        setTimeout(() => void attemptPlayByIndex(index, tryCount + 1), 120);
      }
      return;
    }

    if (index !== currentIndexRef.current) return;
    if (userPausedRef.current) return;

    try {
      // Ensure element is in a good state for autoplay
      video.playsInline = true;
      video.muted = muted;
      await video.play();
    } catch {
      // Autoplay is often blocked when not muted; fall back to muted autoplay.
      if (!muted) {
        autoplayForcedMutedRef.current = true;
        setMuted(true);
        return;
      }
      if (tryCount < 4) {
        setTimeout(() => void attemptPlayByIndex(index, tryCount + 1), 180);
      }
    }
  };

  const location = useLocation() as { state?: { fromUpload?: boolean } };

  const readAuthorCache = () => {
    try {
      const raw = localStorage.getItem('semkat_author_cache_v1');
      if (!raw) return {} as Record<string, { name?: string; avatar?: string }>;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {} as Record<string, { name?: string; avatar?: string }>;
      return parsed as Record<string, { name?: string; avatar?: string }>;
    } catch {
      return {} as Record<string, { name?: string; avatar?: string }>;
    }
  };

  const writeAuthorCache = (next: Record<string, { name?: string; avatar?: string }>) => {
    try {
      localStorage.setItem('semkat_author_cache_v1', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const displayNameForUserId = (userId: string) => {
    const fromState = authorNames[userId];
    if (fromState && fromState !== 'Unknown') return fromState;
    const cached = readAuthorCache();
    const fromCache = cached?.[userId]?.name;
    if (fromCache && fromCache !== 'Unknown') return fromCache;
    return 'User';
  };

  const rankForId = (id: string) => {
    // Deterministic pseudo-random rank based on seed + id
    let h = 2166136261;
    const s = `${shuffleSeedRef.current}:${id}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const shuffleBySeed = (items: VideoDocument[]) => {
    return [...items].sort((a, b) => rankForId(a.id) - rankForId(b.id));
  };

  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeToVideosFeed(
      30,
      (videos) => {
        setClips(shuffleBySeed(videos));
        setLoading(false);
        setCurrentIndex((i) => Math.min(i, Math.max(0, videos.length - 1)));
      },
      (error) => {
        console.error("Error subscribing to videos:", error);
        toast.error("Failed to load videos");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (hasAppliedRestoreRef.current) return;
    if (!clips.length) return;

    const saved = readSavedPlayback();
    if (!saved) {
      hasAppliedRestoreRef.current = true;
      return;
    }

    const idx = clips.findIndex((v) => v.id === saved.id);
    if (idx >= 0) {
      restorePlaybackRef.current = saved;
      setCurrentIndex(idx);
    }
    hasAppliedRestoreRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips]);

  // Keep author metadata in sync as the feed updates
  useEffect(() => {
    const userIds = [...new Set(clips.map((v) => v.userId))];

    // Pre-fill from cache so names persist across refresh (even if user docs can't be read).
    const cached = readAuthorCache();
    if (Object.keys(cached).length) {
      setAuthorNames((prev) => {
        const next = { ...prev };
        userIds.forEach((id) => {
          const c = cached[id];
          if (c?.name && !next[id]) next[id] = c.name;
        });
        return next;
      });
      setAuthorAvatars((prev) => {
        const next = { ...prev };
        userIds.forEach((id) => {
          const c = cached[id];
          if (c?.avatar && !next[id]) next[id] = c.avatar;
        });
        return next;
      });
    }

    const missingIds = userIds.filter((id) => {
      const hasName = authorNames[id] && authorNames[id] !== "Unknown";
      if (hasName) return false;
      if (authorFetchInFlightRef.current.has(id)) return false;
      return true;
    });
    if (missingIds.length === 0) return;

    missingIds.forEach((id) => authorFetchInFlightRef.current.add(id));

    Promise.all(
      missingIds.map(async (userId) => {
        try {
          const userDoc = await getUserDocument(userId);
          const fullName = userDoc?.profile?.fullName || undefined;
          const email = (userDoc as any)?.email || undefined;
          const emailName = typeof email === 'string' && email.includes('@') ? email.split('@')[0] : undefined;
          const name = fullName || emailName;
          if (!name) return null;
          return {
            userId,
            name,
            avatar: userDoc?.profile.avatarUrl || undefined,
          };
        } catch {
          // Likely permission denied before auth initializes or transient network error.
          // Avoid caching 'Unknown' so we can retry later.
          return null;
        }
      })
    )
      .then((results) => {
        results.forEach((r: any) => {
          if (r?.userId) authorFetchInFlightRef.current.delete(r.userId);
        });
        setAuthorNames((prev) => {
          const next = { ...prev };
          results.filter(Boolean).forEach((r: any) => {
            next[r.userId] = r.name;
          });
          return next;
        });
        setAuthorAvatars((prev) => {
          const next = { ...prev };
          results.filter(Boolean).forEach((r: any) => {
            next[r.userId] = r.avatar;
          });
          return next;
        });

        // Persist successful lookups
        const cache = readAuthorCache();
        let changed = false;
        results.filter(Boolean).forEach((r: any) => {
          if (!r?.userId || !r?.name || r.name === 'Unknown') return;
          const prevEntry = cache[r.userId] || {};
          const nextEntry = {
            name: r.name,
            avatar: r.avatar || prevEntry.avatar,
          };
          cache[r.userId] = nextEntry;
          changed = true;
        });
        if (changed) writeAuthorCache(cache);
      })
      .catch(() => {
        missingIds.forEach((id) => authorFetchInFlightRef.current.delete(id));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips]);

  const setStatusBarVisible = (next: boolean) => {
    window.dispatchEvent(new CustomEvent("semkat:exploreStatusBar", { detail: { visible: next } }));
  };

  const markUserInteraction = () => {
    if (hasUserInteractedRef.current) return;
    hasUserInteractedRef.current = true;
    setHasUserInteracted(true);

    // If user didn't explicitly choose muted, enable sound after first gesture.
    if (!userToggledMuteRef.current) {
      autoplayForcedMutedRef.current = false;
      setMuted(false);
      try {
        localStorage.setItem('semkat_explore_muted', 'false');
      } catch {
        // ignore storage issues
      }
      // Re-attempt playback now that gesture has occurred.
      void attemptPlayByIndex(currentIndexRef.current, 0);
    }
  };

  // If we navigated here right after an upload, jump to the newest clip
  useEffect(() => {
    if (location.state?.fromUpload) {
      // Wait a moment for Firestore to update, then jump to newest
      setTimeout(() => {
        setCurrentIndex(0);
      }, 500);
    }
  }, [location.state, clips]);

  // Deep-link support from notifications/share links.
  // Examples: /explore?video=<id>, /explore?video=<id>&focus=comments
  useEffect(() => {
    if (!clips.length) return;
    const params = new URLSearchParams(location.search);
    const targetVideoId = params.get("video");
    const focus = params.get("focus");
    const commentId = params.get("comment");
    if (!targetVideoId) return;

    const idx = clips.findIndex((c) => c.id === targetVideoId);
    if (idx < 0) return;

    userPausedRef.current = false;
    setPaused(false);
    setCurrentIndex(idx);
    setFocusCommentId(commentId || null);
    setShowJumpBanner(true);
    if (focus === "comments") {
      setTimeout(() => {
        setCommentsOpen(true);
      }, 250);
    }
  }, [clips, location.search]);

  useEffect(() => {
    if (!showJumpBanner) return;
    const timer = setTimeout(() => setShowJumpBanner(false), 2800);
    return () => clearTimeout(timer);
  }, [showJumpBanner]);

  useEffect(() => {
    if (!commentsOpen || !focusCommentId) return;
    const el = document.getElementById(`comment-${focusCommentId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [commentsOpen, comments, focusCommentId]);

  const refreshVideos = async () => {
    // kept for backwards compatibility with the upload button (realtime already updates)
    setCurrentIndex(0);
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < clips.length) {
      setCurrentIndex(index);
    }
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(clips.length - 1, prev + 1));
    setStatusBarVisible(false);
    userToggledMuteRef.current = false;
    autoplayForcedMutedRef.current = false;
    setMuted(false);
    try {
      localStorage.setItem('semkat_explore_muted', 'false');
    } catch {
      // ignore
    }
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setStatusBarVisible(true);
  };

  const lockNav = () => {
    navLockRef.current = true;
    setTimeout(() => {
      navLockRef.current = false;
    }, 450);
  };

  const handleScroll = (e: WheelEvent) => {
    markUserInteraction();
    // React may attach wheel listeners as passive in some environments.
    // Guard preventDefault to avoid console noise when event is non-cancelable.
    if (e.cancelable) {
      e.preventDefault();
    }

    // Desktop interaction: if autoplay forced us to mute, unmute on first user intent
    // unless they explicitly chose muted.
    if (autoplayForcedMutedRef.current && !userToggledMuteRef.current) {
      autoplayForcedMutedRef.current = false;
      setMuted(false);
    }

    const now = Date.now();
    if (navLockRef.current) return;
    if (now - lastNavAtRef.current < 450) return;
    if (e.deltaY > 0 && currentIndex < clips.length - 1) {
      lastNavAtRef.current = now;
      lockNav();
      goToNext();
    } else if (e.deltaY < 0 && currentIndex > 0) {
      lastNavAtRef.current = now;
      lockNav();
      goToPrev();
    }
  };

  // Touch handling for mobile
  const touchStartY = useRef(0);
  const handleTouchStart = (e: TouchEvent) => {
    markUserInteraction();
    touchStartY.current = e.touches[0].clientY;

    // If autoplay forced us to mute, and the user hasn't explicitly muted,
    // treat the first interaction as intent to enable sound.
    if (autoplayForcedMutedRef.current && !userToggledMuteRef.current) {
      autoplayForcedMutedRef.current = false;
      setMuted(false);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    markUserInteraction();
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    const now = Date.now();
    if (navLockRef.current) return;
    if (now - lastNavAtRef.current < 450) return;
    if (Math.abs(deltaY) > 40) {
      if (deltaY > 0 && currentIndex < clips.length - 1) {
        lastNavAtRef.current = now;
        lockNav();
        goToNext();
      } else if (deltaY < 0 && currentIndex > 0) {
        lastNavAtRef.current = now;
        lockNav();
        goToPrev();
      }
    }
  };

  useEffect(() => {
    // Ensure we leave Explore with the status bar visible.
    setStatusBarVisible(true);
    return () => {
      const clip = clips[currentIndexRef.current];
      const video = videoRefs.current[currentIndexRef.current];
      if (clip?.id) {
        savePlayback(clip.id, video?.currentTime || 0);
      }
      setStatusBarVisible(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips]);

  // Play/pause videos based on current index
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          // Autoplay is only allowed by browsers when muted (and playsInline on iOS).
          // If the element isn't ready yet, the onCanPlay handler below will kick it too.
          if (!userPausedRef.current) {
            video.play().catch(() => {});
          }
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex, clips.length, muted]);

  // When switching clips, default to playing the new clip
  useEffect(() => {
    userPausedRef.current = false;
    setPaused(false);
  }, [currentIndex]);

  // Ensure the currently visible video starts playing after swipe/scroll
  useEffect(() => {
    void attemptPlayByIndex(currentIndexRef.current, 0);
    setTimeout(() => {
      void attemptPlayByIndex(currentIndexRef.current, 0);
    }, 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, muted]);

  const togglePlayPause = () => {
    const video = videoRefs.current[currentIndex];
    if (!video) return;

    if (video.paused) {
      userPausedRef.current = false;
      video.play().then(() => setPaused(false)).catch(() => {});
    } else {
      video.pause();
      userPausedRef.current = true;
      setPaused(true);
    }
  };

  const toggleLike = async (clipId: string) => {
    if (!user) {
      toast.error('Please log in to like videos');
      return;
    }

    try {
      const result = await toggleVideoLike(clipId, user.uid);
      // Update local state
      setClips(prev => prev.map(clip => 
        clip.id === clipId 
          ? { ...clip, likes: result.likes, likedBy: result.liked ? [...(clip.likedBy || []), user.uid] : (clip.likedBy || []).filter(id => id !== user.uid) }
          : clip
      ));
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error(error.message || 'Failed to like video');
    }
  };

  const handleShare = async (clip: VideoDocument) => {
    const shareUrl = `${window.location.origin}/explore?video=${encodeURIComponent(clip.id)}`;
    const shareText = `${clip.title} • ${clip.location}`;

    try {
      const nav: any = navigator;
      if (nav?.share) {
        await nav.share({ title: clip.title, text: shareText, url: shareUrl });
        toast.success('Shared');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied');
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      toast.success('Link copied');
    } catch (error: any) {
      console.error('Share failed', error);
      toast.error(error?.message || 'Failed to share');
    }
  };

  const handleDelete = async (clip: VideoDocument) => {
    if (!user) {
      toast.error('Please log in');
      return;
    }

    const isAdmin = role === 'admin' || user.email === 'adminsemkat@gmail.com';
    if (clip.userId !== user.uid && !isAdmin) {
      toast.error('You can only delete your own videos');
      return;
    }
    setDeleteTarget(clip);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    const clip = deleteTarget;
    if (!clip) return;
    if (!user) return;

    try {
      toast.loading('Deleting video...', { id: `delete-video-${clip.id}` });
      await deleteVideo(clip.id);
      if (clip.videoUrl) {
        await deleteFile(clip.videoUrl);
      }
      toast.success('Video deleted', { id: `delete-video-${clip.id}` });

      setClips((prev) => {
        const next = prev.filter((v) => v.id !== clip.id);
        setCurrentIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
        return next;
      });
    } catch (error: any) {
      console.error('Error deleting video:', error);
      toast.error(error.message || 'Failed to delete video', { id: `delete-video-${clip.id}` });
    } finally {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    if (!commentsOpen) {
      setComments([]);
      setCommentDraft("");
      return;
    }

    if (!currentClip?.id) return;

    const unsubscribe = subscribeToVideoComments(currentClip.id, (data) => {
      setComments(data);

      const commenterIds = [...new Set(data.map((c) => c.userId))];
      const missingIds = commenterIds.filter((id) => !authorNames[id]);
      if (missingIds.length === 0) return;

      Promise.all(
        missingIds.map(async (userId) => {
          try {
            const userDoc = await getUserDocument(userId);
            return {
              userId,
              name: userDoc?.profile.fullName || 'Unknown',
              avatar: userDoc?.profile.avatarUrl || undefined,
            };
          } catch {
            return { userId, name: 'Unknown', avatar: undefined };
          }
        })
      )
        .then((results) => {
          setAuthorNames((prev) => {
            const next = { ...prev };
            results.forEach((r) => {
              next[r.userId] = r.name;
            });
            return next;
          });
          setAuthorAvatars((prev) => {
            const next = { ...prev };
            results.forEach((r) => {
              next[r.userId] = r.avatar;
            });
            return next;
          });
        })
        .catch(() => {});
    });

    return () => {
      unsubscribe();
    };
  }, [commentsOpen, currentClip?.id]);

  const handleSendComment = async () => {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    if (!currentClip?.id) return;

    const content = commentDraft.trim();
    if (!content) return;

    setCommentSending(true);
    try {
      await addVideoComment(currentClip.id, user.uid, content);
      setCommentDraft("");

      // optimistic counter update
      setClips((prev) =>
        prev.map((v) => (v.id === currentClip.id ? { ...v, comments: (v.comments || 0) + 1 } : v))
      );
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error(error.message || 'Failed to add comment');
    } finally {
      setCommentSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-white">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-semkat-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Loading videos...</p>
          </div>
        </main>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-white">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-white/60">No videos yet</p>
            <p className="text-white/40 text-sm mt-1">Be the first to post a video!</p>

            {user ? (
              <div className="mt-5 flex justify-center">
                <VideoPostForm
                  onSuccess={() => {
                    setCurrentIndex(0);
                    setTimeout(() => {
                      refreshVideos();
                    }, 1000);
                  }}
                  triggerVariant="hero"
                  triggerSize="lg"
                  triggerClassName="h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
                  triggerLabel=""
                />
              </div>
            ) : (
              <div className="mt-5 flex justify-center">
                <Button
                  variant="hero"
                  className="gap-2"
                  onClick={() => {
                    window.location.href = "/auth";
                  }}
                >
                  <Plus className="h-5 w-5" />
                  Post Video
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const isLiked = user && currentClip?.likedBy?.includes(user.uid);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-950 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This action cannot be undone. The video will be removed from Explore and deleted from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main
        className="relative overflow-hidden min-h-0"
        style={{ height: "100dvh" }}
      >
        {/* Upload button - Plus button for logged in users */}
        {user && (
          <div
            className="absolute left-4 z-50 flex items-center gap-2"
            style={{ top: "1rem" }}
          >
            <VideoPostForm
              onSuccess={() => {
                // Refresh and scroll to top to show new video
                setCurrentIndex(0);
                setTimeout(() => {
                  refreshVideos();
                }, 1000);
              }}
              triggerVariant="hero"
              triggerSize="icon"
              triggerClassName="h-11 w-11 sm:h-12 sm:w-12 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
              triggerLabel="+"
            />
          </div>
        )}

        {currentClip && (
          <MessageDialog
            open={messageOpen}
            onOpenChange={setMessageOpen}
            otherUserId={currentClip.userId}
            otherUserName={displayNameForUserId(currentClip.userId)}
          />
        )}

        {currentClip && (
          <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
            <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading">Comments</DialogTitle>
                <DialogDescription className="sr-only">
                  Video comments.
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
                {comments.length === 0 ? (
                  <p className="text-white/50 text-sm">No comments yet. Be the first to comment.</p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      id={`comment-${c.id}`}
                      className={`flex gap-3 rounded-md p-1 ${
                        focusCommentId === c.id ? "bg-semkat-orange/10 ring-1 ring-semkat-orange/40" : ""
                      }`}
                    >
                      <Link to={`/profile/${c.userId}`} className="shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={authorAvatars[c.userId]} />
                          <AvatarFallback className="bg-white/10 text-white/80 text-xs">
                            {displayNameForUserId(c.userId).slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <Link to={`/profile/${c.userId}`} className="text-sm text-white/90 hover:underline">
                            {displayNameForUserId(c.userId)}
                          </Link>
                          <p className="text-xs text-white/40">
                            {c.createdAt?.toDate?.().toLocaleString?.()}
                          </p>
                        </div>
                        <p className="text-sm text-white/75 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/10 pt-3 flex gap-2">
                <Input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Write a comment..."
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                  disabled={commentSending}
                />
                <Button
                  variant="hero"
                  size="icon"
                  onClick={handleSendComment}
                  disabled={commentSending || !commentDraft.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* TikTok-style vertical snap scroll container */}
        <div
          ref={containerRef}
          className="relative overflow-hidden h-full"
          style={{ height: "100dvh" }}
          onWheel={handleScroll}
          onMouseDown={markUserInteraction}
          onPointerDown={markUserInteraction}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            markUserInteraction();
            // Tap to reveal controls briefly (including StatusBar)
            setStatusBarVisible(true);
            setTimeout(() => setStatusBarVisible(false), 1800);
          }}
        >
          {/* Video slides */}
          <div
            className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] h-full flex flex-col"
            style={{ transform: `translate3d(0, -${currentIndex * 100}%, 0)`, willChange: 'transform' }}
          >
            {clips.map((clip, index) => (
              <div key={clip.id} className="h-full w-full shrink-0 relative flex items-center justify-center bg-black">
                {Math.abs(index - currentIndex) <= 1 ? (
                  <video
                    ref={el => { videoRefs.current[index] = el; }}
                    className="h-full w-full max-h-full max-w-full object-contain bg-black"
                    src={clip.videoUrl}
                    poster={clip.coverUrl || undefined}
                    muted={index === currentIndex ? muted : true}
                    autoPlay={index === currentIndex && (muted || hasUserInteracted)}
                    loop
                    playsInline
                    controls={false}
                    preload="auto"
                    onLoadedData={() => {
                      const restore = restorePlaybackRef.current;
                      if (
                        restore &&
                        index === currentIndexRef.current &&
                        clip.id === restore.id &&
                        Number.isFinite(restore.time) &&
                        restore.time > 0
                      ) {
                        const el = videoRefs.current[index];
                        if (el) {
                          try {
                            el.currentTime = restore.time;
                          } catch {
                            // ignore seek failures
                          }
                        }
                        restorePlaybackRef.current = null;
                      }
                      setReadyByClipId((prev) => ({ ...prev, [clip.id]: true }));
                      setErrorByClipId((prev) => ({ ...prev, [clip.id]: false }));
                      if (index === currentIndexRef.current && !userPausedRef.current) {
                        void attemptPlayByIndex(index, 0);
                      }
                    }}
                    onLoadedMetadata={() => {
                      setReadyByClipId((prev) => ({ ...prev, [clip.id]: true }));
                      setErrorByClipId((prev) => ({ ...prev, [clip.id]: false }));
                    }}
                    onError={() => {
                      setErrorByClipId((prev) => ({ ...prev, [clip.id]: true }));
                    }}
                    onCanPlay={() => {
                      if (index !== currentIndexRef.current) return;
                      if (userPausedRef.current) return;
                      void attemptPlayByIndex(index, 0);
                    }}
                  />
                ) : clip.coverUrl ? (
                  <img
                    src={clip.coverUrl}
                    alt={clip.title}
                    className="h-full w-full object-contain bg-black"
                    draggable={false}
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-black" />
                )}

                {/* Loading / error overlay to avoid blank screens */}
                {index === currentIndex && !readyByClipId[clip.id] && !errorByClipId[clip.id] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-10 h-10 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {index === currentIndex && errorByClipId[clip.id] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center">
                    <p className="text-white/80 text-sm">This video failed to load. Swipe to the next one.</p>
                  </div>
                )}
                
                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                
                {/* Content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 pb-20 sm:pb-24">
                  <Badge 
                    variant="outline" 
                    className="border-white/40 text-white/90 mb-3 bg-black/30 backdrop-blur-sm"
                  >
                    {clip.role === "agent" ? "Agent" : displayNameForUserId(clip.userId)} • {clip.location}
                  </Badge>
                  <h3 className="font-heading text-2xl font-bold mb-1 drop-shadow-lg">{clip.title}</h3>
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${clip.userId}`} className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 border border-white/15">
                        <AvatarImage src={authorAvatars[clip.userId]} />
                        <AvatarFallback className="bg-white/10 text-white/80 text-xs">
                          {displayNameForUserId(clip.userId).slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-white text-sm font-semibold leading-tight hover:underline">
                        {displayNameForUserId(clip.userId)}
                      </p>
                    </Link>
                  </div>
                </div>

                {/* Right side action buttons */}
                <div className="absolute right-3 sm:right-4 bottom-24 sm:bottom-32 flex flex-col flex-nowrap items-center gap-2 sm:gap-3 max-h-[62dvh] overflow-y-auto pr-1">
                  <div className="flex flex-col items-center gap-1">
                    {/* Play/Pause toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                      onClick={togglePlayPause}
                    >
                      {index === currentIndex && paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                    </Button>
                    <span className="text-[10px] leading-none text-white/80">{index === currentIndex && paused ? 'Play' : 'Pause'}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    {/* Sound toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                      onClick={() => {
                        userToggledMuteRef.current = true;
                        setMuted((m) => {
                          const next = !m;
                          localStorage.setItem('semkat_explore_muted', String(next));
                          return next;
                        });
                      }}
                    >
                      {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <span className="text-[10px] leading-none text-white/80">{muted ? 'Muted' : 'Sound'}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 ${
                        index === currentIndex && isLiked ? 'text-red-500' : 'text-white'
                      }`}
                      onClick={() => toggleLike(clip.id)}
                    >
                      <Heart className={`h-5 w-5 ${index === currentIndex && isLiked ? 'fill-current' : ''}`} />
                    </Button>
                    <span className="text-[10px] leading-none text-white/80">{clip.likes || 0}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                      onClick={() => {
                        if (!user) {
                          window.location.href = "/auth";
                          return;
                        }
                        setCommentsOpen(true);
                      }}
                    >
                      <MessageSquareText className="h-5 w-5" />
                    </Button>
                    <span className="text-[10px] leading-none text-white/80">{clip.comments || 0}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                      onClick={() => {
                        if (!user) {
                          window.location.href = "/auth";
                          return;
                        }
                        setMessageOpen(true);
                      }}
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                    <span className="text-[10px] leading-none text-white/80">Message</span>
                  </div>

                  {user && clip.userId === user.uid && (
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                        onClick={() => handleDelete(clip)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      <span className="text-[10px] leading-none text-white/80">Delete</span>
                    </div>
                  )}

                  {user && role === 'admin' && clip.userId !== user.uid && (
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                        onClick={() => handleDelete(clip)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      <span className="text-[10px] leading-none text-white/80">Delete</span>
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                      onClick={() => handleShare(clip)}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                    <span className="text-[10px] leading-none text-white/80">Share</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation indicators */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            {clips.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-1.5 h-8 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-white' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Navigation arrows */}
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-6 sm:top-10 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
              onClick={() => goToSlide(currentIndex - 1)}
            >
              <ChevronUp className="h-6 w-6" />
            </Button>
          )}
          {currentIndex < clips.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 animate-bounce"
              onClick={() => goToSlide(currentIndex + 1)}
            >
              <ChevronDown className="h-6 w-6" />
            </Button>
          )}

          {/* Header badge */}
          <div className="absolute top-4 left-16 sm:left-20 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/15">
              <Sparkles className="h-5 w-5 text-orange-300" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold">Explore</h1>
              <p className="text-white/60 text-xs">{currentIndex + 1} / {clips.length}</p>
            </div>
          </div>
        </div>

        {showJumpBanner && (
          <div className="absolute top-16 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto rounded-md border border-semkat-orange/40 bg-black/65 px-3 py-2 text-xs text-semkat-orange backdrop-blur">
            Jumped from notification
          </div>
        )}
      </main>
    </div>
  );
};

export default Explore;
