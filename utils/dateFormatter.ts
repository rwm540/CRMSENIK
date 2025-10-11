import { ContractStatus, SupportContractStatus } from '../types';
import jalaali from 'jalaali-js';

// declare const jalaali: any;

export const toPersianDigits = (n: string | number): string => {
  if (n === undefined || n === null) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
};

export const convertPersianToEnglish = (s: string): string => {
  if (!s) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let result = s;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], "g"), englishDigits[i]);
  }
  return result;
};


export const formatSecondsToTime = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
        return "۰۰:۰۰:۰۰";
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};


export const formatJalaali = (date: Date): string => {
    const jalaaliDate = jalaali.toJalaali(date);
    return `${jalaaliDate.jy}/${String(jalaaliDate.jm).padStart(2, '0')}/${String(jalaaliDate.jd).padStart(2, '0')}`;
}

export const formatJalaaliDateTime = (date: Date): string => {
    const jalaaliDate = jalaali.toJalaali(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${jalaaliDate.jy}/${String(jalaaliDate.jm).padStart(2, '0')}/${String(jalaaliDate.jd).padStart(2, '0')} ${hours}:${minutes}`;
};

export const formatCurrency = (n: number): string => {
    if (n === undefined || n === null || isNaN(n)) return '';
    return toPersianDigits(n.toLocaleString('en-US'));
};

export const parseJalaali = (dateStr: string): Date | null => {
    if (!dateStr || !/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) return null;
    const [jy, jm, jd] = dateStr.split('/').map(Number);
    if (isNaN(jy) || isNaN(jm) || isNaN(jd)) return null;
    const greg = jalaali.toGregorian(jy, jm, jd);
    return new Date(greg.gy, greg.gm - 1, greg.gd);
};

export const parseJalaaliDateTime = (dateTimeStr: string): Date | null => {
    if (!dateTimeStr) return null;
    const parts = dateTimeStr.split(' ');
    if (parts.length !== 2) return null;
    
    const datePart = parts[0];
    const timePart = parts[1];

    const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    if (!dateRegex.test(datePart) || !timeRegex.test(timePart)) return null;

    const [jy, jm, jd] = datePart.split('/').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    if (isNaN(jy) || isNaN(jm) || isNaN(jd) || isNaN(hour) || isNaN(minute)) return null;

    const greg = jalaali.toGregorian(jy, jm, jd);
    // Create date in local timezone
    return new Date(greg.gy, greg.gm - 1, greg.gd, hour, minute);
};


export const getCalculatedStatus = (endDateStr: string, currentStatus: ContractStatus | SupportContractStatus): ContractStatus | SupportContractStatus => {
    // These statuses are manually set and should not be overridden by date calculation.
    if (currentStatus === 'لغو شده' || currentStatus === 'در انتظار تایید') {
        return currentStatus;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = parseJalaali(endDateStr);

    if (!endDate) {
        // If end date is not valid or not set, it cannot be expired. So it's active.
        return 'فعال'; 
    }
    
    // Set time to end of day for comparison
    endDate.setHours(23, 59, 59, 999);

    if (today > endDate) {
        return 'منقضی شده';
    }
    
    return 'فعال';
};

export const getPurchaseContractStatusByDate = (startDateStr: string, endDateStr: string): 'فعال' | 'منقضی شده' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = parseJalaali(startDateStr);
    const endDate = parseJalaali(endDateStr);

    if (!startDate || !endDate) {
        return 'فعال'; // Default if dates are invalid
    }
    
    // Set times for accurate comparison
    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);

    if (today >= startDate && today <= endDate) {
        return 'فعال';
    }

    return 'منقضی شده';
};


export const isToday = (someDate: Date): boolean => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
};

export const isDateInRange = (date: Date, startDate: Date | null, endDate: Date | null): boolean => {
    if (!startDate || !endDate) return false;
    
    const checkTime = new Date(date).setHours(0, 0, 0, 0);
    const startTime = new Date(startDate).setHours(0, 0, 0, 0);
    const endTime = new Date(endDate).setHours(0, 0, 0, 0);

    return checkTime >= startTime && checkTime <= endTime;
}

// Hash a string using SHA-256
export const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Generate a 6-digit numeric OTP
export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
