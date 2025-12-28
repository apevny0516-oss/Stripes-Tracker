import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase configuration - you'll need to replace these with your own values
// Go to: https://console.firebase.google.com/
// 1. Create a new project (or use existing)
// 2. Go to Project Settings > General > Your apps > Add app > Web
// 3. Copy the config values here
const firebaseConfig = {
    apiKey: "AIzaSyBTrWWFvjvk9Y5l1YNGQGih7EzijJw30vk",
    authDomain: "stripes-tracker.firebaseapp.com",
    projectId: "stripes-tracker",
    storageBucket: "stripes-tracker.firebasestorage.app",
    messagingSenderId: "11321313480",
    appId: "1:11321313480:web:e8dfcc0d8da15de0eb3dfd",
    measurementId: "G-DR9WLBN0CP"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)



