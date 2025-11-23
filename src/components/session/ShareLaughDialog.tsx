import { useState } from 'react';
import { LaughClipExtractor } from '../../services/audio/LaughClipExtractor';
import { supabase } from '../../lib/supabase';

interface ShareLaughDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sessionBlob: Blob | null;
    laughTimestamps: Array<{ time: number; duration: number }>;
    sessionId: string;
    userId: string;
    laughCount: number;
    yamnetScore?: number; // Optional: if we have the AI score from session
}

/**
 * ShareLaughDialog Component
 * 
 * Post-session dialog prompting users to share their best laugh
 * Triggers after a successful session with 3+ laughs
 * 
 * Features:
 * - Extracts best laugh clip using AI scoring
 * - Uploads to Supabase Storage
 * - Creates pending review record
 * - Graceful error handling
 */
export function ShareLaughDialog({
    isOpen,
    onClose,
    sessionBlob,
    laughTimestamps,
    sessionId,
    userId,
    laughCount,
    yamnetScore
}: ShareLaughDialogProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleShare = async () => {
        if (!sessionBlob || laughTimestamps.length === 0) {
            setError('No audio data available');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Step 1: Extract best laugh clip
            const extractor = LaughClipExtractor.getInstance();
            const clip = await extractor.extractBestLaugh(sessionBlob, laughTimestamps);

            if (!clip) {
                setError('Could not extract a suitable laugh clip. Try recording longer laughs!');
                setIsProcessing(false);
                return;
            }

            console.log(`✅ Extracted clip: ${clip.duration}ms, score: ${clip.yamnetScore.toFixed(2)}`);

            // DEMO MODE CHECK (Local Standalone Mode)
            const { DEMO_MODE } = await import('../../lib/supabase');
            if (DEMO_MODE) {
                console.log('🎭 DEMO MODE: Saving clip to local IndexedDB...');

                const { saveLaughClip } = await import('../../lib/db');
                await saveLaughClip({
                    id: `${sessionId}_${Date.now()}`,
                    storage_path: `local/${sessionId}_${Date.now()}.mp3`,
                    blob: clip.audioBlob,
                    duration: clip.duration,
                    yamnet_score: clip.yamnetScore,
                    created_at: Date.now(),
                    play_count: 0
                });

                setSuccess(true);
                console.log('🎉 Laugh clip saved locally!');
                setTimeout(() => onClose(), 2000);
                return;
            }

            // Step 2: Upload to Supabase Storage (Cloud Mode)
            const fileName = `${userId}/${sessionId}_${Date.now()}.mp3`;
            const { error: uploadError } = await supabase.storage
                .from('laugh-starter-clips')
                .upload(fileName, clip.audioBlob, {
                    contentType: 'audio/mpeg',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Step 3: Create database record
            const { error: insertError } = await supabase
                .from('laugh_clips')
                .insert({
                    session_id: sessionId,
                    user_id: userId,
                    storage_path: fileName,
                    duration: clip.duration,
                    file_size: clip.audioBlob.size,
                    yamnet_score: clip.yamnetScore,
                    approval_status: 'pending'
                });

            if (insertError) throw insertError;

            // Success!
            setSuccess(true);
            console.log('🎉 Laugh clip submitted for review!');

            // Auto-close after 2 seconds
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to share laugh';
            setError(message);
            console.error('❌ Failed to share laugh:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-panel p-8 rounded-2xl max-w-md w-full shadow-2xl border border-white/10 animate-fade-in">
                {!success ? (
                    <>
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-stitch-accent to-stitch-secondary flex items-center justify-center text-3xl">
                                🎉
                            </div>
                            <h2 className="text-2xl font-display font-bold text-white mb-2">
                                Great Session!
                            </h2>
                            <p className="text-stitch-muted text-sm">
                                You laughed <span className="text-stitch-accent font-bold">{laughCount} times</span>
                                {yamnetScore && (
                                    <span> with an AI quality score of <span className="text-stitch-primary font-bold">{(yamnetScore * 100).toFixed(0)}%</span></span>
                                )}
                            </p>
                        </div>

                        {/* Prompt */}
                        <div className="mb-6 p-4 rounded-lg bg-stitch-primary/10 border border-stitch-primary/30">
                            <p className="text-stitch-text text-sm text-center">
                                💡 <span className="font-semibold">Help the community!</span> Share your best laugh to help new users warm up.
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="flex-1 px-6 py-3 rounded-lg font-medium text-sm bg-stitch-surface text-stitch-muted hover:text-white transition-all disabled:opacity-50"
                            >
                                Maybe Later
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={isProcessing}
                                className="flex-1 btn-primary text-base py-3 shadow-xl shadow-stitch-primary/30 hover:shadow-stitch-primary/50 transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isProcessing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    "Share My Laugh! 🎙️"
                                )}
                            </button>
                        </div>

                        {/* Helper Text */}
                        <p className="text-center text-xs text-stitch-muted mt-4">
                            Your clip will be reviewed before appearing in Laugh Starter
                        </p>
                    </>
                ) : (
                    /* Success State */
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-4xl">
                            ✅
                        </div>
                        <h3 className="text-2xl font-display font-bold text-white mb-2">
                            Thank You!
                        </h3>
                        <p className="text-stitch-muted">
                            Your laugh is pending review. We'll notify you when it's approved!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
