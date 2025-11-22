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
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        error
    } = useSessionManager();

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Map volume (0-100) to animation speed (0.5 - 2.5)
    const animationSpeed = 0.5 + (audioVolume / 100) * 2;

    return (
        <div className="flex flex-col items-center justify-center space-y-8 p-6 bg-white rounded-2xl shadow-xl max-w-2xl mx-auto mt-10">
            {/* Avatar Area */}
            <div className="relative">
                <LottieAvatar speed={status === 'recording' ? animationSpeed : 0.5} />
                {status === 'recording' && audioVolume > 50 && (
                    <div className="absolute -top-4 -right-4 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                        LAUGH DETECTED!
                    </div>
                )}
            </div>

            {/* Timer */}
            <div className="text-5xl font-mono font-bold text-gray-800 tracking-wider">
                {formatTime(audioDuration)}
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' :
                        status === 'paused' ? 'bg-yellow-500' :
                            status === 'uploading' ? 'bg-blue-500 animate-bounce' :
                                'bg-gray-300'
                    }`} />
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    {status.replace('_', ' ')}
                </span>
            </div>

            {/* Controls */}
            <div className="flex space-x-4">
                {status === 'idle' && (
                    <button
                        onClick={() => startSession(userId)}
                        className="px-8 py-4 bg-indigo-600 text-white text-lg font-bold rounded-full hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                    >
                        Start Session
                    </button>
                )}

                {status === 'recording' && (
                    <>
                        <button
                            onClick={pauseSession}
                            className="px-6 py-3 bg-yellow-500 text-white font-bold rounded-full hover:bg-yellow-600 transition-colors"
                        >
                            Pause
                        </button>
                        <button
                            onClick={() => endSession(userId)}
                            className="px-6 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-colors"
                        >
                            Finish
                        </button>
                    </>
                )}

                {status === 'paused' && (
                    <>
                        <button
                            onClick={resumeSession}
                            className="px-6 py-3 bg-green-500 text-white font-bold rounded-full hover:bg-green-600 transition-colors"
                        >
                            Resume
                        </button>
                        <button
                            onClick={() => endSession(userId)}
                            className="px-6 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-colors"
                        >
                            Finish
                        </button>
                    </>
                )}

                {(status === 'completed' || status === 'offline_saved') && (
                    <button
                        onClick={() => startSession(userId)}
                        className="px-8 py-4 bg-indigo-600 text-white text-lg font-bold rounded-full hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                    >
                        Start New Session
                    </button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center max-w-md">
                    {error}
                </div>
            )}

            {/* Offline Success Message */}
            {status === 'offline_saved' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm text-center max-w-md">
                    Session saved to device. Will sync when online.
                </div>
            )}
        </div>
    );
}
