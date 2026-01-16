export interface UserSettings {
    theme: 'light' | 'dark' | 'system' | 'stitch';
    audio: {
        threshold: number;
        inputDeviceId: string;
        noiseSuppression: boolean;
    };
    privacy: {
        publicLeaderboard: boolean;
    };
    notifications: {
        reminders: boolean;
    };
}

export interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    settings: UserSettings;
    created_at: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
    theme: 'system',
    audio: {
        threshold: 55,
        inputDeviceId: 'default',
        noiseSuppression: true
    },
    privacy: {
        publicLeaderboard: true
    },
    notifications: {
        reminders: false
    }
};
