let messaging = null;

function initFCM() {
  if (messaging || !process.env.FIREBASE_SERVICE_ACCOUNT) return;
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messaging = admin.messaging();
  } catch (err) {
    console.warn('FCM not initialised (check FIREBASE_SERVICE_ACCOUNT):', err.message);
  }
}

// Sends to up to 500 tokens per call (FCM multicast limit).
async function broadcastNotification(tokens, title, body) {
  initFCM();
  if (!messaging || !tokens.length) return;
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      android: { priority: 'high' },
    });
  }
}

async function sendPushToToken(token, title, body, data = {}) {
  initFCM();
  if (!messaging || !token) return;
  await messaging.send({ token, notification: { title, body }, data });
}

module.exports = { broadcastNotification, sendPushToToken };
