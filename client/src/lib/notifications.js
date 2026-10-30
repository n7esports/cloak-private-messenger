function isCapacitorNative() {
  try {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function getCapacitorPlatform() {
  try {
    return window.Capacitor?.getPlatform?.() ?? 'web';
  } catch {
    return 'web';
  }
}

let serviceWorkerRegistrationPromise;
let nativePushPluginsPromise;
let nativeTokenWaiter;

const NOTIFICATION_TITLE = 'Cloak';
const PRIVATE_NOTIFICATION_BODY = 'New encrypted message received';

// List-Unsubscribe header helper: returns the RFC 8058 header value for any
// outbound email. No email routes exist yet in this client, so this is a
// utility — wire it into the email transport when that layer is built.
export function listUnsubscribeHeader(method = 'POST', email = 'unsubscribe@cloak') {
  return `<${method}:${email}>`;
}

function getWebPushKey() {
  return process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
}

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]*={0,2}$/.test(value)) {
    throw new Error('Invalid base64url input.');
  }
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const raw = window.atob(base64);
    return Uint8Array.from(raw, (character) => character.charCodeAt(0));
  } catch {
    throw new Error('Invalid base64url input.');
  }
}

async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  if (!serviceWorkerRegistrationPromise) {
    serviceWorkerRegistrationPromise = navigator.serviceWorker
      .register('/sw.js')
      .catch((error) => {
        serviceWorkerRegistrationPromise = null;
        throw error;
      });
  }

  return serviceWorkerRegistrationPromise;
}

export async function registerNotificationToken({ platform, token }) {
  const endpoint = process.env.NEXT_PUBLIC_NOTIFICATION_REGISTRATION_URL;
  if (!endpoint) {
    return { registered: false, reason: 'missing-registration-endpoint' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ platform, token }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Notification token registration failed with HTTP ${response.status}.`
      );
    }

    return { registered: true };
  } catch (error) {
    throw new Error(
      `Notification token registration failed: ${error.message}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestNativeNotificationPermission() {
  const [{ PushNotifications }, { LocalNotifications }] = await Promise.all([
    import(/* webpackIgnore: true */ '@capacitor/push-notifications'),
    import(/* webpackIgnore: true */ '@capacitor/local-notifications'),
  ]);

  let pushPermission = await PushNotifications.checkPermissions();
  if (pushPermission.receive !== 'granted') {
    pushPermission = await PushNotifications.requestPermissions();
  }

  if (pushPermission.receive !== 'granted') {
    return { status: 'denied', platform: getCapacitorPlatform() };
  }

  let localPermission = await LocalNotifications.checkPermissions();
  if (localPermission.display !== 'granted') {
    localPermission = await LocalNotifications.requestPermissions();
  }

  if (localPermission.display !== 'granted') {
    return { status: 'denied', platform: getCapacitorPlatform() };
  }

  if (!nativePushPluginsPromise) {
    nativePushPluginsPromise = PushNotifications.addListener(
      'registration',
      ({ value }) => nativeTokenWaiter?.resolve(value)
    ).then(() =>
      PushNotifications.addListener('registrationError', (error) =>
        nativeTokenWaiter?.reject(
          new Error(error?.error || 'Native push registration failed.')
        )
      )
    );
  }
  await nativePushPluginsPromise;

  let resolveToken;
  let rejectToken;
  const tokenPromise = new Promise((resolve, reject) => {
    resolveToken = resolve;
    rejectToken = reject;
  });
  nativeTokenWaiter = { resolve: resolveToken, reject: rejectToken };

  let timeoutId;
  try {
    await PushNotifications.register();
    const token = await Promise.race([
      tokenPromise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Timed out waiting for the native push token.')),
          15000
        );
      }),
    ]);
    const registration = await registerNotificationToken({
      platform: getCapacitorPlatform(),
      token,
    });
    return {
      status: 'granted',
      platform: getCapacitorPlatform(),
      token,
      registration,
    };
  } finally {
    clearTimeout(timeoutId);
    nativeTokenWaiter = null;
  }
}

async function requestWebNotificationPermission() {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator)
  ) {
    return { status: 'unsupported', platform: 'web' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { status: 'denied', platform: 'web' };
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration || !('PushManager' in window)) {
    return { status: 'unsupported', platform: 'web' };
  }

  const vapidPublicKey = getWebPushKey();
  if (!vapidPublicKey) {
    return {
      status: 'granted',
      platform: 'web',
      registration: { registered: false, reason: 'missing-vapid-key' },
    };
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(vapidPublicKey),
    });
  }

  const token = subscription.toJSON();
  const tokenRegistration = await registerNotificationToken({
    platform: 'web',
    token,
  });
  return {
    status: 'granted',
    platform: 'web',
    token,
    registration: tokenRegistration,
  };
}

export async function requestNotificationPermission() {
  try {
    if (isCapacitorNative()) {
      return await requestNativeNotificationPermission();
    }
    return await requestWebNotificationPermission();
  } catch (error) {
    return {
      status: 'error',
      platform: isCapacitorNative()
        ? getCapacitorPlatform()
        : 'web',
      error,
    };
  }
}

async function isAppInBackground() {
  if (isCapacitorNative()) {
    const { App } = await import(/* webpackIgnore: true */ '@capacitor/app');
    const state = await App.getState();
    return !state.isActive;
  }
  return document.visibilityState !== 'visible';
}

export async function triggerIncomingMessageNotification({
  sender,
  body,
  roomId,
  includeContent = false,
} = {}) {
  if (typeof window === 'undefined' || !(await isAppInBackground())) {
    return { status: 'not-backgrounded' };
  }

  const notificationBody =
    includeContent && typeof body === 'string' && body.trim()
      ? body.trim()
      : PRIVATE_NOTIFICATION_BODY;
  const extra = { roomId, sender };

  if (isCapacitorNative()) {
    const { LocalNotifications } = await import(
      /* webpackIgnore: true */ '@capacitor/local-notifications'
    );
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      return { status: 'denied', platform: getCapacitorPlatform() };
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 2147483647),
          title: NOTIFICATION_TITLE,
          body: notificationBody,
          extra,
        },
      ],
    });
    return { status: 'shown', platform: getCapacitorPlatform() };
  }

  if (
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return { status: 'denied', platform: 'web' };
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return { status: 'unsupported', platform: 'web' };
  }
  await registration.showNotification(NOTIFICATION_TITLE, {
    body: notificationBody,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: extra,
  });
  return { status: 'shown', platform: 'web' };
}
