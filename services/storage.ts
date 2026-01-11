import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase';

export const storageService = {
    /**
     * Uploads an image from a local URI to Firebase Storage.
     * @param uri Local path to the image (e.g. from ImagePicker)
     * @param path Path where the image should be stored in Firebase (e.g. 'events/eventID/photoID.jpg')
     * @returns Download URL of the uploaded image
     */
    async uploadImage(uri: string, path: string): Promise<string> {
        try {
            // 1. Convert URI to Blob
            const response = await fetch(uri);
            const blob = await response.blob();

            // 2. Create Reference
            const storageRef = ref(storage, path);

            // 3. Upload Blob
            await uploadBytes(storageRef, blob);

            // 4. Get Download URL
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading image: ", error);
            throw error;
        }
    },

    /**
     * Deletes a file from Firebase Storage.
     * @param path Full path of the file in storage (e.g. 'photos/eventID/photoID.jpg')
     */
    async deleteFile(path: string) {
        try {
            const { deleteObject } = await import('firebase/storage');
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
            return true;
        } catch (error) {
            console.warn("Error deleting file from storage (might not exist):", error);
            return false;
        }
    }
};
