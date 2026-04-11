import { format, setDate, isWeekend, subDays, addDays } from 'date-fns';

export interface SalaryDate {
  date: string;
  titleAr: string;
  titleEn: string;
}

export const getSalaryDates = (year: number, country: string): SalaryDate[] => {
  const dates: SalaryDate[] = [];
  const dayOfMonth = country === 'SA' ? 27 : 
                     country === 'AE' ? 28 :
                     country === 'KW' ? 25 :
                     country === 'QA' ? 26 :
                     country === 'BH' ? 25 : 25;

  for (let month = 0; month < 12; month++) {
    let date = new Date(year, month, dayOfMonth);
    
    // If weekend, adjust (usually earlier in GCC)
    if (isWeekend(date)) {
      if (date.getDay() === 5) date = subDays(date, 1); // Friday -> Thursday
      else if (date.getDay() === 6) date = subDays(date, 2); // Saturday -> Thursday
    }

    dates.push({
      date: format(date, 'yyyy-MM-dd'),
      titleAr: 'صرف الرواتب',
      titleEn: 'Salary Payment'
    });
  }
  return dates;
};
