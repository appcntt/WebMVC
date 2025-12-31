/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = import.meta.env.VITE_API_URL as string;

interface QueueItem {
    resolve: (token: string) => void;
    reject: (error: AxiosError) => void;
}

interface RefreshTokenResponse {
    success: boolean;
    data: {
        accessToken: string;
        refreshToken?: string;
    };
}

const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null): void => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// ✅ Hàm logout và redirect
const handleLogout = () => {
    console.log('Session expired - logging out...');
    localStorage.clear();
    // Kiểm tra xem đã ở trang login chưa để tránh loop
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
};

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // ✅ Kiểm tra lỗi 401 và chưa retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            // ✅ Bỏ qua refresh nếu đang ở endpoint refresh hoặc login
            if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
                return Promise.reject(error);
            }

            const refreshToken = localStorage.getItem('refreshToken');
            
            // ✅ Không có refresh token -> logout ngay
            if (!refreshToken) {
                console.log('No refresh token found');
                handleLogout();
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            // ✅ Nếu đang refresh, đưa request vào queue
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token: string) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return api(originalRequest);
                    })
                    .catch((err: AxiosError) => {
                        return Promise.reject(err);
                    });
            }

            isRefreshing = true;

            try {
                console.log('🔄 Attempting to refresh token...');

                const response = await axios.post<RefreshTokenResponse>(
                    `${API_URL}/auth/refresh`,
                    { refreshToken },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    }
                );

                if (!response.data.success) {
                    throw new Error('Refresh token failed');
                }

                const { accessToken, refreshToken: newRefreshToken } = response.data.data;

                console.log('✅ Token refreshed successfully');

                localStorage.setItem('accessToken', accessToken);
                if (newRefreshToken) {
                    localStorage.setItem('refreshToken', newRefreshToken);
                }

                // ✅ Process queue với token mới
                processQueue(null, accessToken);

                // ✅ Retry request ban đầu với token mới
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }
                
                return api(originalRequest);

            } catch (refreshError: any) {
                console.error('❌ Refresh token error:', refreshError.response?.data || refreshError.message);
                
                // ✅ Xử lý queue và logout
                processQueue(refreshError as AxiosError, null);
                handleLogout();
                
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // ✅ Lỗi 403 - Token hết hạn hoàn toàn
        if (error.response?.status === 403) {
            console.log('❌ Token expired or invalid');
            handleLogout();
            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

export default api;