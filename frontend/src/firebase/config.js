import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyADDH4lur4In_dzLpOCS1LH8zwG2ztkyno",
  authDomain: "smartcampusai-ec8e5.firebaseapp.com",
  projectId: "smartcampusai-ec8e5",
  storageBucket: "smartcampusai-ec8e5.firebasestorage.app",
  messagingSenderId: "884887512980",
  appId: "1:884887512980:web:c61d372f71e7c9bada5181"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();