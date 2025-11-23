/**
 * FIXED: useAudioRecorder Hook
 *
 * WHAT WAS BROKEN: laughCount was never incremented
 * WHAT'S FIXED: Now detects "laughs" when volume exceeds threshold
 *
 * To use: Replace src/hooks/useAudioRecorder.ts with this file
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Types
interface AudioRecorderState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    volume: number;
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

// LAUGH DETECTION CONFIG
const LAUGH_VOLUME_THRESHOLD = 55;  // Volume must exceed this (0-100)
const LAUGH_DURATION_MIN = 300;     // Must be loud for at least 300ms
const LAUGH_COOLDOWN = 1500;        // Wait 1.5s before counting another laugh

const getSupportedMimeType = (): string => {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
    ];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return '';
};

export function useAudioRecorder(): AudioRecorderReturn {
    const [state, setState] = useState<AudioRecorderState>({
        isRecording: false,
        isPaused: false,
        duration: 0,
        volume: 0,
        laughCount: 0,
        error: null,
    });

    // Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const durationIntervalRef = useRef<number | null>(null);
    const volumeIntervalRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const smoothedVolumeRef = useRef<number>(0);

    // LAUGH DETECTION REFS
    const laughCountRef = useRef<number>(0);
    const loudStartTimeRef = useRef<number | null>(null);
    const lastLaughTimeRef = useRef<number>(0);

    const getAudioContext = useCallback((): AudioContext => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const calculateVolume = useCallback((): number => {
        if (!analyserRef.current) return 0;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalized = Math.min(100, (rms / 128) * 100);

        smoothedVolumeRef.current =
            VOLUME_SMOOTHING * smoothedVolumeRef.current +
            (1 - VOLUME_SMOOTHING) * normalized;

        return Math.round(smoothedVolumeRef.current);
    }, []);

    /**
     * LAUGH DETECTION LOGIC
     * Counts a "laugh" when volume stays above threshold for minimum duration
     */
    const detectLaugh = useCallback((volume: number) => {
        const now = Date.now();

        if (volume > LAUGH_VOLUME_THRESHOLD) {
            // Start tracking loud period
            if (loudStartTimeRef.current === null) {
                loudStartTimeRef.current = now;
            }

            // Check if loud long enough AND cooldown passed
            const loudDuration = now - loudStartTimeRef.current;
            const timeSinceLastLaugh = now - lastLaughTimeRef.current;

            if (loudDuration >= LAUGH_DURATION_MIN && timeSinceLastLaugh >= LAUGH_COOLDOWN) {
                // COUNT A LAUGH!
                laughCountRef.current += 1;
                lastLaughTimeRef.current = now;
                loudStartTimeRef.current = null; // Reset for next laugh

                setState(prev => ({
                    ...prev,
                    laughCount: laughCountRef.current
                }));

                console.log(`[LAUGH DETECTED] Count: ${laughCountRef.current}`);
            }
        } else {
            // Volume dropped, reset loud tracking
            loudStartTimeRef.current = null;
        }
    }, []);

    const getVolume = useCallback((): number => {
        return calculateVolume();
    }, [calculateVolume]);

    const startRecording = useCallback(async (): Promise<void> => {
        try {
            setState(prev => ({ ...prev, error: null }));

            // RESET LAUGH COUNT ON NEW RECORDING
            laughCountRef.current = 0;
            loudStartTimeRef.current = null;
            lastLaughTimeRef.current = 0;

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            streamRef.current = stream;

            const audioContext = getAudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            const mimeType = getSupportedMimeType();
            const mediaRecorder = new MediaRecorder(
                stream,
                mimeType ? { mimeType } : undefined
            );
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start(100);
            startTimeRef.current = Date.now();

            durationIntervalRef.current = window.setInterval(() => {
                const elapsed = (Date.now() - startTimeRef.current) / 1000;
                setState(prev => ({ ...prev, duration: elapsed }));
            }, 100);

            // Volume monitoring WITH laugh detection
            volumeIntervalRef.current = window.setInterval(() => {
                const volume = calculateVolume();
                detectLaugh(volume); // <-- THE FIX
                setState(prev => ({ ...prev, volume }));
            }, VOLUME_UPDATE_INTERVAL);

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

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        return new Promise((resolve) => {
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
                const blob = new Blob(chunksRef.current, {
                    type: mediaRecorder.mimeType || 'audio/webm'
                });
                chunksRef.current = [];

                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                analyserRef.current = null;

                setState(prev => ({
                    ...prev,
                    isRecording: false,
                    isPaused: false,
                    volume: 0,
                    // Keep laughCount - don't reset on stop
                }));

                resolve(blob);
            };

            mediaRecorder.stop();
        });
    }, []);

    const pauseRecording = useCallback((): void => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setState(prev => ({ ...prev, isPaused: true }));
        }
    }, []);

    const resumeRecording = useCallback((): void => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setState(prev => ({ ...prev, isPaused: false }));
        }
    }, []);

    useEffect(() => {
        return () => {
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
            if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
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
