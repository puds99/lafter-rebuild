import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase, DEMO_MODE } from '../lib/supabase';
import { DEFAULT_SETTINGS } from '../types';
import type { UserSettings } from '../types';

interface SettingsContextType {
    settings: UserSettings;
    updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    // Load settings on mount or user change
    useEffect(() => {
        if (!user) {
            setSettings(DEFAULT_SETTINGS);
            setLoading(false);
            return;
        }

        if (DEMO_MODE) {
            // Load from localStorage in demo mode
            const stored = localStorage.getItem('demo_settings');
            if (stored) {
                try {
                    setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
                } catch (e) {
                    console.error('Failed to parse demo settings', e);
                }
            }
            setLoading(false);
            return;
        }

        async function loadProfile() {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('settings')
                    .eq('id', user!.id)
                    .single();

                if (error) throw error;

                if (data?.settings) {
                    // Merge with defaults to ensure all fields exist
                    setSettings(prev => ({ ...prev, ...data.settings }));
                }
            } catch (err) {
                console.error('Error loading settings:', err);
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, [user]);

    // Apply Theme Effect
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'stitch');

        if (settings.theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(settings.theme);
        }
    }, [settings.theme]);

    const updateSettings = async (newSettings: Partial<UserSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);

        if (DEMO_MODE) {
            localStorage.setItem('demo_settings', JSON.stringify(updated));
            return;
        }

        if (user) {
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({ settings: updated })
                    .eq('id', user.id);

                if (error) throw error;
            } catch (err) {
                console.error('Error saving settings:', err);
                // Revert on error? Or just log it.
            }
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
