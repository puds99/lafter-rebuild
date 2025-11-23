import { useEffect, useState } from 'react';
import { useLaughStarter } from '../../hooks/useLaughStarter';
import { LaughPlayer } from '../session/LaughPlayer';

interface LaughStarterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: () => void;
}

/**
 * LaughStarterModal Component
 * 
 * Onboarding modal that plays sample laughs to new users
 * 
 * Features:
 * - Auto-fetches 5 random approved clips on mount
 * - Sequential playback via LaughPlayer
 * - "Ready to Record" CTA after playback
 * - Skippable after first 2 seconds
 * - Stitch glassmorphism design
 */
export function LaughStarterModal({
    isOpen,
    onClose,
    onStart
}: LaughStarterModalProps) {
    const { clips, isLoading, error, fetchClips } = useLaughStarter();
    const [hasCompleted, setHasCompleted] = useState(false);

    // Fetch clips when modal opens
    useEffect(() => {
        if (isOpen && clips.length === 0) {
            fetchClips(5);
        }
    }, [isOpen, clips.length, fetchClips]);

    // Reset completion state when modal reopens
    useEffect(() => {
        if (isOpen) {
            setHasCompleted(false);
        }
    }, [isOpen]);

    const handleComplete = () => {
        setHasCompleted(true);
    };

    const handleStartRecording = () => {
        onClose();
        onStart();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-panel p-8 rounded-2xl max-w-2xl w-full shadow-2xl border border-white/10 animate-fade-in">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-stitch-primary to-stitch-secondary flex items-center justify-center text-3xl">
                        😂
                    </div>
                    <h2 className="text-2xl font-display font-bold text-white mb-2">
                        Welcome to Laugh Starter
                    </h2>
                    <p className="text-stitch-muted text-sm max-w-md mx-auto">
                        New to laughing on command? Hear authentic laughs from our community to get warmed up!
                    </p>
                </div>

                {/* Content */}
                <div className="mb-6">
                    {isLoading && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-stitch-primary border-t-transparent mx-auto mb-4"></div>
                            <p className="text-stitch-muted">Loading laugh clips...</p>
                        </div>
                    )}

                    {error && (
                        <div className="glass-panel p-6 rounded-xl border border-red-500/20 bg-red-500/10">
                            <p className="text-red-400 text-sm text-center">{error}</p>
                            <button
                                onClick={() => fetchClips(5)}
                                className="mt-4 mx-auto block btn-primary text-sm"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && clips.length > 0 && (
                        <div>
                            <LaughPlayer
                                clipUrls={clips.map(c => c.signedUrl || '').filter(Boolean)}
                                clipIds={clips.map(c => c.id)}
                                onComplete={handleComplete}
                                onSkip={(index: number) => console.log(`Skipped clip ${index + 1}`)}
                                autoPlay={true}
                            />

                            {hasCompleted && (
                                <div className="mt-6 text-center space-y-3 animate-fade-in">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
                                        <span className="text-2xl">✅</span>
                                        <span className="text-green-400 font-medium text-sm">All done!</span>
                                    </div>
                                    <p className="text-stitch-muted text-sm">
                                        Feeling the vibe? Let's capture your laugh!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-lg font-medium text-sm bg-stitch-surface text-stitch-muted hover:text-white transition-all"
                    >
                        Maybe Later
                    </button>
                    <button
                        onClick={handleStartRecording}
                        className="flex-1 btn-primary text-base py-3 shadow-xl shadow-stitch-primary/30 hover:shadow-stitch-primary/50 transform hover:-translate-y-1 transition-all duration-200"
                    >
                        {hasCompleted ? "Start Recording! 🎙️" : "Skip to Recording"}
                    </button>
                </div>

                {/* Helper Text */}
                {!hasCompleted && clips.length > 0 && (
                    <p className="text-center text-xs text-stitch-muted mt-4">
                        💡 Tip: Laughter is contagious! Listen all the way through for best results.
                    </p>
                )}
            </div>
        </div>
    );
}
