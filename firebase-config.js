// js/firebase-config.js
export const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAqEsBUgdvvVbuYgmqG59yFlqekMxQ8L3g',
  authDomain:        'glm-universe.firebaseapp.com',
  projectId:         'glm-universe',
  storageBucket:     'glm-universe.firebasestorage.app',
  messagingSenderId: '426101358920',
  appId:             '1:426101358920:web:6d20b1c48ef2dba2d7b37d',
  measurementId:     'G-DJ03MXYLQ3'
};

// ✏️ Emails autorizados no admin
export const ALLOWED_EMAILS = [
  'guigas83@gmail.com',
];

// Cloudinary — substitua pelos seus dados em https://cloudinary.com/console
export const CLOUDINARY = {
  cloudName:    'SEU_CLOUD_NAME',   // ex: dxyz123abc
  uploadPreset: 'glm_unsigned',     // crie um Upload Preset unsigned no Cloudinary
};
