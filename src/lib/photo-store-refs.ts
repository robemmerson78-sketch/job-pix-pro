/** Photo reference format shared by browser and test code (no browser APIs here). */
export const REF_PREFIX = "idb:";
export const isPhotoRef = (s: string) => s.startsWith(REF_PREFIX);
export const refId = (s: string) => s.slice(REF_PREFIX.length);
export const toRef = (id: string) => `${REF_PREFIX}${id}`;
