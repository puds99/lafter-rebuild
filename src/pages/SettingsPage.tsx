import { useSettings } from '../context/SettingsContext';

export function SettingsPage() {
    const { settings, updateSettings, loading } = useSettings();

    if (loading) {
        return <div className="p-8 text-center">Loading settings...</div>;
    }

    const handleThemeChange = (theme: 'light' | 'dark' | 'system' | 'stitch') => {
        updateSettings({ theme });
    };

    const handleAudioChange = (key: keyof typeof settings.audio, value: any) => {
        updateSettings({
            audio: {
                ...settings.audio,
                [key]: value
            }
        });
    };

    const handlePrivacyChange = (key: keyof typeof settings.privacy, value: any) => {
        updateSettings({
            privacy: {
                ...settings.privacy,
                [key]: value
            }
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Appearance</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {['light', 'dark', 'system', 'stitch'].map((theme) => (
                        <button
                            key={theme}
                            onClick={() => handleThemeChange(theme as any)}
                            className={`p-4 rounded-lg border-2 capitalize ${settings.theme === theme
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            {theme}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Audio Calibration</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Microphone Sensitivity (Threshold: {settings.audio.threshold})
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings.audio.threshold}
                            onChange={(e) => handleAudioChange('threshold', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Lower = More Sensitive (Detects quiet laughs). Higher = Less Sensitive (Ignores noise).
                        </p>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="flex-grow flex flex-col">
                            <span className="text-sm font-medium text-gray-900">Noise Suppression</span>
                            <span className="text-sm text-gray-500">Reduce background noise</span>
                        </span>
                        <button
                            onClick={() => handleAudioChange('noiseSuppression', !settings.audio.noiseSuppression)}
                            className={`${settings.audio.noiseSuppression ? 'bg-indigo-600' : 'bg-gray-200'
                                } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                        >
                            <span
                                aria-hidden="true"
                                className={`${settings.audio.noiseSuppression ? 'translate-x-5' : 'translate-x-0'
                                    } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Privacy</h2>
                <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col">
                        <span className="text-sm font-medium text-gray-900">Public Leaderboard</span>
                        <span className="text-sm text-gray-500">Show my streak on the global leaderboard</span>
                    </span>
                    <button
                        onClick={() => handlePrivacyChange('publicLeaderboard', !settings.privacy.publicLeaderboard)}
                        className={`${settings.privacy.publicLeaderboard ? 'bg-indigo-600' : 'bg-gray-200'
                            } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    >
                        <span
                            aria-hidden="true"
                            className={`${settings.privacy.publicLeaderboard ? 'translate-x-5' : 'translate-x-0'
                                } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}
