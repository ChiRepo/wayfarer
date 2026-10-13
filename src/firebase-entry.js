export { initializeApp, getApps } from 'firebase/app';
export { initializeAuth, inMemoryPersistence, signInAnonymously } from 'firebase/auth';
export { getDatabase, ref, get, set, remove, onValue, onDisconnect, runTransaction, serverTimestamp, goOffline, goOnline } from 'firebase/database';
