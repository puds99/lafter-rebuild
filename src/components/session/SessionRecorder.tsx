import { useState, useEffect, useRef } from 'react';
import { useSessionManager } from '../../hooks/useSessionManager';
import { LottieAvatar } from './LottieAvatar';

interface SessionRecorderProps {
    userId: string;
}

export function SessionRecorder({ userId }: SessionRecorderProps) {
    const {
        status,
        audioDuration,
        audioVolume,
        laughCount,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        error
    } = useSessionManager();

    const [showLaughEmoji, setShowLaughEmoji] = useState(false);
    const prevLaughCountRef = useRef(0);

    useEffect(() => {
        if (laughCount > prevLaughCountRef.current) {
            setShowLaughEmoji(true);
            const timer = setTimeout(() => setShowLaughEmoji(false), 2000);
            prevLaughCountRef.current = laughCount;
            return () => clearTimeout(timer);
        }
    }, [laughCount]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Map volume (0-100) to animation speed (0.5 - 2.5)
    const animationSpeed = 0.5 + (audioVolume / 100) * 2;

    return (
        <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-8 p-4 sm:p-6 bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-auto mt-4 sm:mt-10 relative overflow-hidden min-h-[500px]">
            {/* Laugh Emoji Overlay */}
            {showLaughEmoji && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 animate-bounce">
                    <span className="text-8xl sm:text-9xl filter drop-shadow-lg transform transition-all duration-500 ease-out opacity-80">
                        😂
                    </span>
                </div>
            )}

            {/* Avatar Area */}
            <div className="relative transform scale-90 sm:scale-100 transition-transform">
                <LottieAvatar speed={status === 'recording' ? animationSpeed : 0.5} />
                {status === 'recording' && audioVolume > 50 && (
                    <div className="absolute -top-4 -right-4 bg-yellow-400 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-bounce shadow-sm">
                        LOUD!
                    </div>
                )}
            </div>

            {/* DEBUG PANEL - Shows volume level on mobile */}
            {status === 'recording' && (
                <div className="w-full max-w-sm bg-gray-900 rounded-lg p-3 text-white font-mono text-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">VOL:</span>
                        <span className={`text-2xl font-bold ${audioVolume > 20 ? 'text-green-400' : 'text-gray-500'}`}>
                            {audioVolume}
                        </span>
                        <span className="text-gray-500 text-xs">threshold: 20</span>
                    </div>
                    {/* Volume Bar */}
                    <div className="h-4 bg-gray-700 rounded-full overflow-hidden relative">
                        {/* Threshold marker */}
                        <div className="absolute left-[20%] top-0 bottom-0 w-0.5 bg-yellow-500 z-10" />
                        {/* Volume fill */}
                        <div
                            className={`h-full transition-all duration-100 ${audioVolume > 20 ? 'bg-green-500' : 'bg-gray-500'}`}
                            style={{ width: `${Math.min(100, audioVolume)}%` }}
                        />
                    </div>
                    <div className="text-center mt-2 text-xs text-gray-400">
                        {audioVolume > 20 ? '🎤 LOUD ENOUGH!' : '🔇 speak louder...'}
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center justify-center space-x-8 w-full">
                {/* Timer */}
                <div className="text-center">
                    <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Duration</div>
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-gray-800 tracking-wider">
                        {formatTime(audioDuration)}
                    </div>
                </div>

                {/* Laugh Counter */}
                <div className="text-center">
                    <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Laughs</div>
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-indigo-600 tracking-wider">
                        {laughCount}
                    </div>
                </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-full">
                <div className={`h-2.5 w-2.5 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' :
                    status === 'paused' ? 'bg-yellow-500' :
                        status === 'uploading' ? 'bg-blue-500 animate-bounce' :
                            'bg-gray-300'
                    }`} />
                <span className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">
                    {status.replace('_', ' ')}
                </span>
            </div>

            {/* Controls - Stack on very small screens, row on others */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
                {status === 'idle' && (
                    <button
                        onClick={() => startSession(userId)}
                        className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl sm:rounded-full hover:bg-indigo-700 active:scale-95 transition-all shadow-lg touch-manipulation"
                    >
                        Start Session
                    </button>
                )}

                {status === 'recording' && (
                    <>
                        <button
                            onClick={pauseSession}
                            className="w-full sm:w-auto px-8 py-3.5 bg-yellow-500 text-white font-bold rounded-xl sm:rounded-full hover:bg-yellow-600 active:scale-95 transition-all touch-manipulation"
                        >
                            Pause
                        </button>
                        <button
                            onClick={() => endSession(userId)}
                            className="w-full sm:w-auto px-8 py-3.5 bg-red-600 text-white font-bold rounded-xl sm:rounded-full hover:bg-red-700 active:scale-95 transition-all touch-manipulation"
                        >
                            Finish
                        </button>
                    </>
                )}

                {status === 'paused' && (
                    <>
                        <button
                            onClick={resumeSession}
                            className="w-full sm:w-auto px-8 py-3.5 bg-green-500 text-white font-bold rounded-xl sm:rounded-full hover:bg-green-600 active:scale-95 transition-all touch-manipulation"
                        >
                            Resume
                        </button>
                        <button
                            onClick={() => endSession(userId)}
                            className="w-full sm:w-auto px-8 py-3.5 bg-red-600 text-white font-bold rounded-xl sm:rounded-full hover:bg-red-700 active:scale-95 transition-all touch-manipulation"
                        >
                            Finish
                        </button>
                    </>
                )}

                {(status === 'completed' || status === 'offline_saved') && (
                    <button
                        onClick={() => startSession(userId)}
                        className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl sm:rounded-full hover:bg-indigo-700 active:scale-95 transition-all shadow-lg touch-manipulation"
                    >
                        Start New Session
                    </button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center w-full max-w-md">
                    {error}
                </div>
            )}

            {/* Offline Success Message */}
            {status === 'offline_saved' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm text-center w-full max-w-md">
                    Session saved to device. Will sync when online.
                </div>
            )}
        </div>
    );
}
