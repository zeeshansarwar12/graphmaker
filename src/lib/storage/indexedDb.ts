import {
  currentProjectId,
  graphProjectStorageId,
  parseGraphProject,
} from './graphProject';
import type { GraphProject } from './graphProject';

const databaseName = 'graph-maker';
const databaseVersion = 1;
const projectStoreName = 'projects';

export type StoredProjectResult =
  | { status: 'corrupt' }
  | { status: 'empty' }
  | { project: GraphProject; status: 'ready' };

function openDatabase(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!factory) {
      reject(new Error('IndexedDB is unavailable in this browser.'));
      return;
    }

    const request = factory.open(databaseName, databaseVersion);
    request.onerror = () => reject(request.error ?? new Error('Could not open local project storage.'));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(projectStoreName)) {
        request.result.createObjectStore(projectStoreName, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function completeTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Local project storage failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local project storage was interrupted.'));
  });
}

function parseStoredProject(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return parseGraphProject(value);
  }
  return parseGraphProject({ ...value, id: currentProjectId });
}

export async function saveCurrentProject(project: GraphProject, slug = '/'): Promise<void> {
  const database = await openDatabase();
  try {
    const storageId = graphProjectStorageId(slug);
    const transaction = database.transaction(projectStoreName, 'readwrite');
    const store = transaction.objectStore(projectStoreName);
    const existingRequest = store.get(storageId);
    existingRequest.onsuccess = () => {
      const existing = parseStoredProject(existingRequest.result as unknown);
      if (
        existing.ok
        && Date.parse(existing.project.updatedAt) > Date.parse(project.updatedAt)
      ) return;
      store.put({ ...project, id: storageId });
    };
    await completeTransaction(transaction);
  } finally {
    database.close();
  }
}

export async function loadCurrentProject(slug = '/'): Promise<StoredProjectResult> {
  const database = await openDatabase();
  try {
    const storageId = graphProjectStorageId(slug);
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = database
        .transaction(projectStoreName, 'readonly')
        .objectStore(projectStoreName)
        .get(storageId);
      request.onerror = () => reject(request.error ?? new Error('Could not read the local project.'));
      request.onsuccess = () => resolve(request.result as unknown);
    });

    if (value === undefined) return { status: 'empty' };
    const parsed = parseStoredProject(value);
    return parsed.ok ? { project: parsed.project, status: 'ready' } : { status: 'corrupt' };
  } finally {
    database.close();
  }
}

export async function deleteCurrentProject(slug = '/'): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(projectStoreName, 'readwrite');
    transaction.objectStore(projectStoreName).delete(graphProjectStorageId(slug));
    await completeTransaction(transaction);
  } finally {
    database.close();
  }
}
