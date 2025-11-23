import { YamnetService } from './YamnetService';

/**
 * LaughClipExtractor Service
 * 
 * Processes session audio recordings to extract high-quality laugh clips
 * suitable for the "Laugh Starter" feature.
 * 
 * Key Features:
 * - Extracts 3-second laugh segments from session audio
 * - Scores clips using YAMNet AI model
 * - Normalizes audio to -3dB peak for consistency
 * - Exports as compressed MP3 for optimal delivery
 * 
 * Edge Cases Handled:
 * - No laughs detected in session
 * - Audio shorter than 3 seconds
 * - Timestamp at edge of recording
 * - Decoding failures (Safari compatibility)
 */

interface LaughTimestamp {
    time: number;      // Milliseconds since recording start
    duration: number;  // Duration of the laugh event (milliseconds)
    volume?: number;   // Optional: peak volume during laugh
}

interface ExtractedClip {
    audioBlob: Blob;
    duration: number;        // milliseconds
    yamnetScore: number;     // 0-1, quality score
    timestamp: number;       // When laugh occurred in original recording
    normalizedPeak: number;  // -3dB or actual if lower
}

export class LaughClipExtractor {
    private static instance: LaughClipExtractor;
    private yamnetService: YamnetService;
    private audioContext: AudioContext | null = null;

    // Configuration
    private readonly CLIP_DURATION_MS = 3000;    // 3 seconds
    private readonly TARGET_PEAK_DB = -3;        // -3dB normalization target
    private readonly SAMPLE_RATE = 16000;        // YAMNet expects 16kHz
    private readonly MP3_BITRATE = 128;          // 128kbps for size/quality balance
    private readonly MIN_YAMNET_SCORE = 0.4;     // Minimum acceptable quality

    private constructor() {
        this.yamnetService = YamnetService.getInstance();
    }

    static getInstance(): LaughClipExtractor {
        if (!LaughClipExtractor.instance) {
            LaughClipExtractor.instance = new LaughClipExtractor();
        }
        return LaughClipExtractor.instance;
    }

