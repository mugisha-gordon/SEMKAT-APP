/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

setGlobalOptions({ maxInstances: 10 });
initializeApp();

/** Firebase Storage URL pattern for our project's bucket */
const FIREBASE_STORAGE_URL =
  /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/[^?]+\?alt=media(&.*)?$/;

/** CORS headers for all responses */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/**
 * HTTP function to fetch KML content from Firebase Storage.
 * Bypasses CORS by fetching server-side. Only allows URLs from Firebase Storage.
 * Uses explicit CORS headers for localhost and production.
 */
export const fetchKmlContent = onRequest(
  {maxInstances: 5, cors: true},
  async (req, res) => {
    // Handle preflight
    res.set(CORS_HEADERS);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }
    let url = "";
    try {
      const body = req.body as {url?: string} | undefined;
      url = typeof body?.url === "string" ? body.url.trim() : "";
    } catch {
      // ignore
    }
    if (!url) {
      res.status(400).json({error: "Missing or invalid url parameter"});
      return;
    }
    if (!FIREBASE_STORAGE_URL.test(url)) {
      res.status(400).json({error: "URL must be a valid Firebase Storage download URL"});
      return;
    }
    try {
      const storageRes = await fetch(url, {
        method: "GET",
        headers: {"Accept": "application/xml, text/xml, text/plain, */*"},
      });
      if (!storageRes.ok) {
        logger.error("Storage fetch failed", {url, status: storageRes.status});
        res.status(502).json({error: `Storage returned ${storageRes.status}`});
        return;
      }
      const text = await storageRes.text();
      res.status(200).json({text});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error("fetchKmlContent failed", {url, error: msg});
      res.status(500).json({error: msg});
    }
  }
);

/**
 * Push notification sender for app notifications.
 * Triggered whenever a new notifications/{notificationId} document is created.
 */
export const sendPushOnNotificationCreate = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() as {
      title?: string;
      description?: string;
      audience?: "all" | "user";
      userId?: string;
      type?: string;
    };

    // We currently only push user-targeted notifications.
    if (data.audience !== "user" || !data.userId) return;

    try {
      const userRef = getFirestore().doc(`users/${data.userId}`);
      const userSnap = await userRef.get();
      if (!userSnap.exists) return;

      const user = userSnap.data() as {
        profile?: {
          pushToken?: string | null;
        };
      };

      const token = user?.profile?.pushToken;
      if (!token) {
        logger.info("No push token for target user", {userId: data.userId});
        return;
      }

      await getMessaging().send({
        token,
        notification: {
          title: data.title || "Semkat Hub",
          body: data.description || "You have a new update",
        },
        android: {
          priority: "high",
          notification: {
            channelId: /message/i.test(data.title || "") ?
              "semkat_messages" :
              "semkat_general",
            sound: "default",
          },
        },
        data: {
          notificationId: snap.id,
          type: data.type || "info",
          userId: data.userId,
        },
      });
    } catch (error: any) {
      logger.error("Failed sending push notification", {
        notificationId: snap.id,
        error: error?.message || String(error),
      });
    }
  }
);
