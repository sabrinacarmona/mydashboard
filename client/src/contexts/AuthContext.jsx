import { createContext, useState, useContext, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authStatus, setAuthStatus] = useState('Checking...');

    const requireAuth = useCallback(() => {
        setIsAuthModalOpen(true);
        setAuthStatus('Authentication Required');
    }, []);

    const markAuthenticated = useCallback(() => {
        setIsAuthModalOpen(false);
        setAuthStatus('● Google Connected');
    }, []);

    const value = {
        isAuthModalOpen,
        setIsAuthModalOpen,
        authStatus,
        setAuthStatus,
        requireAuth,
        markAuthenticated,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