    /**
     * Extract the best laugh clip from a session recording
     * 
     * @param sessionBlob - The full session audio recording
     * @param laughTimestamps - Array of detected laugh events (from useAudioRecorder)
     * @returns ExtractedClip or null if no suitable laugh found
     */
    async extractBestLaugh(
        sessionBlob: Blob,
        laughTimestamps: LaughTimestamp[]
    ): Promise<ExtractedClip | null> {
        try {
            // Edge Case 1: No laughs detected
            if (!laughTimestamps || laughTimestamps.length === 0) {
                console.warn('⚠️ No laugh timestamps provided');
                return null;
            }

            // Initialize AudioContext if needed
            if (!this.audioContext || this.audioContext.state === 'closed') {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            // Step 1: Decode the session audio blob to AudioBuffer
            const audioBuffer = await this.decodeAudioBlob(sessionBlob);

            // Edge Case 2: Audio too short
            const durationMs = (audioBuffer.duration * 1000);
            if (durationMs < this.CLIP_DURATION_MS) {
                console.warn(`⚠️ Session too short: ${durationMs}ms < ${this.CLIP_DURATION_MS}ms`);
                return null;
            }

            // Step 2: Extract candidate clips for each laugh timestamp
            const candidates: Array<{
                buffer: AudioBuffer;
                timestamp: number;
                score: number;
            }> = [];

            for (const laugh of laughTimestamps) {
                const clipBuffer = this.extractClipSegment(audioBuffer, laugh.time);
                if (!clipBuffer) continue;

                // Step 3: Score each clip using YAMNet
                const score = await this.scoreClip(clipBuffer);

                if (score >= this.MIN_YAMNET_SCORE) {
                    candidates.push({
                        buffer: clipBuffer,
                        timestamp: laugh.time,
                        score
                    });
                }
            }

            // Edge Case 3: No clips meet quality threshold
            if (candidates.length === 0) {
                console.warn('⚠️ No clips met minimum YAMNet score threshold');
                return null;
            }

            // Step 4: Select the best clip (highest YAMNet score)
            candidates.sort((a, b) => b.score - a.score);
            const bestClip = candidates[0];

            console.log(`✅ Selected clip with score ${bestClip.score.toFixed(2)} from ${candidates.length} candidates`);

            // Step 5: Normalize audio to -3dB peak
            const normalizedBuffer = this.normalizeAudio(bestClip.buffer);

            // Step 6: Export as MP3 blob
            const audioBlob = await this.exportAsMP3(normalizedBuffer);

            return {
                audioBlob,
                duration: this.CLIP_DURATION_MS,
                yamnetScore: bestClip.score,
                timestamp: bestClip.timestamp,
                normalizedPeak: this.TARGET_PEAK_DB
            };

        } catch (error) {
            console.error('❌ Failed to extract laugh clip:', error);
            return null;
        }
    }

    /**
     * Decode audio blob to AudioBuffer
     * Handles Safari compatibility issues
     */
    private async decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            return await this.audioContext!.decodeAudioData(arrayBuffer);
        } catch (error) {
            // Safari sometimes fails with certain formats, try again with explicit conversion
            console.warn('⚠️ Initial decode failed, attempting format conversion');

            // Create a temporary audio element to force browser decoding
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            await new Promise((resolve, reject) => {
                audio.onloadeddata = resolve;
                audio.onerror = reject;
                audio.load();
            });

            // Try decoding again
            const arrayBuffer = await blob.arrayBuffer();
            const decoded = await this.audioContext!.decodeAudioData(arrayBuffer);
            URL.revokeObjectURL(url);
            return decoded;
        }
    }

    /**
     * Extract a 3-second clip centered on the laugh timestamp
     * with bounds checking
     */
    private extractClipSegment(
        sourceBuffer: AudioBuffer,
        timestampMs: number
    ): AudioBuffer | null {
        try {
            const sampleRate = sourceBuffer.sampleRate;
            const totalSamples = sourceBuffer.length;
            const clipDurationSamples = Math.floor((this.CLIP_DURATION_MS / 1000) * sampleRate);

            // Calculate start sample (center the clip on the timestamp)
            const centerSample = Math.floor((timestampMs / 1000) * sampleRate);
            let startSample = centerSample - Math.floor(clipDurationSamples / 2);

            // Bounds checking: Ensure we don't exceed buffer limits
            if (startSample < 0) {
                startSample = 0;
            }
            if (startSample + clipDurationSamples > totalSamples) {
                startSample = totalSamples - clipDurationSamples;
            }

            // Edge case: If still not enough samples, return null
            if (startSample < 0 || clipDurationSamples > totalSamples) {
                console.warn('⚠️ Cannot extract clip: insufficient samples');
                return null;
            }

            // Create new AudioBuffer for the clip
            const clipBuffer = this.audioContext!.createBuffer(
                sourceBuffer.numberOfChannels,
                clipDurationSamples,
                sampleRate
            );

            // Copy audio data
            for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel++) {
                const sourceData = sourceBuffer.getChannelData(channel);
                const clipData = clipBuffer.getChannelData(channel);

                for (let i = 0; i < clipDurationSamples; i++) {
                    clipData[i] = sourceData[startSample + i];
                }
            }

            return clipBuffer;

        } catch (error) {
            console.error('❌ Failed to extract clip segment:', error);
            return null;
        }
    }

    /**
     * Score a clip using YAMNet model
     * Resamples to 16kHz if needed
     */
    private async scoreClip(clipBuffer: AudioBuffer): Promise<number> {
        try {
            // YAMNet expects 16kHz mono audio
            const resampledBuffer = await this.resampleTo16kMono(clipBuffer);
            const audioData = resampledBuffer.getChannelData(0);

            return await this.yamnetService.predict(audioData);

        } catch (error) {
            console.error('❌ Failed to score clip:', error);
            return 0;
        }
    }

    /**
     * Resample audio to 16kHz mono (required by YAMNet)
     */
    private async resampleTo16kMono(buffer: AudioBuffer): Promise<AudioBuffer> {
        if (buffer.sampleRate === this.SAMPLE_RATE && buffer.numberOfChannels === 1) {
            return buffer; // Already correct format
        }

        const offlineContext = new OfflineAudioContext(
            1, // Mono
            Math.ceil(buffer.duration * this.SAMPLE_RATE),
            this.SAMPLE_RATE
        );

        const source = offlineContext.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineContext.destination);
        source.start(0);

        return await offlineContext.startRendering();
    }

    /**
     * Normalize audio to -3dB peak
     * Prevents clipping and ensures consistent volume across clips
     */
    private normalizeAudio(buffer: AudioBuffer): AudioBuffer {
        const normalizedBuffer = this.audioContext!.createBuffer(
            buffer.numberOfChannels,
            buffer.length,
            buffer.sampleRate
        );

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const inputData = buffer.getChannelData(channel);
            const outputData = normalizedBuffer.getChannelData(channel);

            // Find peak amplitude
            let peak = 0;
            for (let i = 0; i < inputData.length; i++) {
                peak = Math.max(peak, Math.abs(inputData[i]));
            }

            // Calculate normalization factor
            // -3dB = 0.707 (linear scale)
            const targetAmplitude = Math.pow(10, this.TARGET_PEAK_DB / 20);
            const gain = peak > 0 ? Math.min(targetAmplitude / peak, 1.0) : 1.0;

            // Apply gain
            for (let i = 0; i < inputData.length; i++) {
                outputData[i] = inputData[i] * gain;
            }
        }

        return normalizedBuffer;
    }

    /**
     * Export AudioBuffer as MP3 Blob
     * Uses MediaRecorder if available, fallback to WAV
     */
    private async exportAsMP3(buffer: AudioBuffer): Promise<Blob> {
        try {
            // Create a MediaStreamSource from the buffer
            const mediaStreamDestination = this.audioContext!.createMediaStreamDestination();
            const source = this.audioContext!.createBufferSource();
            source.buffer = buffer;
            source.connect(mediaStreamDestination);

            // MediaRecorder with MP3 encoding (if supported)
            const mimeType = this.getSupportedMimeType();
            const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream, {
                mimeType,
                audioBitsPerSecond: this.MP3_BITRATE * 1000
            });

            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            // Start recording and play the buffer
            mediaRecorder.start();
            source.start(0);

            // Wait for recording to complete
            await new Promise<void>((resolve) => {
                source.onended = () => {
                    mediaRecorder.stop();
                };
                mediaRecorder.onstop = () => {
                    resolve();
                };
            });

            return new Blob(chunks, { type: mimeType });

        } catch (error) {
            console.error('❌ MP3 export failed, falling back to WAV:', error);
            return this.exportAsWAV(buffer);
        }
    }

    /**
     * Get supported MIME type for MediaRecorder
     * Prefers MP3, falls back to WebM/Opus or WAV
     */
    private getSupportedMimeType(): string {
        const types = [
            'audio/mpeg',              // MP3 (ideal)
            'audio/mp4',               // M4A (Safari)
            'audio/webm;codecs=opus',  // WebM (Chrome/Firefox)
            'audio/ogg;codecs=opus',   // OGG
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'audio/wav'; // Worst-case fallback
    }

    /**
     * Fallback: Export as WAV (uncompressed, larger file size)
     */
    private exportAsWAV(buffer: AudioBuffer): Blob {
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const length = buffer.length * numberOfChannels * 2;

        const arrayBuffer = new ArrayBuffer(44 + length);
        const view = new DataView(arrayBuffer);

        // WAV header
        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length, true);

        // Write audio data
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = buffer.getChannelData(channel)[i];
                const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
                view.setInt16(offset, intSample, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
