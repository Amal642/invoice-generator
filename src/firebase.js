import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCKECr375ybtZRzbnjqhIoHrOf9vuLRmVU",
    authDomain: "invoice-generator-3c3db.firebaseapp.com",
    projectId: "invoice-generator-3c3db",
    storageBucket: "invoice-generator-3c3db.appspot.com",
    messagingSenderId: "703166193237",
    appId: "1:703166193237:web:2903baf832bbe8aa317edc",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore and Storage references
const db = getFirestore(app);
const storage = getStorage(app);

// Function to fetch images from Firestore
export const fetchImages = async () => {
  const imagesCollection = collection(db, "images/");
  const imageSnapshot = await getDocs(imagesCollection);
  return imageSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Function to upload an image to Firebase Storage
export const uploadImageToStorage = async (path, file) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// Function to save image details to Firestore
export const saveImageToFirestore = async (imageData) => {
  const imagesCollection = collection(db, "images");
  await addDoc(imagesCollection, imageData);
};
