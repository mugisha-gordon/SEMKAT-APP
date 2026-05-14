import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useAuth } from "@/context/AuthContext";
import { subscribeToNotificationsForUser, type NotificationDocument } from "@/integrations/firebase/notifications";
import { updateUserDocument } from "@/integrations/firebase/users";

const MESSAGE_CHANNEL_ID = "semkat_messages";
const GENERAL_CHANNEL_ID = "semkat_general";

const MobileNotificationsBridge = () => {
  const { user } = useAuth();
  const initializedForUserRef = useRef<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialSnapshotLoadedRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!user?.uid) {
      initializedForUserRef.current = null;
      seenIdsRef.current = new Set();
      initialSnapshotLoadedRef.current = false;
      return;
    }

    if (initializedForUserRef.current === user.uid) {
      return;
    }
    initializedForUserRef.current = user.uid;
    seenIdsRef.current = new Set();
    initialSnapshotLoadedRef.current = false;

    let unsubNotifications: (() => void) | null = null;
    let pushRegistered = false;

    const scheduleLocalNotification = async (notification: NotificationDocument) => {
      const isMessage = /message/i.test(notification.title || "") || notification.actorId != null;
      const channelId = isMessage ? MESSAGE_CHANNEL_ID : GENERAL_CHANNEL_ID;
      const id = Math.floor(Date.now() % 2147483000);
      const body = notification.description || notification.title || "New update";

      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title: notification.title || "Semkat Hub",
              body,
              channelId,
              extra: {
                notificationId: notification.id,
                audience: notification.audience,
                userId: notification.userId,
              },
            },
          ],
        });
      } catch (error) {
        console.error("Failed scheduling local notification:", error);
      }
    };

    const init = async () => {
      try {
        await LocalNotifications.createChannel({
          id: MESSAGE_CHANNEL_ID,
          name: "Messages",
          description: "New chat messages",
          importance: 5,
          visibility: 1,
          vibration: true,
        });
        await LocalNotifications.createChannel({
          id: GENERAL_CHANNEL_ID,
          name: "General",
          description: "General Semkat notifications",
          importance: 4,
          visibility: 1,
          vibration: true,
        });
      } catch {
        // channel may already exist
      }

      try {
        const localPerms = await LocalNotifications.checkPermissions();
        if (localPerms.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
      } catch (error) {
        console.error("Failed requesting local notification permission:", error);
      }

      try {
        const pushPerms = await PushNotifications.checkPermissions();
        if (pushPerms.receive !== "granted") {
          const req = await PushNotifications.requestPermissions();
          if (req.receive !== "granted") {
            console.warn("Push notifications permission not granted");
          }
        }

        PushNotifications.addListener("registration", async (token) => {
          try {
            await updateUserDocument(user.uid, {
              profile: {
                pushToken: token.value,
                pushPlatform: Capacitor.getPlatform(),
              },
            });
          } catch (error) {
            console.error("Failed saving push token:", error);
          }
        });

        PushNotifications.addListener("registrationError", (error) => {
          console.error("Push registration error:", error);
        });

        PushNotifications.addListener("pushNotificationReceived", async (notification) => {
          // If a native push arrives while app is in foreground, mirror to status-bar notification.
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Math.floor(Date.now() % 2147483000),
                  title: notification.title || "Semkat Hub",
                  body: notification.body || "New notification",
                  channelId: MESSAGE_CHANNEL_ID,
                },
              ],
            });
          } catch (error) {
            console.error("Failed mirroring push to local notification:", error);
          }
        });

        await PushNotifications.register();
        pushRegistered = true;
      } catch (error) {
        console.error("Push setup failed:", error);
      }

      unsubNotifications = subscribeToNotificationsForUser(user.uid, (items) => {
        // Seed existing documents first so we only notify for newly created items.
        if (!initialSnapshotLoadedRef.current) {
          items.forEach((n) => seenIdsRef.current.add(n.id));
          initialSnapshotLoadedRef.current = true;
          return;
        }

        for (const item of items) {
          if (seenIdsRef.current.has(item.id)) continue;
          seenIdsRef.current.add(item.id);
          void scheduleLocalNotification(item);
        }
      }, { limit: 100 });
    };

    void init();

    return () => {
      if (unsubNotifications) {
        try {
          unsubNotifications();
        } catch {
          // ignore
        }
      }
      if (pushRegistered) {
        try {
          PushNotifications.removeAllListeners();
        } catch {
          // ignore
        }
      }
    };
  }, [user?.uid]);

  return null;
};

export default MobileNotificationsBridge;

