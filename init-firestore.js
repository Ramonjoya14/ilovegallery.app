const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Your web app's Firebase configuration
const firebaseConfig = {
    projectId: "instaroll-2026",
    appId: "1:402998744302:web:fdfa52114047312fb10fff",
    storageBucket: "instaroll-2026.firebasestorage.app",
    apiKey: "AIzaSyBSxs4jQnHDFcnCMuR9RBwY9IGTBn4eeSU",
    authDomain: "instaroll-2026.firebaseapp.com",
    messagingSenderId: "402998744302",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function init() {
    console.log("Initializing Firestore with sample data...");

    try {
        // 1. Create Sample Event
        const eventsRef = collection(db, 'events');
        const eventDoc = await addDoc(eventsRef, {
            name: "Bienvenida a iLoveGallery 📸",
            organizer: "Equipo iLoveGallery",
            organizerId: "system",
            date: new Date(),
            photoCount: 1,
            maxPhotos: 100,
            status: 'active',
            description: "Este es un evento de ejemplo para que veas cómo funciona la app. ¡Crea el tuyo propio!",
            code: "WELCOME",
            createdAt: serverTimestamp()
        });
        console.log("Created sample event with ID:", eventDoc.id);

        // 2. Create Sample Photo
        const photosRef = collection(db, 'photos');
        const photoDoc = await addDoc(photosRef, {
            url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
            eventId: eventDoc.id,
            userId: "system",
            userName: "System",
            timestamp: serverTimestamp()
        });
        console.log("Created sample photo with ID:", photoDoc.id);

        console.log("Firestore initialization complete!");
        process.exit(0);
    } catch (error) {
        console.error("Error initializing Firestore:", error);
        process.exit(1);
    }
}

init();
