// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCKECr375ybtZRzbnjqhIoHrOf9vuLRmVU",
    authDomain: "invoice-generator-3c3db.firebaseapp.com",
    projectId: "invoice-generator-3c3db",
    storageBucket: "invoice-generator-3c3db.appspot.com",
    messagingSenderId: "703166193237",
    appId: "1:703166193237:web:2903baf832bbe8aa317edc",
    measurementId: "G-1F674CZNZP"
  };
  


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
