import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export function useDataFetch(endpoint, context = null, intervalMs = null) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [trigger, setTrigger] = useState(0); // Add trigger for manual refetch
    const { requireAuth, markAuthenticated } = useAuth();

    const refetch = () => setTrigger(prev => prev + 1);

    useEffect(() => {
        let abortController = new AbortController();

        async function fetchData() {
            setIsLoading(true);
            setError(null);
            try {
                const result = await fetchWithAuth(endpoint, context, abortController.signal);
                setData(result);
                markAuthenticated();
            } catch (err) {
                if (err.requiresAuth) {
                    requireAuth();
                } else if (err.name !== 'AbortError') {
                    setError(err.message);
                }
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();

        let intervalId;
        if (intervalMs) {
            intervalId = setInterval(fetchData, intervalMs);
        }

        return () => {
            abortController.abort();
            if (intervalId) clearInterval(intervalId);
        };
    }, [endpoint, context, intervalMs, markAuthenticated, requireAuth, trigger]);

    return { data, isLoading, error, setData, refetch };
}
