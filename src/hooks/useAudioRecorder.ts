/**
 * GOLD STANDARD: useAudioRecorder Hook
 * React 18 Strict Mode Compliant
 *
 * CRITICAL: This hook handles the AudioContext creation/cleanup properly
 * to prevent memory leaks and "AudioContext was not allowed to start" errors.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

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

// LAUGH DETECTION V2.1
const LAUGH_DURATION_MIN = 100;     // 100ms - catches any burst
const LAUGH_COOLDOWN = 500;         // 500ms - rapid detection allowed

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
    const { settings } = useSettings();

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

    // Laugh detection refs
    const laughCountRef = useRef<number>(0);
    const loudStartTimeRef = useRef<number | null>(null);
    const lastLaughTimeRef = useRef<number>(0);

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
     * LAUGH DETECTION V2.0
     * Detects sustained loud sounds as laughs
     * More sensitive than v1, with debug logging
     */
    const detectLaugh = useCallback((volume: number): void => {
        const now = Date.now();
        const threshold = settings.audio.threshold;

        // Debug: Log volume levels periodically
        if (volume > 10) {
            // console.log(`🎤 Volume: ${volume} (threshold: ${threshold})`);
        }

        if (volume > threshold) {
            // Sound is loud enough
            if (loudStartTimeRef.current === null) {
                loudStartTimeRef.current = now;
                console.log(`🔊 Loud sound started at volume ${volume}`);
            }

            const loudDuration = now - loudStartTimeRef.current;
            const timeSinceLastLaugh = now - lastLaughTimeRef.current;

            // Check if loud long enough AND cooldown passed
            if (loudDuration >= LAUGH_DURATION_MIN && timeSinceLastLaugh >= LAUGH_COOLDOWN) {
                laughCountRef.current += 1;
                lastLaughTimeRef.current = now;
                loudStartTimeRef.current = null; // Reset for next laugh

                console.log(`😂 LAUGH DETECTED! Count: ${laughCountRef.current} (duration: ${loudDuration}ms)`);

                // Update state with new laugh count
                setState(prev => ({ ...prev, laughCount: laughCountRef.current }));
            }
        } else {
            // Sound dropped below threshold, reset loud start time
            if (loudStartTimeRef.current !== null) {
                const duration = now - loudStartTimeRef.current;
                if (duration > 50) { // Only log if it was loud for a bit
                    console.log(`🔇 Loud sound ended after ${duration}ms (needed ${LAUGH_DURATION_MIN}ms)`);
                }
            }
            loudStartTimeRef.current = null;
        }
    }, [settings.audio.threshold]);

    /**
     * Check if running in secure context (required for getUserMedia)
     */
    const isSecureContext = (): boolean => {
        return !!(
            window.isSecureContext ||
            location.protocol === 'https:' ||
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1'
        );
    };

    /**
     * Check if microphone API is available
     */
    const hasMicrophone = (): boolean => {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    };

    /**
     * Start recording
     * MUST be called from user interaction (click handler)
     */
    const startRecording = useCallback(async (): Promise<void> => {
        try {
            // Reset error state
            setState(prev => ({ ...prev, error: null }));

            // Check secure context FIRST (iOS Safari requires HTTPS)
            if (!isSecureContext()) {
                const errorMsg = 'Recording requires HTTPS. Please use https:// URL or localhost.';
                setState(prev => ({ ...prev, error: errorMsg }));
                console.error('🔒 Security Context Required:', {
                    isSecure: window.isSecureContext,
                    protocol: location.protocol,
                    hostname: location.hostname
                });
                throw new Error(errorMsg);
            }

            // Check if MediaDevices API is available
            if (!hasMicrophone()) {
                const errorMsg = 'Microphone access not available in this browser.';
                setState(prev => ({ ...prev, error: errorMsg }));
                throw new Error(errorMsg);
            }

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

            // Start volume monitoring AND laugh detection
            volumeIntervalRef.current = window.setInterval(() => {
                const volume = calculateVolume();
                setState(prev => ({ ...prev, volume }));

                // V2.0: Actually detect laughs!
                detectLaugh(volume);
            }, VOLUME_UPDATE_INTERVAL);

            // Reset laugh detection for new session
            laughCountRef.current = 0;
            loudStartTimeRef.current = null;
            lastLaughTimeRef.current = 0;

            setState(prev => ({
                ...prev,
                isRecording: true,
                isPaused: false,
                duration: 0,
                laughCount: 0,
            }));

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to start recording';
            setState(prev => ({ ...prev, error: message }));
            throw error;
        }
    }, [getAudioContext, calculateVolume, detectLaugh]);

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
