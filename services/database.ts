import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Interfaces
export interface Event {
    id?: string;
    name: string;
    organizer: string;
    organizerId: string;
    date: any;
    photoCount: number;
    maxPhotos: number;
    status: 'active' | 'expired' | 'finished';
    description?: string;
    location?: string;
    code: string; // Event access code
    pin?: string; // Optional PIN for private events
    coverImage?: string; // URL for the event cover photo
    coverStoragePath?: string;
    template?: string;
    isArchived?: boolean;
    isFavorite?: boolean;
    views?: number;
    createdAt?: any;
    rootId?: string; // ID of the original event this was cloned from
}

export interface Photo {
    id?: string;
    url: string;
    eventId: string;
    userId: string;
    userName: string;
    timestamp: any;
    type?: 'image' | 'video';
    storagePath?: string;
    isLiked?: boolean;
}

export interface Notification {
    id?: string;
    userId: string;
    type: 'event_created' | 'download_success' | 'monthly_summary' | 'system';
    title: string;
    message: string;
    timestamp: any;
    isRead: boolean;
    data?: any;
}

// Collections Refs
const eventsRef = collection(db, 'events');
const photosRef = collection(db, 'photos');
const usersRef = collection(db, 'users');
const notificationsRef = collection(db, 'notifications');

