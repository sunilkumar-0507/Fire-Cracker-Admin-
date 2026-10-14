/**
 * Browser notifications for new orders and bulk enquiries — the admin's answer
 * to the phone app's push, for a phone or a laptop that only has the website.
 *
 * The pieces: `public/sw.js` shows what arrives; this file asks for permission,
 * subscribes the browser with the API's VAPID key and hands the subscription to
 * the API, which sends to it whenever an order or an enquiry comes in.
 *
 * Where it works:
 * - Chrome, Edge, Firefox and Samsung Internet, on Android and on desktops.
 * - iPhone and iPad from iOS 16.4, but only once the admin has been added to
 *   the Home Screen and opened from there. In a Safari tab there is no
 *   PushManager at all, which is why that case gets its own state.
 */
import { adminApi } from '@/lib/api';

const SW_URL = '/sw.js';

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS reports itself as a Mac; touch gives it away.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

const hasPush = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/**
 * One of:
 * - `unsupported` — this browser cannot do web push.
 * - `needs-home-screen` — an iPhone in a Safari tab: add to Home Screen first.
 * - `denied` — the browser has been told to block this site's notifications.
 * - `on` / `off`.
 */
export const pushState = async () => {
  if (!hasPush()) return isIos() && !isStandalone() ? 'needs-home-screen' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';

  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? 'on' : 'off';
};

/** A name for the API's list, so two browsers can be told apart. */
const deviceName = () => {
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua)
    ? 'iPhone'
    : isIos()
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android phone'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac/.test(ua)
            ? 'Mac'
            : 'Computer';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /SamsungBrowser/.test(ua)
      ? 'Samsung Internet'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : 'Safari';
  return `${device} · ${browser}`;
};

const toBytes = (base64url) => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const sameKey = (buffer, bytes) => {
  if (!buffer) return false;
  const a = new Uint8Array(buffer);
  return a.length === bytes.length && a.every((v, i) => v === bytes[i]);
};

/**
 * The browser's subscription for the API's current key, made if there is none.
 * A subscription made with an older key — the API's key pair was replaced —
 * is thrown away, because the push services would refuse every send to it.
 */
const subscribeBrowser = async () => {
  const registration = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;

  const { publicKey } = await adminApi.webPush.key();
  const key = toBytes(publicKey);

  const existing = await registration.pushManager.getSubscription();
  if (existing && sameKey(existing.options?.applicationServerKey, key)) return existing;
  if (existing) await existing.unsubscribe();

  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
};

/**
 * Asks for permission and subscribes. Must run from a tap or a click: iOS and
 * Firefox only show the permission prompt in response to one.
 *
 * Resolves to the new state; throws an Error with a sentence to show otherwise.
 */
export const enablePush = async () => {
  const state = await pushState();
  if (state === 'needs-home-screen')
    throw new Error('On iPhone, tap Share → Add to Home Screen, open the admin from there, then turn this on.');
  if (state === 'unsupported') throw new Error('This browser cannot show notifications from a website.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted')
    throw new Error('Notifications are blocked for this site. Allow them in the browser’s site settings.');

  const subscription = await subscribeBrowser();
  await adminApi.webPush.subscribe(subscription.toJSON(), deviceName());
  return 'on';
};

/** Unsubscribes this browser, here and on the API. */
export const disablePush = async () => {
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return 'off';

  // The API first: if that fails the browser stays subscribed, and the switch
  // still says "on", which is the truth.
  await adminApi.webPush.unsubscribe(subscription.endpoint).catch((error) => {
    if (error.status !== 404) throw error;
  });
  await subscription.unsubscribe();
  return 'off';
};

/**
 * Re-sends this browser's subscription each time the admin opens.
 *
 * That is what keeps the API's list right without anyone looking after it: a
 * list lost to a redeploy refills, a key pair that changed gets a fresh
 * subscription, and a subscription the browser rotated by itself reaches the
 * API. (The service worker cannot do this — the passcode lives in the page's
 * session, not in there.) Never prompts, and never throws.
 */
export const refreshPush = async () => {
  try {
    if ((await pushState()) !== 'on') return;
    const subscription = await subscribeBrowser();
    await adminApi.webPush.subscribe(subscription.toJSON(), deviceName());
  } catch {
    /* The next open tries again; the switch in the header shows the real state. */
  }
};

export const sendTestPush = () => adminApi.webPush.test();
