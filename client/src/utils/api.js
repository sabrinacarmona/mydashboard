export const API_BASE = '/api';

export async function fetchWithAuth(endpoint, context, signal) {
    const url = new URL(`${API_BASE}/${endpoint}`, window.location.origin);
    if (context) {
        url.searchParams.append('context', context);
    }

    const response = await fetch(url.toString(), { signal });

    // Check if the response is JSON (if api fails badly, it might send HTML)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();

        if (data.requiresAuth) {
            throw { requiresAuth: true };
        }

        if (!response.ok || data.error) {
            throw new Error(data.error || 'API Request Failed');
        }

        return data;
    } else {
        const textError = await response.text();
        throw new Error(`Non-JSON response: ${response.status} ${response.statusText}`);
    }
}
