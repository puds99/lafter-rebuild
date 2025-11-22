# How We Built It: Real-Time Laugh Detection with the Web Audio API

*By The Lafter.org Engineering Team*

At Lafter.org, our mission is simple: help people laugh more. But to track that progress, we needed a way to detect laughter in real-time, directly in the browser, without sending sensitive audio data to a server.

Here’s how we built a privacy-first laugh detector using React, TypeScript, and the Web Audio API.

## The Challenge

We needed a solution that was:
1.  **Fast**: Instant feedback is crucial for gamification.
2.  **Private**: Processing must happen on the device.
3.  **Simple**: No heavy ML models (yet), just pure signal processing.

## The Solution: Amplitude Analysis

Laughter is distinct. It’s loud, bursty, and rhythmic. For our MVP, we focused on the "loud and bursty" part using **Root Mean Square (RMS)** amplitude analysis.

### Step 1: The Setup

We used the `AudioContext` API to create an audio processing graph. The key node here is the `AnalyserNode`, which gives us access to the raw frequency data.

```typescript
// src/hooks/useAudioRecorder.ts

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
const source = audioContext.createMediaStreamSource(stream);
const analyser = audioContext.createAnalyser();

analyser.fftSize = 256; // Small buffer for real-time speed
source.connect(analyser);
```

### Step 2: Calculating Volume (RMS)

To get the "loudness," we calculate the Root Mean Square of the audio buffer. This gives us a better representation of volume than a simple peak amplitude.

```typescript
const calculateVolume = useCallback((): number => {
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Normalize to 0-100 range
    return Math.min(100, (rms / 128) * 100);
}, []);
```

### Step 3: Detecting the "Laugh"

We defined a "Laugh" as a volume spike exceeding a certain threshold, with a debounce to prevent counting a single laugh as multiple events.

```typescript
const LAUGH_THRESHOLD = 60; // Amplitude threshold
const LAUGH_DEBOUNCE = 1000; // 1 second cooldown

// Inside your loop
if (volume > LAUGH_THRESHOLD && now - lastLaughTime > LAUGH_DEBOUNCE) {
    setLaughCount(prev => prev + 1);
    lastLaughTime = now;
}
```

## The Result

The result is a snappy, responsive UI that reacts instantly when you laugh. The avatar jumps, an emoji pops up, and your "Laugh Streak" goes up—all without your audio ever leaving your browser.

## What's Next?

This amplitude-based approach is just the beginning. In Phase 2, we plan to implement a lightweight TensorFlow.js model to distinguish laughter from other loud noises (like clapping or shouting) for even greater accuracy.

---

*Want to try it out? Start a session on [Lafter.org](https://lafter.org) today!*
