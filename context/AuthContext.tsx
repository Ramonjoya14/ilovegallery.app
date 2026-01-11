import { onAuthStateChanged, signInAnonymously, signOut, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    signInAnon: () => Promise<void>;
    updateProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
    deleteAccount: () => Promise<void>;
    reauthenticate: (password: string) => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshTick, setRefreshTick] = useState(0); // Used to force re-renders if needed

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (!user) {
                    setUser(null);
                    setLoading(true);

                    try {
                        await signInAnonymously(auth);
                    } catch (error: any) {
                        console.warn("Guest access failed:", error);
                        if (error.code === 'auth/admin-restricted-operation') {
                            console.error("Anonymous authentication is disabled in Firebase Console.");
                        }
                        setLoading(false);
                    }
                    return;
                }
                setUser(user);
                setLoading(false);
            } catch (err) {
                console.error("Auth observation error:", err);
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const logout = async () => {
        setLoading(true);
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
            setLoading(false);
        }
    };

    const signInAnon = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error: any) {
            console.error("Error signing in anonymously: ", error);
            if (error.code === 'auth/admin-restricted-operation') {
                throw new Error('ANONYMOUS_AUTH_DISABLED');
            }
            throw error;
        }
    };

    const updateProfile = async (data: { displayName?: string; photoURL?: string }) => {
        const { updateProfile: firebaseUpdateProfile } = await import('firebase/auth');
        if (auth.currentUser) {
            await firebaseUpdateProfile(auth.currentUser, data);
            // Re-assign the user object directly. To force re-render, we update the tick.
            setUser(auth.currentUser);
            setRefreshTick(prev => prev + 1);
        }
    };

    const deleteAccount = async () => {
        if (!auth.currentUser) return;
        const userId = auth.currentUser.uid;
        try {
            const { databaseService } = await import('../services/database');
            await databaseService.deleteUserData(userId);
            await auth.currentUser.delete();
            setUser(null);
        } catch (error: any) {
            console.error("Error deleting account: ", error);
            if (error.code === 'auth/requires-recent-login') {
                throw new Error('REAUTH_NEEDED');
            }
            throw error;
        }
    };

    const reauthenticate = async (password: string) => {
        if (!auth.currentUser || !auth.currentUser.email) return;
        const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
    };

    const sendPasswordReset = async (email: string) => {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email);
    };

    const sendVerificationEmail = async () => {
        const { sendEmailVerification } = await import('firebase/auth');
        if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
        }
    };

    const refreshUser = async () => {
        if (auth.currentUser) {
            try {
                await auth.currentUser.reload();
                setUser(auth.currentUser);
                setRefreshTick(prev => prev + 1);
            } catch (error) {
                console.error("Error refreshing user:", error);
            }
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            logout,
            signInAnon,
            updateProfile,
            deleteAccount,
            reauthenticate,
            sendPasswordReset,
            sendVerificationEmail,
            refreshUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
