/**
 * @fileoverview This file is deprecated.
 * The synchronization logic has been moved to a Next.js Server Action
 * in `src/app/actions/sync-processes.ts`.
 * This Firebase Function is no longer in use and can be removed.
 */
import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const syncNewProcesses = onCall(async () => {
  logger.warn(
    "The 'syncNewProcesses' function is deprecated and should not be called."
  );
  throw new Error(
    "This function is deprecated. Please use the frontend action."
  );
});
