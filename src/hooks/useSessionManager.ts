import { useState, useCallback } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { supabase } from '../lib/supabase';
import { savePendingUpload } from '../lib/db';

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

    const startSession = useCallback(async (userId: string) => {
        try {
            // Generate a new session ID (UUID v4)
            const newSessionId = crypto.randomUUID();

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

            const timestamp = Date.now();
            const mimeType = blob.type;
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const filename = `${timestamp}_recording.${extension}`;
            const storagePath = `audio-recordings/${userId}/${state.sessionId}/${filename}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('audio-recordings')
                .upload(storagePath, blob, {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 2. Create Session Record
            const { error: sessionError } = await supabase
                .from('sessions')
                .insert({
                    id: state.sessionId,
                    user_id: userId,
                    duration: Math.round(recorder.duration),
                    laugh_count: recorder.laughCount
                });

            if (sessionError) throw sessionError;

            // 3. Create Recording Record
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
                    return; // Exit successfully if saved offline
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
