'use strict';
const admin = require('firebase-admin');

function initFirebase(){
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
  return {
    db: admin.firestore(),
    bucket: admin.storage().bucket()
  };
}

module.exports = { initFirebase };