// Database Services
export const databaseService = {
    // Users
    async updateUserProfile(userId: string, data: any) {
        try {
            const userDoc = doc(db, 'users', userId);
            await setDoc(userDoc, {
                ...data,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error updating user profile: ", error);
            throw error;
        }
    },

    async getUserProfile(userId: string) {
        try {
            const userDoc = doc(db, 'users', userId);
            const docSnap = await getDoc(userDoc);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error("Error getting user profile: ", error);
            return null;
        }
    },

    async checkUsernameAvailability(username: string, currentUserId: string) {
        try {
            const q = query(usersRef, where('username', '==', username.toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) return true;

            // If it's the same user, it's available for them
            const isSelf = querySnapshot.docs.some(doc => doc.id === currentUserId);
            return isSelf;
        } catch (error) {
            console.error("Error checking username availability: ", error);
            return false;
        }
    },

    async getUserByUsername(username: string) {
        try {
            const q = query(usersRef, where('username', '==', username.toLowerCase()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
            }
            return null;
        } catch (error) {
            console.error("Error getting user by username: ", error);
            return null;
        }
    },

    // Events
    async createEvent(eventData: Omit<Event, 'id'>) {
        try {
            const docRef = await addDoc(eventsRef, {
                ...eventData,
                createdAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating event: ", error);
            throw error;
        }
    },

    async getActiveEvents() {
        try {
            // First attempt with order (requires index)
            try {
                const q = query(eventsRef, where('status', '==', 'active'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().date?.toDate ? doc.data().date.toDate() : doc.data().date
                } as Event));
            } catch (indexError: any) {
                console.warn("Index not found or sorting error, falling back to unordered fetch:", indexError.message);
                // Fallback: fetch without order and sort in client
                const q = query(eventsRef, where('status', '==', 'active'));
                const querySnapshot = await getDocs(q);
                const events = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().date?.toDate ? doc.data().date.toDate() : doc.data().date
                } as Event));
                // Sort by date or createdAt manually if needed
                return events.sort((a, b) => (b.date?.getTime?.() || 0) - (a.date?.getTime?.() || 0));
            }
        } catch (error) {
            console.error("Error getting active events: ", error);
            return [];
        }
    },

    async getEvents(userId: string) {
        try {
            if (!userId) return [];

            try {
                const q = query(eventsRef, where('organizerId', '==', userId), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().date?.toDate ? doc.data().date.toDate() : doc.data().date
                } as Event));
            } catch (indexError: any) {
                console.warn("Index not found or sorting error for user events, falling back:", indexError.message);
                const q = query(eventsRef, where('organizerId', '==', userId));
                const querySnapshot = await getDocs(q);
                const events = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().date?.toDate ? doc.data().date.toDate() : doc.data().date
                } as Event));
                return events.sort((a, b) => (b.date?.getTime?.() || 0) - (a.date?.getTime?.() || 0));
            }
        } catch (error) {
            console.error("Error getting events: ", error);
            return [];
        }
    },

    async getEventById(eventId: string) {
        try {
            const docRef = doc(db, 'events', eventId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Event;
            }
            return null;
        } catch (error) {
            console.error("Error getting event: ", error);
            throw error;
        }
    },

    async getEventByCode(code: string) {
        try {
            const q = query(eventsRef, where('code', '==', code.toUpperCase()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() } as Event;
            }
            return null;
        } catch (error) {
            console.error("Error getting event by code: ", error);
            throw error;
        }
    },


    // Photos
    async addPhoto(photoData: Omit<Photo, 'id'>) {
        try {
            const docRef = await addDoc(photosRef, {
                ...photoData,
                timestamp: photoData.timestamp || serverTimestamp(),
            });

            // Update photo count in event atomically using increment
            const eventRef = doc(db, 'events', photoData.eventId);
            await updateDoc(eventRef, {
                photoCount: increment(1)
            });

            return docRef.id;
        } catch (error) {
            console.error("Error adding photo: ", error);
            throw error;
        }
    },

    async getPhotosByEvent(eventId: string) {
        try {
            try {
                const q = query(photosRef, where('eventId', '==', eventId), orderBy('timestamp', 'desc'));
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo));
            } catch (indexError: any) {
                console.warn("Index not found for photos, falling back:", indexError.message);
                const q = query(photosRef, where('eventId', '==', eventId));
                const querySnapshot = await getDocs(q);
                const photos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo));
                return photos.sort((a, b) => {
                    const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp);
                    const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp);
                    return (timeB || 0) - (timeA || 0);
                });
            }
        } catch (error) {
            console.error("Error getting photos: ", error);
            return [];
        }
    },

    async getPhotosByUser(userId: string, limitCount = 20) {
        try {
            if (!userId) return [];

            try {
                const q = query(photosRef, where('userId', '==', userId), orderBy('timestamp', 'desc'));
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo));
            } catch (indexError: any) {
                // Usamos console.warn en lugar de console.error para evitar la pantalla roja en desarrollo
                console.warn("Firebase: Falta índice para fotos de usuario, usando ordenamiento local:", indexError.message);

                const q = query(photosRef, where('userId', '==', userId));
                const querySnapshot = await getDocs(q);
                const photos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo));

                // Ordenar en el cliente mientras se crea el índice
                return photos.sort((a, b) => {
                    const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp);
                    const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp);
                    return (timeB || 0) - (timeA || 0);
                });
            }
        } catch (error) {
            console.error("Error crítico al obtener fotos del usuario: ", error);
            return [];
        }
    },

    async deletePhoto(photoId: string, eventId: string, skipCountUpdate = false) {
        try {
            // 0. Delete from Storage
            const photoSnap = await getDoc(doc(db, 'photos', photoId));
            if (photoSnap.exists()) {
                const photoData = photoSnap.data();
                const pathToDelete = photoData.storagePath || photoData.url;

                if (pathToDelete && (photoData.storagePath || pathToDelete.includes('firebasestorage'))) {
                    try {
                        const { storageService } = await import('./storage');
                        await storageService.deleteFile(pathToDelete);
                        console.log("Deleted file from storage:", pathToDelete);
                    } catch (e) {
                        console.warn("Could not delete from storage:", e);
                    }
                }
            }

            // 1. Delete the photo document
            await deleteDoc(doc(db, 'photos', photoId));

            // 2. Decrement photo count in event (unless skipping)
            if (!skipCountUpdate) {
                const eventRef = doc(db, 'events', eventId);
                const eventSnap = await getDoc(eventRef);
                if (eventSnap.exists()) {
                    const currentCount = eventSnap.data().photoCount || 0;
                    await setDoc(eventRef, { photoCount: Math.max(0, currentCount - 1) }, { merge: true });
                }
            }
            return true;
        } catch (error) {
            console.error("Error deleting photo: ", error);
            throw error;
        }
    },

    async incrementEventViews(eventId: string) {
        try {
            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, {
                views: increment(1)
            });
        } catch (error) {
            console.error("Error incrementing views:", error);
        }
    },

    async updateEventStatus(eventId: string, status: 'active' | 'expired') {
        try {
            const eventRef = doc(db, 'events', eventId);
            await setDoc(eventRef, { status }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error updating event status: ", error);
            throw error;
        }
    },

    async updateEventDate(eventId: string, date: Date) {
        try {
            const eventRef = doc(db, 'events', eventId);
            await setDoc(eventRef, { date }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error updating event date: ", error);
            throw error;
        }
    },

    async toggleEventArchive(eventId: string, isArchived: boolean) {
        try {
            const eventRef = doc(db, 'events', eventId);
            await setDoc(eventRef, { isArchived }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error toggling event archive: ", error);
            throw error;
        }
    },

    async toggleEventFavorite(eventId: string, isFavorite: boolean) {
        try {
            const eventRef = doc(db, 'events', eventId);
            await setDoc(eventRef, { isFavorite }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error toggling event favorite: ", error);
            throw error;
        }
    },

    async togglePhotoLike(photoId: string, isLiked: boolean) {
        try {
            const photoRef = doc(db, 'photos', photoId);
            await setDoc(photoRef, { isLiked }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error toggling photo like: ", error);
            throw error;
        }
    },

    async updateEventPin(eventId: string, pin: string | null) {
        try {
            const eventRef = doc(db, 'events', eventId);
            await setDoc(eventRef, { pin: pin || "" }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error updating event PIN: ", error);
            throw error;
        }
    },

    async deleteEvent(eventId: string) {
        try {
            const eventSnap = await getDoc(doc(db, 'events', eventId));
            if (eventSnap.exists()) {
                const eventData = eventSnap.data();
                // 0. Delete cover image from storage
                const coverToDelete = eventData.coverStoragePath || eventData.coverImage;
                if (coverToDelete && (eventData.coverStoragePath || coverToDelete.includes('firebasestorage'))) {
                    try {
                        const { storageService } = await import('./storage');
                        await storageService.deleteFile(coverToDelete);
                    } catch (e) { }
                }
            }

            // 1. Delete all photos associated with the event (skipping count update for better perf)
            const photos = await databaseService.getPhotosByEvent(eventId);
            const deletePromises = photos.map(photo =>
                photo.id ? databaseService.deletePhoto(photo.id, eventId, true) : Promise.resolve()
            );
            await Promise.all(deletePromises);

            // 2. Delete the event document itself
            await deleteDoc(doc(db, 'events', eventId));

            console.log(`Event ${eventId} and its photos deleted successfully.`);
            return true;
        } catch (error) {
            console.error("Error deleting event: ", error);
            throw error;
        }
    },

    // Initialize database with a Welcome event to ensure collections exist
    async ensureInitialized(userId: string, userName: string) {
        try {
            const events = await databaseService.getActiveEvents();
            if (events.length === 0) {
                console.log("Creating Welcome event to initialize collections...");
                // Create the Events collection by adding a document
                const eventId = await databaseService.createEvent({
                    name: "Bienvenida a InstaRoll 📸",
                    organizer: "Equipo InstaRoll",
                    organizerId: "system",
                    date: new Date(),
                    photoCount: 1,
                    maxPhotos: 100,
                    status: 'active',
                    description: "Este es un evento de ejemplo para que veas cómo funciona la app. ¡Crea el tuyo propio!",
                    code: "WELCOME",
                    template: 'fiesta'
                });

                // Create the Photos collection by adding a document
                await databaseService.addPhoto({
                    url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
                    eventId: eventId,
                    userId: "system",
                    userName: "System",
                    timestamp: new Date()
                });

                console.log("Database initialized with Welcome event.");
            }
        } catch (error) {
            console.error("Error initializing database: ", error);
        }
    },

    async deleteUserData(userId: string) {
        try {
            console.log(`[databaseService] Iniciando borrado completo para el usuario: ${userId}`);

            // 1. Borrar fotos del usuario (donde es el autor)
            const photosQuery = query(photosRef, where('userId', '==', userId));
            const photosSnapshot = await getDocs(photosQuery);
            console.log(`[databaseService] Encontradas ${photosSnapshot.docs.length} fotos para borrar.`);

            for (const photoDoc of photosSnapshot.docs) {
                console.log(`[databaseService] Borrando foto: ${photoDoc.id}`);
                await databaseService.deletePhoto(photoDoc.id, photoDoc.data().eventId);
            }

            // 2. Borrar eventos del usuario (esto borrará también las fotos de esos eventos)
            const eventsQuery = query(eventsRef, where('organizerId', '==', userId));
            const eventsSnapshot = await getDocs(eventsQuery);
            console.log(`[databaseService] Encontrados ${eventsSnapshot.docs.length} eventos para borrar.`);

            for (const eventDoc of eventsSnapshot.docs) {
                console.log(`[databaseService] Borrando evento: ${eventDoc.id}`);
                await databaseService.deleteEvent(eventDoc.id);
            }

            // 3. Borrar el perfil del usuario (incluyendo la foto de perfil en Storage)
            console.log(`[databaseService] Borrando documento de perfil para: ${userId}`);
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.photoURL && userData.photoURL.includes('firebasestorage')) {
                    try {
                        const { storageService } = await import('./storage');
                        await storageService.deleteFile(userData.photoURL);
                        console.log(`[databaseService] Foto de perfil borrada de Storage`);
                    } catch (e) {
                        console.warn("[databaseService] No se pudo borrar la foto de perfil de Storage:", e);
                    }
                }
            }

            await deleteDoc(userRef);

            // 4. Borrar notificaciones del usuario
            const notifQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
            const notifSnapshot = await getDocs(notifQuery);
            for (const notifDoc of notifSnapshot.docs) {
                await deleteDoc(notifDoc.ref);
            }

            console.log(`[databaseService] Limpieza de Firestore completada con éxito para ${userId}`);
            return true;
        } catch (error) {
            console.error("[databaseService] Error crítico en deleteUserData:", error);
            throw error;
        }
    },

    async getEventParticipants(rootId: string) {
        try {
            // 1. Get all events with this rootId
            const q = query(eventsRef, where('rootId', '==', rootId));
            const querySnapshot = await getDocs(q);

            // 2. Extract unique organizerIds
            const organizerIds = Array.from(new Set(querySnapshot.docs.map(doc => doc.data().organizerId)));

            // 3. Fetch user profiles for these organizers
            const participants = await Promise.all(organizerIds.map(async (uid) => {
                const profile = await databaseService.getUserProfile(uid);
                return {
                    uid,
                    displayName: profile?.displayName || 'Usuario',
                    photoURL: profile?.photoURL || null
                };
            }));

            return participants;
        } catch (error) {
            console.error("Error getting event participants: ", error);
            return [];
        }
    },

    async getSharedStats(userId: string) {
        try {
            // 1. Get all events ORGANIZED by this user
            const qEvents = query(eventsRef, where('organizerId', '==', userId));
            const userEventsSnapshot = await getDocs(qEvents);
            const userEventIds = userEventsSnapshot.docs.map(doc => doc.id);

            if (userEventIds.length === 0) return { clonedCount: 0, uniqueUsers: 0 };

            // 2. Find all events that have these ids as rootId
            // Firestore 'in' query limit is 10. If user has > 10 events, we need to batch or search differently.
            // Better: get all events where rootId is NOT null and then filter in memory if needed, 
            // but that's expensive for all events.
            // Alternative: For each event, count clones.

            let totalClones = 0;
            const uniqueCloners = new Set<string>();

            // Process in batches of 10 for Firestore 'in' operator
            for (let i = 0; i < userEventIds.length; i += 10) {
                const batch = userEventIds.slice(i, i + 10);
                const qClones = query(eventsRef, where('rootId', 'in', batch));
                const clonesSnapshot = await getDocs(qClones);

                clonesSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    // Don't count the original event as a clone
                    if (!batch.includes(doc.id) && data.organizerId !== userId) {
                        totalClones++;
                        uniqueCloners.add(data.organizerId);
                    }
                });
            }

            return {
                clonedCount: totalClones,
                uniqueUsers: uniqueCloners.size
            };
        } catch (error) {
            console.error("Error getting shared stats: ", error);
            return { clonedCount: 0, uniqueUsers: 0 };
        }
    },

    // Notifications
    async addNotification(data: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) {
        try {
            if (!data.userId || data.userId === 'anonymous') return;

            await addDoc(notificationsRef, {
                ...data,
                timestamp: serverTimestamp(),
                isRead: false
            });
        } catch (error) {
            console.error("Error adding notification:", error);
        }
    },

    async getNotifications(userId: string, limitCount = 20) {
        try {
            if (!userId) return [];

            try {
                const q = query(
                    notificationsRef,
                    where('userId', '==', userId),
                    orderBy('timestamp', 'desc')
                );
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp
                } as Notification));
            } catch (indexError: any) {
                console.warn("Firestore index error for notifications, falling back to manual sort:", indexError.message);
                const q = query(notificationsRef, where('userId', '==', userId));
                const querySnapshot = await getDocs(q);
                const notifs = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp
                } as Notification));
                return notifs.sort((a, b) => (b.timestamp?.getTime?.() || 0) - (a.timestamp?.getTime?.() || 0));
            }
        } catch (error) {
            console.error("Error getting notifications:", error);
            return [];
        }
    },

    async markNotificationAsRead(notificationId: string) {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                isRead: true
            });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    }
};
