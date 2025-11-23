import { useState, useCallback } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { supabase, DEMO_MODE } from '../lib/supabase';
import { savePendingUpload } from '../lib/db';

// Fallback UUID generator for Safari/HTTP (crypto.randomUUID not available)
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback: use crypto.getRandomValues if available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    // Last resort fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

interface SessionState {
    sessionId: string | null;
    status: 'idle' | 'recording' | 'paused' | 'uploading' | 'completed' | 'error' | 'offline_saved';
    error: string | null;
}

interface SessionManagerReturn extends SessionState {
    audioDuration: number;
    audioVolume: number;
    laughCount: number;
    startSession: (userId: string) => Promise<void>;
    pauseSession: () => void;
    resumeSession: () => void;
    endSession: (userId: string) => Promise<void>;
}

export function useSessionManager(): SessionManagerReturn {
    const recorder = useAudioRecorder();
    const [state, setState] = useState<SessionState>({
        sessionId: null,
        status: 'idle',
        error: null,
    });

    const startSession = useCallback(async (_userId: string) => {
        try {
            const newSessionId = generateUUID();
            setState(prev => ({ ...prev, status: 'recording', sessionId: newSessionId, error: null }));
            await recorder.startRecording();
        } catch (err: any) {
            setState(prev => ({ ...prev, status: 'error', error: err.message }));
        }
    }, [recorder]);

    const pauseSession = useCallback(() => {
        recorder.pauseRecording();
        setState(prev => ({ ...prev, status: 'paused' }));
    }, [recorder]);

    const resumeSession = useCallback(() => {
        recorder.resumeRecording();
        setState(prev => ({ ...prev, status: 'recording' }));
    }, [recorder]);

    const endSession = useCallback(async (userId: string) => {
        if (!state.sessionId) return;

        setState(prev => ({ ...prev, status: 'uploading' }));

        let blob: Blob | null = null;

        try {
            blob = await recorder.stopRecording();
            if (!blob) throw new Error('No recording data available');

            // DEMO MODE: Skip Supabase, save locally only
            if (DEMO_MODE) {
                console.log('🎭 Demo mode: Saving session locally');
                console.log(`   Duration: ${recorder.duration.toFixed(1)}s`);
                console.log(`   Laughs: ${recorder.laughCount}`);

                // Save to IndexedDB for demo
                await savePendingUpload({
                    id: state.sessionId,
                    blob: blob,
                    metadata: {
                        duration: recorder.duration,
                        timestamp: Date.now(),
                        userId: userId,
                        mimeType: blob.type,
                        laughCount: recorder.laughCount
                    },
                    created_at: Date.now()
                });

                setState(prev => ({ ...prev, status: 'completed' }));
                return;
            }

            // REAL MODE: Upload to Supabase
            const timestamp = Date.now();
            const mimeType = blob.type;
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const filename = `${timestamp}_recording.${extension}`;
            const storagePath = `audio-recordings/${userId}/${state.sessionId}/${filename}`;

            const { error: uploadError } = await supabase.storage
                .from('audio-recordings')
                .upload(storagePath, blob, {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { error: sessionError } = await supabase
                .from('sessions')
                .insert({
                    id: state.sessionId,
                    user_id: userId,
                    duration: Math.round(recorder.duration),
                    laugh_count: recorder.laughCount
                });

            if (sessionError) throw sessionError;

            const { error: recordingError } = await supabase
                .from('recordings')
                .insert({
                    session_id: state.sessionId,
                    storage_path: storagePath,
                    duration: Math.round(recorder.duration),
                    mime_type: mimeType
                });

            if (recordingError) throw recordingError;

            setState(prev => ({ ...prev, status: 'completed' }));

        } catch (err: any) {
            console.error('Session upload failed:', err);

            // Offline Backup
            if (blob && state.sessionId) {
                try {
                    await savePendingUpload({
                        id: state.sessionId,
                        blob: blob,
                        metadata: {
                            duration: recorder.duration,
                            timestamp: Date.now(),
                            userId: userId,
                            mimeType: blob.type
                        },
                        created_at: Date.now()
                    });
                    setState(prev => ({
                        ...prev,
                        status: 'offline_saved',
                        error: 'Upload failed. Saved to device.'
                    }));
                    return;
                } catch (backupErr) {
                    console.error('Offline backup failed:', backupErr);
                }
            }

            setState(prev => ({ ...prev, status: 'error', error: err.message }));
        }
    }, [recorder, state.sessionId]);


    return {
        ...state,
        audioDuration: recorder.duration,
        audioVolume: recorder.volume,
        laughCount: recorder.laughCount,
        startSession,
        pauseSession,
        resumeSession,
        endSession
    };
}
