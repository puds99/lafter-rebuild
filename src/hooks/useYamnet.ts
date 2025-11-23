import { useState, useEffect, useRef, useCallback } from 'react';
import { YamnetService } from '../services/audio/YamnetService';

export function useYamnet() {
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [laughProbability, setLaughProbability] = useState(0);
    const yamnetService = useRef(YamnetService.getInstance());

    useEffect(() => {
        const load = async () => {
            try {
                await yamnetService.current.loadModel();
                setIsModelLoaded(true);
            } catch (error) {
                console.error('Failed to load YAMNet model', error);
            }
        };
        load();
    }, []);

    const analyzeAudio = useCallback(async (audioData: Float32Array) => {
        if (!isModelLoaded) return 0;

        // Run inference
        const score = await yamnetService.current.predict(audioData);
        setLaughProbability(score);
        return score;
    }, [isModelLoaded]);

    return {
        isModelLoaded,
        laughProbability,
        analyzeAudio
    };
}
