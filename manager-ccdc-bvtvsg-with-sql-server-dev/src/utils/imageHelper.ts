// utils/imageHelper.ts
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';

  // Nếu đã là full URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Lấy base URL từ env
  const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
  const baseURL = apiURL.replace(/\/api$/, '');

  // Đảm bảo path bắt đầu bằng /
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

  return `${baseURL}${cleanPath}`;
};

export const getImageUrls = (images: string[] | null | undefined): string[] => {
  if (!images || !Array.isArray(images)) return [];
  return images.map(img => getImageUrl(img)).filter(Boolean);
};