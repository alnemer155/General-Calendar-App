export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  date: string; // yyyy-MM-dd
  title: string;
  content: string;
  color?: string;
  isAllDay?: boolean;
  recurrence?: RecurrenceType;
  isPinned?: boolean;
}

export interface AcademicEvent {
  id: string;
  date: string; // yyyy-MM-dd
  titleAr: string;
  titleEn: string;
  type: 'start' | 'end' | 'holiday' | 'exam';
  hijriYear: string;
}

export interface AppSettings {
  cityId: string;
  calculationMethod: string;
  madhab: 'shafi' | 'hanafi';
  school: 'sunni' | 'shia';
  shiaSect?: 'jafari' | 'ismaili' | 'zaydi';
  salaryCountry: 'SA' | 'AE' | 'KW' | 'QA' | 'BH' | 'OM';
  calendarView?: 'compact' | 'stacked' | 'details';
  primaryDate?: 'hijri' | 'gregorian';
}

export interface GCCCity {
  id: string;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
  lat: number;
  lng: number;
  timezone: string;
}

export interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    isDay: boolean;
  };
  daily: {
    date: string;
    weatherCode: number;
    tempMax: number;
    tempMin: number;
  }[];
}
