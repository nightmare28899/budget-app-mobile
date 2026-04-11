import apiClient from './client';
import { AuthResponse, RegisterResponse } from '../types';
import { normalizeUserRecord } from '../utils/user';

export interface RegisterAvatarPayload {
    uri: string;
    name?: string;
    type?: string;
}

function inferMimeType(filename?: string): string {
    const lower = filename?.toLowerCase() || '';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic')) return 'image/heic';
    if (lower.endsWith('.heif')) return 'image/heif';
    return 'image/jpeg';
}

async function parseResponsePayload(response: Response) {
    const rawText = await response.text();
    const trimmed = rawText.trim();

    if (!trimmed) {
        return null;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        return trimmed;
    }
}

function normalizeAuthResponse<T extends AuthResponse | RegisterResponse>(data: T): T {
    return {
        ...data,
        user: normalizeUserRecord(data?.user),
    };
}

export const authApi = {
    register: async (
        email: string,
        name: string,
        password: string,
        avatar?: RegisterAvatarPayload,
        role: string = 'user',
        termsAccepted: boolean = true,
    ) => {
        if (!avatar?.uri) {
            const { data } = await apiClient.post<RegisterResponse>(
                '/auth/register',
                {
                    email,
                    name,
                    password,
                    role,
                    termsAccepted,
                },
            );

            return normalizeAuthResponse(data);
        }

        const formData = new FormData();
        formData.append('email', email);
        formData.append('name', name);
        formData.append('password', password);
        formData.append('role', role);
        formData.append('termsAccepted', String(termsAccepted));

        if (avatar?.uri) {
            const filename = avatar.name || avatar.uri.split('/').pop() || 'avatar.jpg';
            formData.append('avatar', {
                uri: avatar.uri,
                name: filename,
                type: avatar.type || inferMimeType(filename),
            } as any);
        }

        const response = await fetch(`${apiClient.defaults.baseURL}/auth/register`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
            },
            body: formData,
        });

        const payload = await parseResponsePayload(response);
        if (!response.ok) {
            const error: any = new Error(`Request failed with status ${response.status}`);
            error.response = {
                status: response.status,
                data: payload,
            };
            throw error;
        }

        return normalizeAuthResponse(payload as RegisterResponse);
    },

    login: async (email: string, password: string) => {
        const { data } = await apiClient.post<AuthResponse>('/auth/login', {
            email,
            password,
        });
        return normalizeAuthResponse(data);
    },

    loginWithGoogle: async (firebaseIdToken: string, termsAccepted: boolean = true) => {
        const { data } = await apiClient.post<AuthResponse>('/auth/google', {
            firebaseIdToken,
            termsAccepted,
        });
        return normalizeAuthResponse(data);
    },

    refresh: async (refreshToken: string) => {
        const { data } = await apiClient.post('/auth/refresh', { refreshToken });
        return data;
    },

    logout: async () => {
        const { data } = await apiClient.post('/auth/logout');
        return data;
    },
};
