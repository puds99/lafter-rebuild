/**
 * GOLD STANDARD: useAudioRecorder Hook
 * React 18 Strict Mode Compliant
 *
 * CRITICAL: This hook handles the AudioContext creation/cleanup properly
 * to prevent memory leaks and "AudioContext was not allowed to start" errors.
 *
 * Provide this to Gemini as a reference implementation.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Types
interface AudioRecorderState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    volume: number; // 0-100, for avatar animation
    laughCount: number;
    error: string | null;
}

interface AudioRecorderReturn extends AudioRecorderState {
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    pauseRecording: () => void;
    resumeRecording: () => void;
    getVolume: () => number;
}

// Constants
const VOLUME_SMOOTHING = 0.8;
const VOLUME_UPDATE_INTERVAL = 100; // ms

/**
 * Safari-compatible MIME type selection
 * Safari only supports audio/mp4, NOT audio/webm
 */
const getSupportedMimeType = (): string => {
    const types = [
        'audio/webm;codecs=opus',  // Chrome, Firefox, Edge (best quality)
        'audio/webm',              // Chrome, Firefox, Edge (fallback)
        'audio/mp4',               // Safari (iOS & macOS)
        'audio/aac',               // Safari fallback
        'audio/ogg;codecs=opus',   // Firefox fallback
    ];

    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            console.log(`[useAudioRecorder] Using MIME type: ${type}`);
            return type;
        }
    }

    console.warn('[useAudioRecorder] No supported MIME type found, using browser default');
    return ''; // Use browser default
};

export function useAudioRecorder(): AudioRecorderReturn {
    // State
    const [state, setState] = useState<AudioRecorderState>({
        isRecording: false,
        isPaused: false,
        duration: 0,
        volume: 0,
        laughCount: 0,
        error: null,
    });

    // Refs - CRITICAL: Use refs to prevent React 18 Strict Mode double-creation
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const durationIntervalRef = useRef<number | null>(null);
    const volumeIntervalRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const smoothedVolumeRef = useRef<number>(0);

    /**
     * Get or create AudioContext
     * CRITICAL: Only creates ONE instance, reuses if exists
     */
    const getAudioContext = useCallback((): AudioContext => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
        }

        // Resume if suspended (browser autoplay policy)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        return audioContextRef.current;
    }, []);

    /**
     * Calculate current volume from analyser
     * Returns value 0-100 for easy avatar speed mapping
     */
    const calculateVolume = useCallback((): number => {
        if (!analyserRef.current) return 0;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS (root mean square) for volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Normalize to 0-100
        const normalized = Math.min(100, (rms / 128) * 100);

        // Apply smoothing to prevent jitter
        smoothedVolumeRef.current =
            VOLUME_SMOOTHING * smoothedVolumeRef.current +
            (1 - VOLUME_SMOOTHING) * normalized;

        return Math.round(smoothedVolumeRef.current);
    }, []);

    /**
     * Get current volume (for external polling if needed)
     */
    const getVolume = useCallback((): number => {
        return calculateVolume();
    }, [calculateVolume]);

    /**
     * Start recording
     * MUST be called from user interaction (click handler)
     */
    const startRecording = useCallback(async (): Promise<void> => {
        try {
            // Reset error state
            setState(prev => ({ ...prev, error: null }));

            // Get microphone stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            streamRef.current = stream;

            // Setup audio context and analyser for volume monitoring
            const audioContext = getAudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Create MediaRecorder with Safari-compatible MIME type
            const mimeType = getSupportedMimeType();
            const mediaRecorder = new MediaRecorder(
                stream,
                mimeType ? { mimeType } : undefined
            );
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            // Handle data
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            // Start recording
            mediaRecorder.start(100); // Collect data every 100ms
            startTimeRef.current = Date.now();

            // Start duration timer
            durationIntervalRef.current = window.setInterval(() => {
                const elapsed = (Date.now() - startTimeRef.current) / 1000;
                setState(prev => ({ ...prev, duration: elapsed }));
            }, 100);

            // Start volume monitoring
            volumeIntervalRef.current = window.setInterval(() => {
                const volume = calculateVolume();
                setState(prev => ({ ...prev, volume }));
            }, VOLUME_UPDATE_INTERVAL);

            setState(prev => ({
                ...prev,
                isRecording: true,
                isPaused: false,
                duration: 0,
            }));

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to start recording';
            setState(prev => ({ ...prev, error: message }));
            throw error;
        }
    }, [getAudioContext, calculateVolume]);

    /**
     * Stop recording and return blob
     */
    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            // Clear intervals
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
                durationIntervalRef.current = null;
            }
            if (volumeIntervalRef.current) {
                clearInterval(volumeIntervalRef.current);
                volumeIntervalRef.current = null;
            }

            const mediaRecorder = mediaRecorderRef.current;

            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                setState(prev => ({
                    ...prev,
                    isRecording: false,
                    isPaused: false,
                    volume: 0,
                }));
                resolve(null);
                return;
            }

            mediaRecorder.onstop = () => {
                // Create blob from chunks
                const blob = new Blob(chunksRef.current, {
                    type: mediaRecorder.mimeType || 'audio/webm'
                });
                chunksRef.current = [];

                // Clean up stream tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                // Clean up analyser (but NOT AudioContext - reuse it)
                analyserRef.current = null;

                setState(prev => ({
                    ...prev,
                    isRecording: false,
                    isPaused: false,
                    volume: 0,
                }));

                resolve(blob);
            };

            mediaRecorder.stop();
        });
    }, []);

    /**
     * Pause recording
     */
    const pauseRecording = useCallback((): void => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setState(prev => ({ ...prev, isPaused: true }));
        }
    }, []);

    /**
     * Resume recording
     */
    const resumeRecording = useCallback((): void => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setState(prev => ({ ...prev, isPaused: false }));
        }
    }, []);

    /**
     * Cleanup on unmount
     * CRITICAL: Properly close AudioContext to prevent memory leaks
     */
    useEffect(() => {
        return () => {
            // Clear intervals
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
            if (volumeIntervalRef.current) {
                clearInterval(volumeIntervalRef.current);
            }

            // Stop any active recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }

            // Stop stream tracks
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            // Close AudioContext
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        };
    }, []);

    return {
        ...state,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        getVolume,
    };
}
