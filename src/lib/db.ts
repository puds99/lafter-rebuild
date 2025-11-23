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

interface LafterDB extends DBSchema {
    pending_uploads: {
        key: string;
        value: PendingUpload;
    };
}

const DB_NAME = 'lafter-db';
const DB_VERSION = 1;

export const initDB = async () => {
    return openDB<LafterDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('pending_uploads')) {
                db.createObjectStore('pending_uploads', { keyPath: 'id' });
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
