// This file is deprecated - use localStorage.ts instead
export {};

/**
 * 한국 시간으로 변환하는 유틸리티 함수
 */
export const formatKoreanTime = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Failed to format Korean time:', error);
    return dateString.toString();
  }
};

/**
 * 한국 시간으로 상대적 시간 표시
 */
export const formatRelativeKoreanTime = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}초 전`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}분 전`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}시간 전`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}일 전`;
    }
  } catch (error) {
    console.error('Failed to format relative Korean time:', error);
    return formatKoreanTime(dateString);
  }
};

/**
 * 현재 한국 시간 가져오기
 */
export const getCurrentKoreanTime = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
};