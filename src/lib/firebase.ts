/**
 * Firebase — REMOVED.
 *
 * The app has been fully migrated off Firebase to its own backend (Express +
 * MongoDB) and Amazon S3. This module used to initialize the Firebase JS SDK
 * (Firestore/Storage/Auth); nothing imports it anymore. It's kept as an empty
 * stub only so the path doesn't 404 if a stale import lingers somewhere.
 */
export const auth: any = null;
export const db: any = null;
export const storage: any = null;
export default null;
