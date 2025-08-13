
import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {google} from "googleapis";

// This is the ID of the main folder in Google Drive that you have shared
// with your service account. Replace it with your actual folder ID.
const PARENT_FOLDER_ID = "YOUR_MAIN_DRIVE_FOLDER_ID";

/**
 * A callable function to fetch a list of files from a specific
 * user's folder in Google Drive.
 */
export const getGoogleDriveFiles = onCall({
  cors: true, // or specify your allowed origins
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const folderName = request.data.folderName;
  if (!folderName) {
    throw new HttpsError("invalid-argument", "The 'folderName' parameter is required.");
  }

  try {
    // Authenticate with Google Drive API using Application Default Credentials
    // This works automatically in Firebase/Google Cloud environments.
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const drive = google.drive({version: "v3", auth});

    // 1. Find the specific user's folder inside the main shared folder
    const folderRes = await drive.files.list({
      q: `name='${folderName}' and '${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: "files(id)",
      spaces: "drive",
    });

    if (!folderRes.data.files || folderRes.data.files.length === 0) {
      logger.info(`No Drive folder found for document: ${folderName}`);
      return []; // No folder found, return empty array
    }

    const userFolderId = folderRes.data.files[0].id;

    // 2. List all files inside that user's folder
    const fileRes = await drive.files.list({
      q: `'${userFolderId}' in parents`,
      fields: "files(id, name, webViewLink, mimeType)",
      orderBy: "name",
    });

    const files = fileRes.data.files || [];
    logger.info(`Found ${files.length} files in folder ${folderName}`);

    return files.map((file) => ({
      id: file.id,
      name: file.name,
      webViewLink: file.webViewLink,
      mimeType: file.mimeType,
    }));
  } catch (error: any) {
    logger.error(`Error accessing Google Drive API for folder ${folderName}:`, error);
    if (error.code === 403) {
      throw new HttpsError("permission-denied", "Permission denied. Ensure the service account has access to the Drive folder.");
    }
    throw new HttpsError("internal", "An unexpected error occurred while fetching Google Drive files.");
  }
});
