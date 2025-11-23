import { useSettings } from '../context/SettingsContext';

export function SettingsPage() {
    const { settings, updateSettings, loading } = useSettings();

    if (loading) {
        return <div className="p-8 text-center text-stitch-muted">Loading settings...</div>;
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
        <div className="max-w-3xl mx-auto space-y-8 pt-8">
            <h1 className="text-3xl font-display font-bold text-white mb-8">Settings</h1>

            <div className="glass-panel p-6 rounded-xl">
                <h2 className="text-xl font-display font-bold text-white mb-6">Appearance</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {['light', 'dark', 'system', 'stitch'].map((theme) => (
                        <button
                            key={theme}
                            onClick={() => handleThemeChange(theme as any)}
                            className={`p-4 rounded-lg border transition-all duration-200 capitalize font-medium ${settings.theme === theme
                                    ? 'border-stitch-primary bg-stitch-primary/20 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                                    : 'border-white/10 text-stitch-muted hover:border-white/30 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {theme}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-panel p-6 rounded-xl">
                <h2 className="text-xl font-display font-bold text-white mb-6">Audio Calibration</h2>
                <div className="space-y-8">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="block text-sm font-medium text-stitch-text">
                                Microphone Sensitivity
                            </label>
                            <span className="text-stitch-accent font-mono text-sm">{settings.audio.threshold}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings.audio.threshold}
                            onChange={(e) => handleAudioChange('threshold', parseInt(e.target.value))}
                            className="w-full h-2 bg-stitch-surface rounded-lg appearance-none cursor-pointer accent-stitch-primary"
                        />
                        <p className="mt-2 text-xs text-stitch-muted">
                            Lower = More Sensitive (Detects quiet laughs). Higher = Less Sensitive (Ignores noise).
                        </p>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="flex-grow flex flex-col">
                            <span className="text-sm font-medium text-stitch-text">Noise Suppression</span>
                            <span className="text-sm text-stitch-muted">Reduce background noise</span>
                        </span>
                        <button
                            onClick={() => handleAudioChange('noiseSuppression', !settings.audio.noiseSuppression)}
                            className={`${settings.audio.noiseSuppression ? 'bg-stitch-primary' : 'bg-stitch-surface'
                                } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stitch-primary`}
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

            <div className="glass-panel p-6 rounded-xl">
                <h2 className="text-xl font-display font-bold text-white mb-6">Privacy</h2>
                <div className="flex items-center justify-between">
                    <span className="flex-grow flex flex-col">
                        <span className="text-sm font-medium text-stitch-text">Public Leaderboard</span>
                        <span className="text-sm text-stitch-muted">Show my streak on the global leaderboard</span>
                    </span>
                    <button
                        onClick={() => handlePrivacyChange('publicLeaderboard', !settings.privacy.publicLeaderboard)}
                        className={`${settings.privacy.publicLeaderboard ? 'bg-stitch-primary' : 'bg-stitch-surface'
                            } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stitch-primary`}
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
