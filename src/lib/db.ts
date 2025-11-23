import { openDB, type DBSchema } from 'idb';

interface PendingUpload {
    id: string;
    blob: Blob;
    metadata: {
        duration: number;
        timestamp: number;
        userId: string;
        mimeType: string;
        laughCount?: number;
    };
    created_at: number;
}

interface LaughClipDB {
    id: string;
    storage_path: string; // We'll use this as a unique key or just store the blob directly
    blob: Blob;
    duration: number;
    yamnet_score: number;
    created_at: number;
    play_count: number;
    approval_status?: 'pending' | 'approved' | 'rejected';
}

interface ClipInteractionDB {
    clip_id: string;
    liked: boolean;
    skipped_count: number;
    last_played_at: number;
}

interface LafterDB extends DBSchema {
    pending_uploads: {
        key: string;
        value: PendingUpload;
    };
    laugh_clips: {
        key: string;
        value: LaughClipDB;
        indexes: {
            'by-score': number;
            'by-approval': string;
        };
    };
    clip_interactions: {
        key: string;
        value: ClipInteractionDB;
    };
}

const DB_NAME = 'lafter-db';
const DB_VERSION = 3; // Bump for Phase 12

export const initDB = async () => {
    return openDB<LafterDB>(DB_NAME, DB_VERSION, {
        upgrade(db, _oldVersion, _newVersion, _transaction) {
            if (!db.objectStoreNames.contains('pending_uploads')) {
                db.createObjectStore('pending_uploads', { keyPath: 'id' });
            }

            // Upgrade or Create laugh_clips
            if (!db.objectStoreNames.contains('laugh_clips')) {
                const store = db.createObjectStore('laugh_clips', { keyPath: 'id' });
                store.createIndex('by-score', 'yamnet_score');
                store.createIndex('by-approval', 'approval_status');
            } else {
                // Migration for existing store (if needed)
                const store = _transaction.objectStore('laugh_clips');
                if (!store.indexNames.contains('by-approval')) {
                    store.createIndex('by-approval', 'approval_status');
                }
            }

            // Create clip_interactions
            if (!db.objectStoreNames.contains('clip_interactions')) {
                db.createObjectStore('clip_interactions', { keyPath: 'clip_id' });
            }
        },
    });
};

export const savePendingUpload = async (upload: PendingUpload) => {
    const db = await initDB();
    await db.put('pending_uploads', upload);
};

export const getPendingUploads = async () => {
    const db = await initDB();
    return db.getAll('pending_uploads');
};

export const deletePendingUpload = async (id: string) => {
    const db = await initDB();
    await db.delete('pending_uploads', id);
};

// Laugh Clips (Local Mode)
export const saveLaughClip = async (clip: LaughClipDB) => {
    const db = await initDB();
    // Ensure approval status is set if missing
    if (!clip.approval_status) clip.approval_status = 'pending';
    await db.put('laugh_clips', clip);
};

export const getLaughClips = async () => {
    const db = await initDB();
    return db.getAll('laugh_clips');
};

// Clip Interactions (Phase 12)
export const saveInteraction = async (interaction: ClipInteractionDB) => {
    const db = await initDB();
    await db.put('clip_interactions', interaction);
};

export const getInteraction = async (clipId: string) => {
    const db = await initDB();
    return db.get('clip_interactions', clipId);
};

export const getAllInteractions = async () => {
    const db = await initDB();
    return db.getAll('clip_interactions');
};

