import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CornellNote, Notebook, UserPreferences } from '../types/models';

export const DB_NAME = 'cornelieu-x-notes-db';
export const DB_VERSION = 1;

export interface CornelieuDBSchema extends DBSchema {
  notes: {
    key: string;
    value: CornellNote;
    indexes: {
      'by-updatedAt': number;
      'by-notebookId': string;
      'by-status': string;
      'by-deletedAt': number;
      'by-nextReviewAt': number;
    };
  };
  notebooks: {
    key: string;
    value: Notebook;
    indexes: {
      'by-name': string;
    };
  };
  preferences: {
    key: 'user';
    value: UserPreferences;
  };
}

let dbPromise: Promise<IDBPDatabase<CornelieuDBSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<CornelieuDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<CornelieuDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('by-updatedAt', 'updatedAt');
          noteStore.createIndex('by-notebookId', 'notebookId');
          noteStore.createIndex('by-status', 'status');
          noteStore.createIndex('by-deletedAt', 'deletedAt');
          noteStore.createIndex('by-nextReviewAt', 'review.nextReviewAt');
        }

        if (!db.objectStoreNames.contains('notebooks')) {
          const nbStore = db.createObjectStore('notebooks', { keyPath: 'id' });
          nbStore.createIndex('by-name', 'name');
        }

        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function resetDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
