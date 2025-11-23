import { useRef, useState, useEffect } from 'react';

interface LaughPlayerProps {
    clipUrls: string[];
    clipIds?: string[]; // Optional for backward compatibility
    onComplete?: () => void;
    onSkip?: (index: number) => void;
    autoPlay?: boolean;
}

/**
 * LaughPlayer Component
 * 
 * Sequentially plays laugh audio clips with visual feedback
 * 
 * Features:
 * - Sequential playback with 1s silence between clips
 * - Animated waveform visualization (simplified bars)
 * - Skip button (enabled after 2s)
 * - Like button (Personalization)
 * - Replay button
 * - Volume control
 * - Stitch design system styling
 */
export function LaughPlayer({
    clipUrls,
    clipIds,
    onComplete,
    onSkip,
    autoPlay = true
}: LaughPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [canSkip, setCanSkip] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [progress, setProgress] = useState(0);
    const [liked, setLiked] = useState(false); // Visual state for current clip

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const skipTimerRef = useRef<number | null>(null);
    const progressIntervalRef = useRef<number | null>(null);

    // Initialize audio element
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.volume = volume;
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);

    // Update volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Play current clip
    useEffect(() => {
        if (autoPlay && currentIndex < clipUrls.length) {
            playClip(currentIndex);
        }
    }, [currentIndex, clipUrls, autoPlay]);

    const playClip = async (index: number) => {
        if (!audioRef.current || index >= clipUrls.length) return;

        setProgress(0);
        setCanSkip(false);
        setIsPlaying(true);
        setLiked(false); // Reset like state for new clip

        try {
            audioRef.current.src = clipUrls[index];
            await audioRef.current.play();

            // Enable skip after 2s
            skipTimerRef.current = setTimeout(() => {
                setCanSkip(true);
            }, 2000);

            // Update progress
            progressIntervalRef.current = setInterval(() => {
                if (audioRef.current) {
                    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                    setProgress(progress);
                }
            }, 100);

            // Handle clip end
            audioRef.current.onended = () => {
                setIsPlaying(false);
                setProgress(100);

                if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
                if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

                // Wait 1s before next clip
                setTimeout(() => {
                    const nextIndex = index + 1;
                    if (nextIndex < clipUrls.length) {
                        setCurrentIndex(nextIndex);
                    } else {
                        // All clips played
                        onComplete?.();
                    }
                }, 1000);
            };

        } catch (error) {
            console.error('❌ Failed to play clip:', error);
            setIsPlaying(false);
            onComplete?.(); // Skip to end on error
        }
    };

    const handleLike = async () => {
        if (liked) return; // Prevent double likes
        setLiked(true);

        // Save interaction
        if (clipIds && clipIds[currentIndex]) {
            try {
                const { saveInteraction, getInteraction } = await import('../../lib/db');
                const clipId = clipIds[currentIndex];
                const existing = await getInteraction(clipId);

                await saveInteraction({
                    clip_id: clipId,
                    liked: true,
                    skipped_count: existing?.skipped_count || 0,
                    last_played_at: Date.now()
                });
                console.log('❤️ Liked clip:', clipId);
            } catch (err) {
                console.error('Failed to save like:', err);
            }
        }
    };

    const handleSkip = async () => {
        if (!canSkip) return;

        onSkip?.(currentIndex);

        // Save interaction (Skip)
        if (clipIds && clipIds[currentIndex]) {
            try {
                const { saveInteraction, getInteraction } = await import('../../lib/db');
                const clipId = clipIds[currentIndex];
                const existing = await getInteraction(clipId);

                await saveInteraction({
                    clip_id: clipId,
                    liked: existing?.liked || false,
                    skipped_count: (existing?.skipped_count || 0) + 1,
                    last_played_at: Date.now()
                });
                console.log('⏭️ Skipped clip:', clipId);
            } catch (err) {
                console.error('Failed to save skip:', err);
            }
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        setIsPlaying(false);
        setProgress(0);

        const nextIndex = currentIndex + 1;
        if (nextIndex < clipUrls.length) {
            setCurrentIndex(nextIndex);
        } else {
            onComplete?.();
        }
    };

    const handleReplay = () => {
        setCurrentIndex(0);
        setProgress(0);
    };

    return (
        <div className="glass-panel p-6 rounded-xl space-y-4 relative overflow-hidden">
            {/* Waveform Visualization (Simplified) */}
            <div className="flex items-end justify-center h-24 space-x-1">
                {[...Array(20)].map((_, i) => {
                    const height = isPlaying
                        ? Math.random() * 60 + 20 // Animated when playing
                        : 20; // Static when paused
                    const isActive = (i / 20) * 100 <= progress;

                    return (
                        <div
                            key={i}
                            className={`w-2 rounded-full transition-all duration-100 ${isActive
                                ? 'bg-gradient-to-t from-stitch-primary to-stitch-secondary'
                                : 'bg-stitch-surface'
                                }`}
                            style={{
                                height: `${height}%`,
                                opacity: isActive ? 1 : 0.3
                            }}
                        />
                    );
                })}
            </div>

            {/* Progress Text */}
            <div className="text-center text-sm text-stitch-muted">
                Clip {currentIndex + 1} of {clipUrls.length}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-stitch-surface rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-stitch-primary to-stitch-accent transition-all duration-200"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
                {/* Volume Control */}
                <div className="flex items-center gap-2 flex-1">
                    <span className="text-stitch-muted text-sm">🔊</span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume * 100}
                        onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
                        className="flex-1 h-2 bg-stitch-surface rounded-lg appearance-none cursor-pointer accent-stitch-primary"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {/* Like Button */}
                    <button
                        onClick={handleLike}
                        className={`p-2 rounded-lg font-medium text-xl transition-all transform active:scale-90 ${liked
                            ? 'text-red-500 bg-red-500/10 scale-110'
                            : 'text-stitch-muted hover:text-red-400 hover:bg-stitch-surface'
                            }`}
                        title="I like this laugh!"
                    >
                        {liked ? '❤️' : '🤍'}
                    </button>

                    <button
                        onClick={handleSkip}
                        disabled={!canSkip && isPlaying}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${canSkip || !isPlaying
                            ? 'bg-stitch-surface text-white hover:bg-stitch-surface/70'
                            : 'bg-stitch-surface/30 text-stitch-muted cursor-not-allowed'
                            }`}
                        title={canSkip || !isPlaying ? 'Skip this clip' : 'Wait 2s to skip'}
                    >
                        Skip
                    </button>

                    <button
                        onClick={handleReplay}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-stitch-surface text-white hover:bg-stitch-surface/70 transition-all"
                    >
                        ↻ Replay
                    </button>
                </div>
            </div>
        </div>
    );
}
