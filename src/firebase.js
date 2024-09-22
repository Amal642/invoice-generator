import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  // Your Firebase configuration
    apiKey: "AIzaSyCKECr375ybtZRzbnjqhIoHrOf9vuLRmVU",
    authDomain: "invoice-generator-3c3db.firebaseapp.com",
    projectId: "invoice-generator-3c3db",
    storageBucket: "invoice-generator-3c3db.appspot.com",
    messagingSenderId: "703166193237",
    appId: "1:703166193237:web:2903baf832bbe8aa317edc",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const fetchImages = async () => {
  const imagesCollection = collection(db, "images");
  const imageSnapshot = await getDocs(imagesCollection);
  return imageSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};
