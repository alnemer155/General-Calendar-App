import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment-hijri';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths, parseISO, startOfYear, differenceInYears, differenceInMonths, differenceInDays } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { Coordinates, CalculationMethod, PrayerTimes, SunnahTimes, Madhab } from 'adhan';
import { useLocalStorage } from './hooks/use-local-storage';
import { ChevronRight, ChevronLeft, Settings, Calendar as CalendarIcon, Globe, CalendarDays, Plus, X, GraduationCap, Clock, MapPin, Compass, Printer, FileDown, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { academicEvents } from './data/academic';
import { CalendarEvent, AppSettings } from './types';
import { GCC_CITIES } from './constants/cities';
import { getSalaryDates } from './data/salaries';
import { Banknote, ListTodo } from 'lucide-react';
import { PRIVACY_POLICY, TERMS_OF_USE, DEVELOPER_RIGHTS, LEGAL_FOOTER } from './constants/legal';

export default function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [hijriOffset, setHijriOffset] = useLocalStorage('hijri-offset', 0);
  const [lang, setLang] = useLocalStorage<'ar' | 'en'>('app-lang', 'ar');
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>('calendar-events', []);
  const [appSettings, setAppSettings] = useLocalStorage<AppSettings>('app-settings', {
    cityId: 'riyadh',
    calculationMethod: 'UmmAlQura',
    salaryCountry: 'SA',
    calendarView: 'compact',
    primaryDate: 'hijri'
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAcademic, setShowAcademic] = useState(false);
  const [showSalaries, setShowSalaries] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('1447');
  const [printDuration, setPrintDuration] = useState<'6months' | '1year'>('6months');
  const [printDesign, setPrintDesign] = useState<'original' | 'custom' | 'general' | 'modern'>('modern');
  const [printDateType, setPrintDateType] = useState<'both' | 'hijri' | 'gregorian'>('both');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'A3' | 'Letter' | 'Legal'>('A4');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventContent, setNewEventContent] = useState('');
  const [newEventDate, setNewEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEventColor, setNewEventColor] = useState('#6366f1'); // indigo-500
  const [newEventIsAllDay, setNewEventIsAllDay] = useState(true);
  const [newEventRecurrence, setNewEventRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [isSharedPdf, setIsSharedPdf] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Error Page Component
  const ErrorPage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-zinc-100 p-6 text-center">
      <div className="text-red-500 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-4">{isAr ? 'خطأ' : 'Error'}</h1>
      <p className="text-zinc-400">{message}</p>
      <button 
        onClick={() => window.location.href = '/'}
        className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all"
      >
        {isAr ? 'العودة للرئيسية' : 'Return to Home'}
      </button>
    </div>
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('pdfId')) {
      const createdAt = params.get('createdAt');
      if (createdAt) {
        const created = parseInt(createdAt, 10);
        const now = Date.now();
        if (now - created > 60000) { // 1 minute
          setIsExpired(true);
        } else {
          setIsSharedPdf(true);
        }
      } else {
        // If no createdAt, assume it's an old link or invalid, treat as expired/invalid
        setIsExpired(true);
      }
    }
  }, []);

  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = useMemo(() => {
    return new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(currentTime);
  }, [currentTime, isAr]);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.documentElement.classList.add('dark');
  }, [dir, lang]);

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      isAr ? handlePrevDay() : handleNextDay();
    } else if (isRightSwipe) {
      isAr ? handleNextDay() : handlePrevDay();
    }
  };

  const hijriDateStr = useMemo(() => {
    const adjustedDate = addDays(selectedDate, hijriOffset);
    const formatter = new Intl.DateTimeFormat(isAr ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatter.format(adjustedDate);
  }, [selectedDate, hijriOffset, isAr]);

  const gregorianDateStr = useMemo(() => {
    return format(selectedDate, 'd MMMM yyyy', { locale: isAr ? arSA : enUS });
  }, [selectedDate, isAr]);

  const dayNameStr = useMemo(() => {
    return format(selectedDate, 'EEEE', { locale: isAr ? arSA : enUS });
  }, [selectedDate, isAr]);

  // Calendar Grid Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 0 }) }).map(day => 
      format(day, 'EEEEEE', { locale: isAr ? arSA : enUS })
    );
  }, [isAr]);

  const getHijriDay = (date: Date) => {
    const adjustedDate = addDays(date, hijriOffset);
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric'
    });
    return formatter.format(adjustedDate);
  };

  const colors = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Violet', value: '#8b5cf6' },
  ];

  // Events Logic
  
  const [convMode, setConvMode] = useState<'g2h' | 'h2g'>('g2h');
  const [convGregDate, setConvGregDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [convHijriD, setConvHijriD] = useState<number>(Number(new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric' }).format(new Date())));
  const [convHijriM, setConvHijriM] = useState<number>(Number(new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { month: 'numeric' }).format(new Date())));
  const [convHijriY, setConvHijriY] = useState<number>(Number(new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { year: 'numeric' }).format(new Date()).split(' ')[0]));
  
  const convertedDateStr = useMemo(() => {
    if (convMode === 'g2h' && convGregDate) {
      const d = new Date(convGregDate);
      if (!isNaN(d.getTime())) {
        const formatter = new Intl.DateTimeFormat(isAr ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
        return formatter.format(d);
      }
    } else if (convMode === 'h2g') {
      const m = moment(`${convHijriY}/${convHijriM}/${convHijriD}`, 'iYYYY/iM/iD');
      if (m.isValid()) {
        return format(m.toDate(), 'd MMMM yyyy', { locale: isAr ? arSA : enUS });
      }
    }
    return null;
  }, [convMode, convGregDate, convHijriD, convHijriM, convHijriY, isAr]);
  
  const prayerTimes = useMemo(() => {
    const city = GCC_CITIES.find(c => c.id === appSettings.cityId) || GCC_CITIES[0];
    const coords = new Coordinates(city.lat, city.lng);
    const date = selectedDate;
    
    let params;
    switch (appSettings.calculationMethod) {
      case 'UmmAlQura': params = CalculationMethod.UmmAlQura(); break;
      case 'Dubai': params = CalculationMethod.Dubai(); break;
      case 'Kuwait': params = CalculationMethod.Kuwait(); break;
      case 'Qatar': params = CalculationMethod.Qatar(); break;
      case 'MuslimWorldLeague': params = CalculationMethod.MuslimWorldLeague(); break;
      case 'Jafari': 
        params = CalculationMethod.Tehran();
        params.fajrAngle = 16.0;
        params.maghribAngle = 4.0;
        params.ishaAngle = 14.0;
        break;
      default: params = CalculationMethod.UmmAlQura();
    }
    
    params.madhab = Madhab.Shafi;
    
    const pt = new PrayerTimes(coords, date, params);
    return pt;
  }, [selectedDate, appSettings]);

  const prayerList = useMemo(() => {
    if (!prayerTimes) return [];
    const formatTime = (time: Date) => {
      return new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(time);
    };

    return [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: formatTime(prayerTimes.fajr) },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: formatTime(prayerTimes.sunrise) },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: formatTime(prayerTimes.dhuhr) },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: formatTime(prayerTimes.asr) },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: formatTime(prayerTimes.maghrib) },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: formatTime(prayerTimes.isha) },
    ];
  }, [prayerTimes, isAr]);

  const salaryDates = useMemo(() => {
    return getSalaryDates(selectedDate.getFullYear(), appSettings.salaryCountry);
  }, [selectedDate, appSettings.salaryCountry]);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    
    if (editingEventId) {
      setEvents(events.map(event => 
        event.id === editingEventId 
          ? { 
              ...event, 
              title: newEventTitle.trim(), 
              content: newEventContent.trim(), 
              date: newEventDate, 
              color: newEventColor, 
              isAllDay: newEventIsAllDay, 
              recurrence: newEventRecurrence 
            } 
          : event
      ));
      setEditingEventId(null);
    } else {
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        date: newEventDate,
        title: newEventTitle.trim(),
        content: newEventContent.trim(),
        color: newEventColor,
        isAllDay: newEventIsAllDay,
        recurrence: newEventRecurrence,
        isPinned: false
      };
      setEvents([...events, newEvent]);
    }
    
    setNewEventTitle('');
    setNewEventContent('');
    setNewEventColor('#6366f1');
    setNewEventIsAllDay(true);
    setNewEventRecurrence('none');
    setShowEventModal(false);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setNewEventTitle(event.title);
    setNewEventContent(event.content);
    setNewEventDate(event.date);
    setNewEventColor(event.color || '#6366f1');
    setNewEventIsAllDay(event.isAllDay || false);
    setNewEventRecurrence(event.recurrence || 'none');
    setShowEventModal(true);
  };

  const handlePinEvent = (id: string) => {
    setEvents(events.map(event => 
      event.id === id ? { ...event, isPinned: !event.isPinned } : event
    ));
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const path = window.location.pathname;
  
  if (path === '/privacy' || path === '/terms' || path === '/rights') {
    let title = '';
    let content = '';
    if (path === '/privacy') {
      title = isAr ? 'سياسة الخصوصية' : 'Privacy Policy';
      content = PRIVACY_POLICY;
    } else if (path === '/terms') {
      title = isAr ? 'شروط الاستخدام' : 'Terms of Use';
      content = TERMS_OF_USE;
    } else if (path === '/rights') {
      title = isAr ? 'حقوق المطور' : 'Developer Rights';
      content = DEVELOPER_RIGHTS;
    }

    return (
      <div className="min-h-screen bg-white text-black p-6 sm:p-12" dir={dir}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">{title}</h1>
          <div 
            className="whitespace-pre-wrap font-sans leading-relaxed text-gray-800"
            style={{ unicodeBidi: 'plaintext' }}
          >
            {content}
          </div>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return <ErrorPage message={isAr ? 'انتهت صلاحية الرابط، يرجى طلب رابط جديد.' : 'Link expired, please request a new one.'} />;
  }

  return (
    <div className={cn(
      "min-h-screen w-full flex flex-col bg-[#050505] text-zinc-100 transition-colors duration-300 relative selection:bg-indigo-500/30 selection:text-indigo-200",
      printDesign === 'original' ? "print:bg-black print:text-zinc-100" : "print:bg-white print:text-black"
    )}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none print:hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-screen opacity-50" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full mix-blend-screen opacity-50" />
      </div>

      <div className="flex-1 flex flex-col print:hidden relative z-10">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 py-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Logo & Title */}
          <button 
            onClick={() => {
              setSelectedDate(new Date());
              setCurrentMonth(startOfMonth(new Date()));
            }}
            className="flex items-center gap-2 sm:gap-3 bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800/80 px-3 sm:px-4 py-2.5 rounded-[1.25rem] shadow-2xl hover:bg-zinc-800/60 transition-all cursor-pointer group"
            title={isAr ? 'العودة لليوم' : 'Return to Today'}
          >
            <div className="p-1.5 bg-indigo-500/10 rounded-[0.85rem] text-indigo-400 group-hover:scale-110 transition-transform">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h1 className="text-base sm:text-xl font-medium tracking-tight text-zinc-100 hidden md:block px-1">
              {isAr ? 'التقويم العام' : 'General Calendar'}
            </h1>
          </button>

          {/* Live Clock - Floating Center */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2.5 bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800/80 px-5 py-2.5 rounded-[1.25rem] shadow-2xl hover:bg-zinc-900/80 transition-colors">
            <Clock className="w-[18px] h-[18px] text-indigo-400" />
            <span className="text-sm font-medium tracking-[0.2em] text-zinc-100 font-mono mt-0.5">
              {timeStr}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800/80 p-1.5 rounded-[1.25rem] shadow-2xl">
            <button 
              onClick={() => {
                setShowAcademic(!showAcademic);
                setShowSalaries(false);
                setShowAllEvents(false);
              }}
              className={cn(
                "p-2 rounded-[0.85rem] transition-all duration-300 group relative",
                showAcademic ? "bg-indigo-500/20 text-indigo-300 shadow-sm" : "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              )}
              title={isAr ? 'التقويم الدراسي والمناسبات' : 'Academic & National Calendar'}
            >
              <CalendarIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <div className={cn("absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300", showAcademic ? "bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "bg-indigo-500/0 ")} />
            </button>

            <button 
              onClick={() => {
                setShowSalaries(!showSalaries);
                setShowAcademic(false);
                setShowAllEvents(false);
              }}
              className={cn(
                "p-2 rounded-[0.85rem] transition-all duration-300 group relative",
                showSalaries ? "bg-emerald-500/20 text-emerald-300 shadow-sm" : "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              )}
              title={isAr ? 'الرواتب' : 'Salaries'}
            >
              <Banknote className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <div className={cn("absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300", showSalaries ? "bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-emerald-500/0 ")} />
            </button>

            <button 
              onClick={() => {
                setShowAllEvents(!showAllEvents);
                setShowAcademic(false);
                setShowSalaries(false);
              }}
              className={cn(
                "p-2 rounded-[0.85rem] transition-all duration-300 group relative",
                showAllEvents ? "bg-amber-500/20 text-amber-300 shadow-sm" : "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              )}
              title={isAr ? 'الأحداث' : 'Events'}
            >
              <ListTodo className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <div className={cn("absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300", showAllEvents ? "bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "bg-amber-500/0 ")} />
            </button>
            
            <div className="w-[1px] h-5 bg-zinc-800/80 mx-0.5" />

            <button 
              onClick={() => {
                setNewEventDate(format(selectedDate, 'yyyy-MM-dd'));
                setShowEventModal(true);
              }}
              className="p-2 rounded-[0.85rem] hover:bg-zinc-800/60 text-zinc-400 hover:text-indigo-300 transition-all duration-300 group relative"
              title={isAr ? 'إضافة حدث' : 'Add Event'}
            >
              <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            <div className="w-[1px] h-5 bg-zinc-800/80 mx-0.5" />

            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-[0.85rem] transition-all duration-300 group relative",
                showSettings ? "bg-zinc-800/80 text-zinc-100 shadow-sm" : "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              )}
              title={isAr ? 'الإعدادات' : 'Settings'}
            >
              <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: Main Date, Events & Settings */}
          <div className="xl:col-span-5 flex flex-col gap-6">
            
            {/* Main Date Card */}
            <motion.div 
              className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/60 p-8 lg:p-10 flex flex-col items-center justify-center shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEndHandler}
            >
              {/* Decorative Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[200px] h-[100px] bg-indigo-500/20 blur-[80px] pointer-events-none" />

              <div className="text-center space-y-5 z-10 w-full">
                <div className="text-[13px] font-medium tracking-widest text-indigo-400/80 uppercase mb-2">
                  {dayNameStr}
                </div>
                
                <div className="text-3xl sm:text-4xl font-light tracking-tight text-white mb-2">
                  {appSettings.primaryDate === 'gregorian' ? gregorianDateStr : hijriDateStr}
                </div>
                
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-[1px] bg-zinc-800/80 rounded-full" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500/50" />
                  <div className="w-12 h-[1px] bg-zinc-800/80 rounded-full" />
                </div>
                
                <div className="text-sm font-light text-zinc-400 mt-2">
                  {appSettings.primaryDate === 'gregorian' ? hijriDateStr : gregorianDateStr}
                </div>
              </div>

              {/* Navigation Arrows */}
              <button 
                onClick={isAr ? handleNextDay : handlePrevDay} 
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 p-3 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-full transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={isAr ? handlePrevDay : handleNextDay} 
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-3 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-full transition-all active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>

            {/* Prayer Times Section */}
            <div className="relative overflow-hidden rounded-[2rem] bg-[#09090b] border border-zinc-800/60 p-6 lg:p-8 flex flex-col gap-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m17 12-5-5-5 5"/><path d="m17 22-5-5-5 5"/></svg>
                  </div>
                  <h3 className="text-lg font-medium tracking-wide text-zinc-100">
                    {isAr ? 'أوقات الصلاة' : 'Prayer Times'}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3">
                {prayerList.map((prayer) => (
                  <div 
                    key={prayer.id} 
                    className="p-3 sm:p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-zinc-800/60 hover:border-zinc-700/80 group"
                  >
                    <span className={cn("text-[11px] sm:text-xs text-zinc-500 font-medium uppercase group-hover:text-zinc-400 transition-colors", !isAr && "tracking-wider")}>
                      {isAr ? prayer.nameAr : prayer.nameEn}
                    </span>
                    <span className="text-sm sm:text-base font-light text-zinc-100 font-secondary tracking-wide">
                      {prayer.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Converter Card */}
            <div className="relative overflow-hidden rounded-[2rem] bg-[#09090b] border border-zinc-800/60 p-6 lg:p-8 flex flex-col gap-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="m15 4 3 3-3 3"/></svg>
                  </div>
                  <h3 className="text-lg font-medium tracking-wide text-zinc-100">
                    {isAr ? 'تحويل التاريخ' : 'Date Converter'}
                  </h3>
                </div>

                <div className="flex bg-zinc-900/80 border border-zinc-800/80 rounded-xl overflow-hidden p-1 backdrop-blur-sm">
                  <button
                    onClick={() => setConvMode('g2h')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                      convMode === 'g2h' ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {isAr ? 'للهجري' : 'To Hijri'}
                  </button>
                  <button
                    onClick={() => setConvMode('h2g')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                      convMode === 'h2g' ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {isAr ? 'للميلادي' : 'To Gregorian'}
                  </button>
                </div>
              </div>

              {convMode === 'g2h' ? (
                <div className="flex gap-3 items-center">
                  <input 
                    type="date" 
                    value={convGregDate} 
                    onChange={(e) => setConvGregDate(e.target.value)}
                    className="flex-1 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl px-4 text-zinc-200 focus:border-indigo-500/50 outline-none transition-all cursor-pointer h-[48px] text-sm"
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={convHijriD || ''}
                    onChange={(e) => setConvHijriD(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                    placeholder={isAr ? 'يوم' : 'DD'}
                    className="flex-1 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl px-2 text-center text-zinc-200 focus:border-indigo-500/50 outline-none transition-all cursor-pointer h-[48px] text-sm"
                  />
                  <input 
                    type="number" 
                    value={convHijriM || ''}
                    onChange={(e) => setConvHijriM(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                    placeholder={isAr ? 'شهر' : 'MM'}
                    className="flex-1 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl px-2 text-center text-zinc-200 focus:border-indigo-500/50 outline-none transition-all cursor-pointer h-[48px] text-sm"
                  />
                  <input 
                    type="number" 
                    value={convHijriY || ''}
                    onChange={(e) => setConvHijriY(Math.min(9999, Math.max(1, parseInt(e.target.value) || 1)))}
                    placeholder={isAr ? 'سنة' : 'YYYY'}
                    className="w-20 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl px-2 text-center text-zinc-200 focus:border-indigo-500/50 outline-none transition-all cursor-pointer h-[48px] text-sm"
                  />
                </div>
              )}

              <div className="bg-gradient-to-r from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-2xl p-5 text-center flex flex-col justify-center items-center min-h-[72px] mt-1 relative overflow-hidden group">
                {/* Subtle highlight */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                {convertedDateStr ? (
                  <div className="text-xl sm:text-2xl font-light text-zinc-100 tracking-tight font-secondary z-10">{convertedDateStr}</div>
                ) : (
                  <div className="text-sm text-zinc-500 font-light z-10">{isAr ? 'أدخل تاريخاً صحيحاً' : 'Enter a valid date'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Calendar Grid & Academic Timeline */}
          <div className="xl:col-span-7 flex flex-col gap-6">
            <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-[#09090b] border border-zinc-800/60 p-5 sm:p-7 lg:p-10 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between mb-8 sm:mb-10">
                <h2 className="text-xl sm:text-3xl font-light tracking-tight font-secondary text-zinc-100">
                  {format(currentMonth, 'MMMM yyyy', { locale: isAr ? arSA : enUS })}
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-3 sm:p-3.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/80 transition-all text-zinc-400 hover:text-zinc-100 hover:scale-105 active:scale-95"
                  >
                    {isAr ? <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" /> : <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-3 sm:p-3.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/80 transition-all text-zinc-400 hover:text-zinc-100 hover:scale-105 active:scale-95"
                  >
                    {isAr ? <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" /> : <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-y-4 sm:gap-y-6 gap-x-1 sm:gap-x-2 text-center mb-2 sm:mb-4">
                {weekDays.map((day, i) => (
                  <div key={i} className={cn("text-[10px] sm:text-xs font-light text-zinc-500 uppercase", !isAr && "tracking-wider")}>
                    {day}
                  </div>
                ))}
              </div>

              <div className={cn(
                "grid grid-cols-7 flex-1 content-start",
                appSettings.calendarView === 'details' ? "gap-y-1 gap-x-1 sm:gap-y-2 sm:gap-x-2" : "gap-y-2 gap-x-1 sm:gap-y-3 sm:gap-x-2"
              )}>
                {days.map((day, i) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isTodayDate = isToday(day);
                  const dayStr = format(day, 'yyyy-MM-dd');
                  
                  const dayEvents = events.filter(event => {
                    if (event.date === dayStr) return true;
                    if (!event.recurrence || event.recurrence === 'none') return false;
                    
                    const eventDate = parseISO(event.date);
                    if (day < eventDate) return false;

                    switch (event.recurrence) {
                      case 'daily': return true;
                      case 'weekly': return eventDate.getDay() === day.getDay();
                      case 'monthly': return eventDate.getDate() === day.getDate();
                      case 'yearly': return eventDate.getDate() === day.getDate() && eventDate.getMonth() === day.getMonth();
                      default: return false;
                    }
                  });
                  const dayAcademicEvents = academicEvents.filter(e => e.date === dayStr);
                  const daySalaryEvents = salaryDates.filter(e => e.date === dayStr);

                  const hasEvent = dayEvents.length > 0;
                  const hasAcademicEvent = dayAcademicEvents.length > 0;
                  const hasSalaryEvent = daySalaryEvents.length > 0;

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedDate(day);
                        if (!isCurrentMonth) {
                          setCurrentMonth(startOfMonth(day));
                        }
                      }}
                      className={cn(
                        "flex flex-col rounded-[1.125rem] sm:rounded-2xl transition-all duration-300 relative group font-light overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                        appSettings.calendarView === 'details' 
                          ? "min-h-[70px] xs:min-h-[85px] sm:min-h-[100px] lg:min-h-[120px] p-1.5 sm:p-2 items-start justify-start border border-zinc-800/40 hover:border-zinc-700/80 bg-zinc-900/30" 
                          : "aspect-square items-center justify-center text-sm sm:text-base lg:text-lg bg-zinc-900/30 border border-zinc-800/40 hover:border-zinc-700/80",
                        !isCurrentMonth && "text-zinc-600 opacity-50",
                        isCurrentMonth && !isSelected && !isTodayDate && "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
                        isTodayDate && !isSelected && "text-indigo-300 font-medium bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]",
                        isSelected && "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white font-medium shadow-[0_4px_20px_rgba(99,102,241,0.4)] scale-105 z-10 border-indigo-400/50"
                      )}
                    >
                      <div className={cn(
                        "flex flex-col gap-0.5",
                        appSettings.calendarView === 'details' ? "items-start w-full mb-1" : "items-center"
                      )}>
                        <span className={cn(
                          "leading-none",
                          appSettings.calendarView === 'details' ? "text-[10px] xs:text-xs sm:text-sm font-bold" : "text-sm sm:text-base"
                        )}>{format(day, dateFormat)}</span>
                        <span className={cn(
                          "leading-none font-secondary",
                          appSettings.calendarView === 'details' ? "text-[8px] sm:text-[10px] opacity-70" : "text-[9px] sm:text-[10px] lg:text-xs opacity-60",
                          isSelected ? "text-indigo-100" : "text-zinc-500"
                        )}>
                          {getHijriDay(day)}
                        </span>
                      </div>
                      
                      {/* Compact View */}
                      {appSettings.calendarView === 'compact' && (
                        <div className="absolute bottom-1.5 sm:bottom-2 flex gap-1 sm:gap-1.5">
                          {hasAcademicEvent && (
                            <div className={cn("w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-colors", isSelected ? "bg-white" : "bg-emerald-400")} />
                          )}
                          {hasSalaryEvent && (
                            <div className={cn("w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-colors", isSelected ? "bg-white" : "bg-emerald-400")} />
                          )}
                          {hasEvent && (
                            <div className={cn("w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-colors", isSelected ? "bg-indigo-300" : "bg-indigo-400")} />
                          )}
                        </div>
                      )}

                      {/* Stacked View */}
                      {appSettings.calendarView === 'stacked' && (
                        <div className="absolute bottom-1.5 sm:bottom-2 w-full px-1.5 sm:px-2 flex flex-col gap-[2px] sm:gap-[3px] items-center">
                          {hasAcademicEvent && (
                            <div className={cn("w-full max-w-[12px] sm:max-w-[18px] h-[2px] sm:h-[3px] rounded-full transition-colors", isSelected ? "bg-white" : "bg-emerald-400")} />
                          )}
                          {hasSalaryEvent && (
                            <div className={cn("w-full max-w-[12px] sm:max-w-[18px] h-[2px] sm:h-[3px] rounded-full transition-colors", isSelected ? "bg-white" : "bg-emerald-400")} />
                          )}
                          {hasEvent && (
                            <div className={cn("w-full max-w-[12px] sm:max-w-[18px] h-[2px] sm:h-[3px] rounded-full transition-colors", isSelected ? "bg-indigo-300" : "bg-indigo-400")} />
                          )}
                        </div>
                      )}

                      {/* Details View */}
                      {appSettings.calendarView === 'details' && (
                        <div className="w-full flex flex-col gap-[2px] sm:gap-1 mt-1 sm:mt-1.5 overflow-hidden">
                          {daySalaryEvents.slice(0, 1).map((e, idx) => (
                            <div key={`sal-${idx}`} className={cn(
                              "text-[7.5px] xs:text-[8.5px] sm:text-[10px] px-1 sm:px-1.5 py-[2px] sm:py-0.5 rounded-[4px] truncate w-full text-start",
                              isSelected ? "bg-white/20 text-white font-medium" : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/10"
                            )}>
                              {isAr ? 'راتب' : 'Salary'}
                            </div>
                          ))}
                          {dayAcademicEvents.slice(0, 1).map((e, idx) => (
                            <div key={`aca-${idx}`} className={cn(
                              "text-[7.5px] xs:text-[8.5px] sm:text-[10px] px-1 sm:px-1.5 py-[2px] sm:py-0.5 rounded-[4px] truncate w-full text-start",
                              isSelected ? "bg-white/20 text-white font-medium" : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/10"
                            )}>
                              {isAr ? e.titleAr : e.titleEn}
                            </div>
                          ))}
                          {dayEvents.slice(0, 2).map((e, idx) => (
                            <div key={`evt-${idx}`} className={cn(
                              "text-[7.5px] xs:text-[8.5px] sm:text-[10px] px-1 sm:px-1.5 py-[2px] sm:py-0.5 rounded-[4px] truncate w-full text-start",
                              isSelected ? "bg-indigo-400/30 text-white font-medium" : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/10"
                            )}>
                              {e.title}
                            </div>
                          ))}
                          {(dayEvents.length + dayAcademicEvents.length + daySalaryEvents.length) > 3 && (
                            <div className={cn(
                              "text-[7px] xs:text-[8px] sm:text-[10px] px-1 sm:px-1.5 text-start font-medium",
                              isSelected ? "text-indigo-200" : "text-zinc-500"
                            )}>
                              +{dayEvents.length + dayAcademicEvents.length + daySalaryEvents.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Salaries Section */}
            <AnimatePresence>
              {showSalaries && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="relative overflow-hidden rounded-[2.5rem] bg-[#09090b] border border-zinc-800/60 p-6 lg:p-10 shadow-2xl"
                >
                  <div className="flex items-center gap-3 mb-10">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium tracking-wide text-zinc-100">
                        {isAr ? 'مواعيد الرواتب' : 'Salary Dates'}
                      </h3>
                      <p className="text-sm text-zinc-500 font-light mt-0.5">
                        {isAr ? 'مواعيد صرف الرواتب الحكومية' : 'Government salary payment dates'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {salaryDates.map((event) => {
                      const eventDate = parseISO(event.date);
                      const isPast = eventDate < new Date();
                      return (
                        <div 
                          key={event.date} 
                          className={cn(
                            "p-5 rounded-2xl border transition-all flex flex-col gap-2 group",
                            isPast ? "bg-zinc-900/30 border-zinc-900/50 opacity-60" : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/50 hover:border-emerald-500/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn("text-[11px] font-medium text-zinc-500 uppercase", !isAr && "tracking-wider")}>
                              {format(eventDate, 'EEEE', { locale: isAr ? arSA : enUS })}
                            </span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-colors">
                              {isAr ? 'راتب' : 'Salary'}
                            </span>
                          </div>
                          <h4 className="text-sm font-medium text-zinc-100 mt-1">
                            {isAr ? event.titleAr : event.titleEn}
                          </h4>
                          <div className="text-xs text-zinc-400 font-light">
                            {format(eventDate, 'd MMMM yyyy', { locale: isAr ? arSA : enUS })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* All Events Section */}
            <AnimatePresence>
              {showAllEvents && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="relative overflow-hidden rounded-[2.5rem] bg-[#09090b] border border-zinc-800/60 p-6 lg:p-10 shadow-2xl"
                >
                  <div className="flex items-center gap-3 mb-10">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 text-amber-400">
                      <ListTodo className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium tracking-wide text-zinc-100">
                        {isAr ? 'جميع الأحداث' : 'All Events'}
                      </h3>
                      <p className="text-sm text-zinc-500 font-light mt-0.5">
                        {isAr ? 'قائمة بجميع الأحداث المضافة' : 'List of all added events'}
                      </p>
                    </div>
                  </div>
                  
                  {events.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800/60 flex flex-col items-center justify-center gap-3">
                      <CalendarDays className="w-10 h-10 text-zinc-700" />
                      <p className="text-zinc-500 font-light">{isAr ? 'لا توجد أحداث مضافة' : 'No events added yet'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {events
                        .sort((a, b) => {
                          if (a.isPinned && !b.isPinned) return -1;
                          if (!a.isPinned && b.isPinned) return 1;
                          return new Date(a.date).getTime() - new Date(b.date).getTime();
                        })
                        .map((event) => {
                          const eventDate = parseISO(event.date);
                          return (
                            <div 
                              key={event.id} 
                              className={cn(
                                "p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-all flex flex-col gap-3 relative overflow-hidden",
                                event.isPinned && "border-indigo-500/30 bg-indigo-500/5"
                              )}
                            >
                              <div 
                                className="absolute inset-y-0 start-0 w-1" 
                                style={{ backgroundColor: event.color || '#6366f1' }}
                              />
                              <div className="flex items-center justify-between">
                                <span className={cn("text-[10px] font-light text-zinc-500 uppercase", !isAr && "tracking-wider")}>
                                  {format(eventDate, 'EEEE', { locale: isAr ? arSA : enUS })}
                                </span>
                                <div className="flex items-center gap-1.5 sm:gap-1">
                                  <button 
                                    onClick={() => handlePinEvent(event.id)}
                                    className={cn(
                                      "p-2 sm:p-1.5 rounded-lg transition-colors",
                                      event.isPinned ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                                    )}
                                  >
                                    <div className="min-w-[24px] sm:min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold">
                                      {isAr ? 'تثبيت' : 'Pin'}
                                    </div>
                                  </button>
                                  <button 
                                    onClick={() => handleEditEvent(event)}
                                    className="p-2 sm:p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                                  >
                                    <div className="min-w-[24px] sm:min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold">
                                      {isAr ? 'تعديل' : 'Edit'}
                                    </div>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="p-2 sm:p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                  >
                                    <div className="min-w-[24px] sm:min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold">
                                      {isAr ? 'حذف' : 'Del'}
                                    </div>
                                  </button>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-base font-light text-zinc-100 mb-1 flex items-center gap-2">
                                  {event.title}
                                  {event.isPinned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">{isAr ? 'مثبت' : 'Pinned'}</span>}
                                </h4>
                                <div className="text-xs text-zinc-400 font-light">
                                  {format(eventDate, 'd MMMM yyyy', { locale: isAr ? arSA : enUS })}
                                </div>
                              </div>
                              {event.content && (
                                <p className="text-sm text-zinc-500 font-light line-clamp-2">{event.content}</p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showAcademic && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="relative overflow-hidden rounded-[2.5rem] bg-[#09090b] border border-zinc-800/60 p-6 lg:p-10 shadow-2xl"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium tracking-wide text-zinc-100">
                          {isAr ? 'التقويم الدراسي والمناسبات' : 'Academic & Events'}
                        </h3>
                        <p className="text-sm text-zinc-500 font-light mt-0.5">
                          {isAr ? 'أهم المواعيد الدراسية والمناسبات الوطنية' : 'Important academic dates and national events'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex bg-zinc-900/60 backdrop-blur-md border border-zinc-800/60 rounded-xl p-1 overflow-x-auto hide-scrollbar">
                      {Array.from(new Set(academicEvents.map(e => e.hijriYear))).sort().map(year => (
                        <button
                          key={year}
                          onClick={() => setSelectedAcademicYear(year)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            selectedAcademicYear === year 
                              ? "bg-zinc-800 text-zinc-100 shadow-sm" 
                              : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {year} {isAr ? 'هـ' : 'AH'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {academicEvents
                      .filter(e => e.hijriYear === selectedAcademicYear)
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((event) => {
                        const eventDate = parseISO(event.date);
                        const isPast = eventDate < new Date();
                        return (
                          <div 
                            key={event.id} 
                            className={cn(
                              "p-5 rounded-2xl border transition-all flex flex-col gap-2 group",
                              isPast ? "bg-zinc-900/30 border-zinc-900/50 opacity-60" : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/50 hover:border-indigo-500/30"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn("text-[11px] font-medium text-zinc-500 uppercase", !isAr && "tracking-wider")}>
                                {format(eventDate, 'EEEE', { locale: isAr ? arSA : enUS })}
                              </span>
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                                event.type === 'holiday' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30" :
                                event.type === 'exam' ? "bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20 group-hover:border-amber-500/30" :
                                "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30"
                              )}>
                                {event.type === 'holiday' ? (isAr ? 'إجازة' : 'Holiday') :
                                 event.type === 'exam' ? (isAr ? 'اختبارات' : 'Exams') :
                                 (isAr ? 'دراسة' : 'Academic')}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium text-zinc-100 truncate mt-1">
                              {isAr ? event.titleAr : event.titleEn}
                            </h4>
                            <div className="text-xs text-zinc-400 font-light">
                              {format(eventDate, 'd MMMM yyyy', { locale: isAr ? arSA : enUS })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* Settings Modal - Redesigned & Responsive */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 md:p-8 lg:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl lg:max-w-5xl bg-zinc-950 sm:rounded-[3rem] border-0 sm:border border-zinc-800/50 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative z-10"
            >
              {/* Settings Header */}
              <div className="px-6 py-6 sm:px-12 sm:py-10 border-b border-zinc-900/50 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
                <div>
                  <h3 className="text-xl sm:text-3xl font-light text-zinc-100 tracking-tight">
                    {isAr ? 'الإعدادات' : 'Settings'}
                  </h3>
                  <p className="text-[10px] sm:text-sm text-zinc-500 font-light mt-1">
                    {isAr ? 'تخصيص تجربة التقويم الخاص بك' : 'Personalize your calendar experience'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 rounded-2xl transition-all border border-transparent hover:border-zinc-800"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Settings Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 lg:p-12 space-y-12 hide-scrollbar">
                
                {/* General Section */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className={cn("text-[10px] font-bold text-zinc-500 uppercase", !isAr && "tracking-[0.3em]")}>
                      {isAr ? 'عام' : 'General'}
                    </h4>
                    <div className="h-px flex-1 bg-zinc-900/50 mx-6" />
                  </div>
                  
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Language */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-400 ms-1">
                          {isAr ? 'لغة التطبيق' : 'App Language'}
                        </label>
                        <div className="flex bg-zinc-900/40 border border-zinc-800/80 rounded-[1.25rem] p-1.5 shadow-inner">
                          <button 
                            onClick={() => setLang('ar')}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                              lang === 'ar' ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            العربية
                          </button>
                          <button 
                            onClick={() => setLang('en')}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                              lang === 'en' ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            English
                          </button>
                        </div>
                      </div>

                      {/* Hijri Adjustment */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-400 ms-1">
                          {isAr ? 'تعديل التاريخ الهجري' : 'Hijri Adjustment'}
                        </label>
                        <div className="flex items-center bg-zinc-900/40 border border-zinc-800/80 rounded-[1.25rem] p-1.5 shadow-inner">
                          <button 
                            onClick={() => setHijriOffset(prev => prev - 1)}
                            className="w-12 h-12 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700/50"
                          >
                            -
                          </button>
                          <div className="flex-1 text-center text-lg font-light text-zinc-100">
                            {hijriOffset > 0 ? `+${hijriOffset}` : hijriOffset}
                          </div>
                          <button 
                            onClick={() => setHijriOffset(prev => prev + 1)}
                            className="w-12 h-12 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700/50"
                          >
                            +
                          </button>
                        </div>
                      </div>

                    {/* Primary Date */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-zinc-400 ms-1">
                        {isAr ? 'التاريخ الأساسي' : 'Primary Date'}
                      </label>
                      <div className="flex bg-zinc-900/40 border border-zinc-800/80 rounded-[1.25rem] p-1.5 shadow-inner">
                        <button 
                          onClick={() => setAppSettings({ ...appSettings, primaryDate: 'hijri' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                            appSettings.primaryDate === 'hijri' ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {isAr ? 'هجري' : 'Hijri'}
                        </button>
                        <button 
                          onClick={() => setAppSettings({ ...appSettings, primaryDate: 'gregorian' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                            appSettings.primaryDate === 'gregorian' ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {isAr ? 'ميلادي' : 'Gregorian'}
                        </button>
                      </div>
                    </div>

                    {/* Calendar View */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-zinc-400 ms-1">
                        {isAr ? 'عرض الجدول' : 'Calendar View'}
                      </label>
                      <div className="flex bg-zinc-900/40 border border-zinc-800/80 rounded-[1.25rem] p-1.5 shadow-inner">
                        <button 
                          onClick={() => setAppSettings({ ...appSettings, calendarView: 'compact' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                            appSettings.calendarView === 'compact' ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {isAr ? 'مضغوط' : 'Compact'}
                        </button>
                        <button 
                          onClick={() => setAppSettings({ ...appSettings, calendarView: 'stacked' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                            appSettings.calendarView === 'stacked' ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {isAr ? 'مكدس' : 'Stacked'}
                        </button>
                        <button 
                          onClick={() => setAppSettings({ ...appSettings, calendarView: 'details' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                            appSettings.calendarView === 'details' ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {isAr ? 'تفصيلي' : 'Details'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Prayer Settings */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className={cn("text-[10px] font-bold text-zinc-500 uppercase", !isAr && "tracking-[0.3em]")}>
                      {isAr ? 'الصلاة' : 'Prayer'}
                    </h4>
                    <div className="h-px flex-1 bg-zinc-900/50 mx-6" />
                  </div>

                   <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-400 ms-1">
                          {isAr ? 'المدينة' : 'City'}
                        </label>
                        <select 
                          value={appSettings.cityId}
                          onChange={(e) => setAppSettings({ ...appSettings, cityId: e.target.value })}
                          className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-[1.25rem] px-6 py-4 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium text-sm sm:text-base appearance-none shadow-inner"
                        >
                          {GCC_CITIES.map(city => (
                            <option key={city.id} value={city.id} className="bg-zinc-950">
                              {isAr ? `${city.nameAr} - ${city.countryAr}` : `${city.nameEn} - ${city.countryEn}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-400 ms-1">
                          {isAr ? 'طريقة الحساب' : 'Calculation Method'}
                        </label>
                        <select 
                          value={appSettings.calculationMethod}
                          onChange={(e) => setAppSettings({ ...appSettings, calculationMethod: e.target.value })}
                          className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-[1.25rem] px-6 py-4 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium text-sm sm:text-base appearance-none shadow-inner"
                        >
                          <option value="UmmAlQura" className="bg-zinc-950">{isAr ? 'أم القرى' : 'Umm Al-Qura'}</option>
                          <option value="Dubai" className="bg-zinc-950">{isAr ? 'دبي' : 'Dubai'}</option>
                          <option value="Kuwait" className="bg-zinc-950">{isAr ? 'الكويت' : 'Kuwait'}</option>
                          <option value="Qatar" className="bg-zinc-950">{isAr ? 'قطر' : 'Qatar'}</option>
                          <option value="MuslimWorldLeague" className="bg-zinc-950">{isAr ? 'رابطة العالم الإسلامي' : 'Muslim World League'}</option>
                          <option value="Jafari" className="bg-zinc-950">{isAr ? 'حساب جعفري' : 'Jafari'}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Salary Settings */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className={cn("text-[10px] font-bold text-zinc-500 uppercase", !isAr && "tracking-[0.3em]")}>
                      {isAr ? 'الرواتب' : 'Salaries'}
                    </h4>
                    <div className="h-px flex-1 bg-zinc-900/50 mx-6" />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-zinc-400 ms-1">
                      {isAr ? 'دولة الرواتب' : 'Salary Country'}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { id: 'SA', nameAr: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia' },
                        { id: 'AE', nameAr: 'الإمارات العربية المتحدة', nameEn: 'United Arab Emirates' },
                        { id: 'KW', nameAr: 'دولة الكويت', nameEn: 'Kuwait' },
                        { id: 'QA', nameAr: 'دولة قطر', nameEn: 'Qatar' },
                        { id: 'BH', nameAr: 'مملكة البحرين', nameEn: 'Bahrain' },
                        { id: 'OM', nameAr: 'سلطنة عمان', nameEn: 'Oman' },
                      ].map(country => (
                        <button 
                          key={country.id}
                          onClick={() => setAppSettings({ ...appSettings, salaryCountry: country.id as any })}
                          className={cn(
                            "px-4 py-4 rounded-[1.25rem] border text-sm font-medium transition-all duration-300",
                            appSettings.salaryCountry === country.id 
                              ? "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-md" 
                              : "bg-zinc-900/40 border-zinc-800/80 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 shadow-inner"
                          )}
                        >
                          {isAr ? country.nameAr : country.nameEn}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Download & Share Section - Redesigned */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className={cn("text-[10px] font-bold text-zinc-500 uppercase", !isAr && "tracking-[0.3em]")}>
                      {isAr ? 'تحميل ومشاركة' : 'Download & Share'}
                    </h4>
                    <div className="h-px flex-1 bg-zinc-900/50 mx-6" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* PDF Export Card */}
                    <div className="p-8 rounded-[2.5rem] bg-zinc-900/50 border border-zinc-800/80 space-y-8 backdrop-blur-sm shadow-xl shadow-black/20">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                          <FileDown className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="text-lg font-bold text-zinc-100">
                            {isAr ? 'تصدير كـ PDF' : 'Export as PDF'}
                          </h5>
                          <p className="text-xs text-zinc-500 font-light mt-1">
                            {isAr ? 'تخصيص وتحميل نسخة مطبوعة' : 'Customize and download a print version'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Paper Size & Orientation */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className={cn("text-[10px] font-bold text-zinc-500 ms-1 uppercase", !isAr && "tracking-[0.2em]")}>
                              {isAr ? 'حجم الورق' : 'Paper Size'}
                            </label>
                            <div className="flex bg-black/40 border border-zinc-800 rounded-2xl p-1">
                              <select 
                                value={printPaperSize}
                                onChange={(e) => setPrintPaperSize(e.target.value as any)}
                                className="w-full bg-transparent border-none text-zinc-300 text-sm py-2 px-3 focus:outline-none focus:ring-0 cursor-pointer appearance-none text-center font-medium"
                              >
                                <option value="A4" className="bg-zinc-900">A4</option>
                                <option value="A3" className="bg-zinc-900">A3</option>
                                <option value="Letter" className="bg-zinc-900">Letter</option>
                                <option value="Legal" className="bg-zinc-900">Legal</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <label className={cn("text-[10px] font-bold text-zinc-500 ms-1 uppercase", !isAr && "tracking-[0.2em]")}>
                              {isAr ? 'الاتجاه' : 'Orientation'}
                            </label>
                            <div className="flex bg-black/40 border border-zinc-800 rounded-2xl p-1">
                              <button
                                onClick={() => setPrintOrientation('portrait')}
                                className={cn("flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all", printOrientation === 'portrait' ? "bg-zinc-100 text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                              >
                                {isAr ? 'طولي' : 'Portrait'}
                              </button>
                              <button
                                onClick={() => setPrintOrientation('landscape')}
                                className={cn("flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all", printOrientation === 'landscape' ? "bg-zinc-100 text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                              >
                                {isAr ? 'عرضي' : 'Landscape'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="space-y-3">
                          <label className={cn("text-[10px] font-bold text-zinc-500 ms-1 uppercase", !isAr && "tracking-[0.2em]")}>
                            {isAr ? 'مدة العرض' : 'Duration'}
                          </label>
                          <div className="flex bg-black/40 border border-zinc-800 rounded-2xl p-1">
                            <button
                              onClick={() => setPrintDuration('6months')}
                              className={cn("flex-1 py-3 rounded-xl text-[11px] font-bold transition-all", printDuration === '6months' ? "bg-zinc-100 text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                            >
                              {isAr ? '6 أشهر' : '6 Months'}
                            </button>
                            <button
                              onClick={() => setPrintDuration('1year')}
                              className={cn("flex-1 py-3 rounded-xl text-[11px] font-bold transition-all", printDuration === '1year' ? "bg-zinc-100 text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                            >
                              {isAr ? 'سنة كاملة' : 'Full Year'}
                            </button>
                          </div>
                        </div>

                        {/* Design */}
                        <div className="space-y-3">
                          <label className={cn("text-[10px] font-bold text-zinc-500 ms-1 uppercase", !isAr && "tracking-[0.2em]")}>
                            {isAr ? 'نمط التصميم' : 'Design Style'}
                          </label>
                          <div className="flex bg-black/40 border border-zinc-800 rounded-2xl p-1 gap-1 overflow-x-auto hide-scrollbar">
                            {[
                              { id: 'modern', label: isAr ? 'عصري' : 'Modern' },
                              { id: 'original', label: isAr ? 'الأصلي' : 'Original' },
                              { id: 'custom', label: isAr ? 'مخصص' : 'Custom' },
                              { id: 'general', label: isAr ? 'عام' : 'General' }
                            ].map(style => (
                              <button
                                key={style.id}
                                onClick={() => setPrintDesign(style.id as any)}
                                className={cn("flex-1 py-2.5 px-4 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap", printDesign === style.id ? "bg-zinc-100 text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                              >
                                {style.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Date Type */}
                        <div className="space-y-3">
                          <label className={cn("text-[10px] font-bold text-zinc-500 ms-1 uppercase", !isAr && "tracking-[0.2em]")}>
                            {isAr ? 'نوع التاريخ' : 'Date Type'}
                          </label>
                          <div className="flex bg-black/40 border border-zinc-800 rounded-2xl p-1 gap-1">
                            {[
                              { id: 'both', label: isAr ? 'الكل' : 'Both' },
                              { id: 'hijri', label: isAr ? 'هجري' : 'Hijri' },
                              { id: 'gregorian', label: isAr ? 'ميلادي' : 'Gregorian' }
                            ].map(type => (
                              <button
                                key={type.id}
                                onClick={() => setPrintDateType(type.id as any)}
                                className={cn("flex-1 py-3 rounded-xl text-[11px] font-bold transition-all", printDateType === type.id ? "bg-zinc-100 text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                              >
                                {type.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => window.print()}
                        className="w-full h-[54px] rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                      >
                        <FileDown className="w-5 h-5" />
                        {isAr ? 'تحميل التقويم كـ PDF' : 'Download Calendar as PDF'}
                      </button>
                    </div>

                    {/* Social Share Card */}
                    <div className="p-6 sm:p-8 rounded-[2rem] bg-zinc-900/30 border border-zinc-800/50 flex flex-col justify-between space-y-8">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div>
                            <h5 className="text-base font-bold text-zinc-100">
                              {isAr ? 'مشاركة الرابط' : 'Share Link'}
                            </h5>
                            <p className="text-xs text-zinc-500 font-light mt-1">
                              {isAr ? 'شارك التقويم مع الآخرين' : 'Share the calendar with others'}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-zinc-400 font-light leading-relaxed">
                          {isAr 
                            ? 'يمكنك مشاركة رابط التقويم مباشرة عبر منصات التواصل الاجتماعي لسهولة الوصول.' 
                            : 'You can share the calendar link directly via social media platforms for easy access.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <button
                          onClick={() => {
                            const shareUrl = new URL(window.location.href);
                            shareUrl.searchParams.set('pdfId', Math.random().toString(36).substring(2, 10));
                            shareUrl.searchParams.set('createdAt', Date.now().toString());
                            const message = isAr 
                              ? `إليك التقويم الدراسي والرواتب لعام ${format(currentMonth, 'yyyy')}: ${shareUrl.toString()}`
                              : `Here is the Academic & Salary Calendar for ${format(currentMonth, 'yyyy')}: ${shareUrl.toString()}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                          }}
                          className="w-full h-[54px] rounded-2xl bg-[#25D366] hover:bg-[#22c35e] text-white text-[13px] font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/10"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          {isAr ? 'مشاركة عبر واتساب' : 'Share via WhatsApp'}
                        </button>
                        
                        <button
                          onClick={() => {
                            const shareUrl = new URL(window.location.href);
                            shareUrl.searchParams.set('pdfId', Math.random().toString(36).substring(2, 10));
                            shareUrl.searchParams.set('createdAt', Date.now().toString());
                            const message = isAr 
                              ? `إليك التقويم الدراسي والرواتب لعام ${format(currentMonth, 'yyyy')}: ${shareUrl.toString()}`
                              : `Here is the Academic & Salary Calendar for ${format(currentMonth, 'yyyy')}: ${shareUrl.toString()}`;
                            window.open(`sms:?&body=${encodeURIComponent(message)}`, '_self');
                          }}
                          className="w-full h-[54px] rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/10"
                        >
                          <MessageSquare className="w-5 h-5" />
                          {isAr ? 'مشاركة عبر رسالة نصية' : 'Share via SMS'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Legal Section */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className={cn("text-[10px] font-bold text-zinc-500 uppercase", !isAr && "tracking-[0.3em]")}>
                      {isAr ? 'قانوني' : 'Legal'}
                    </h4>
                    <div className="h-px flex-1 bg-zinc-900/50 mx-6" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { id: 'privacy', nameAr: 'سياسة الخصوصية', nameEn: 'Privacy Policy' },
                      { id: 'terms', nameAr: 'شروط الاستخدام', nameEn: 'Terms of Use' },
                      { id: 'rights', nameAr: 'حقوق المطور', nameEn: 'Developer Rights' },
                    ].map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => window.open('/' + doc.id, '_blank')}
                        className="px-6 py-4 rounded-[1.5rem] bg-zinc-900/50 border border-zinc-800/50 text-sm font-light text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all text-center"
                      >
                        {isAr ? doc.nameAr : doc.nameEn}
                      </button>
                    ))}
                  </div>

                  <div className="p-8 rounded-[2rem] bg-zinc-900/30 border border-zinc-900/50">
                    <p className="text-[11px] text-zinc-500 font-light leading-relaxed text-center max-w-md mx-auto whitespace-pre-wrap">
                      {LEGAL_FOOTER}
                    </p>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Event Modal - Redesigned & Responsive */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 md:p-8 lg:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEventModal(false);
                setEditingEventId(null);
                setNewEventTitle('');
                setNewEventContent('');
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-4xl lg:max-w-5xl bg-zinc-950 sm:rounded-[3rem] border-0 sm:border border-zinc-800/50 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative z-10"
            >
              <div className="px-6 py-6 sm:px-12 sm:py-10 border-b border-zinc-900/50 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
                <div>
                  <h3 className="text-xl sm:text-3xl font-light text-zinc-100 tracking-tight">
                    {editingEventId 
                      ? (isAr ? 'تعديل الحدث' : 'Edit Event') 
                      : (isAr ? 'إضافة حدث جديد' : 'New Event')}
                  </h3>
                  <p className="text-[10px] sm:text-sm text-zinc-500 font-light mt-1">
                    {isAr ? 'قم بتنظيم جدولك وإضافة مواعيدك المهمة' : 'Organize your schedule and add important dates'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEventId(null);
                    setNewEventTitle('');
                    setNewEventContent('');
                  }}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 rounded-2xl transition-all border border-transparent hover:border-zinc-800"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-12 lg:p-16 hide-scrollbar">
                <form onSubmit={handleAddEvent} className="space-y-10">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className={cn("text-[10px] font-bold text-zinc-500 uppercase ms-1", !isAr && "tracking-[0.3em]")}>
                        {isAr ? 'عنوان الحدث' : 'Event Title'}
                      </label>
                      <input 
                        type="text"
                        required
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        className="w-full bg-transparent border-b border-zinc-800 py-4 text-2xl sm:text-3xl font-light text-zinc-100 placeholder:text-zinc-800 focus:outline-none focus:border-indigo-500 transition-all"
                        placeholder={isAr ? 'ماذا تخطط؟' : 'What are you planning?'}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between ms-1">
                          <label className={cn("text-[10px] font-bold text-zinc-500 uppercase", !isAr && "tracking-[0.3em]")}>
                            {isAr ? 'التاريخ' : 'Date'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setNewEventIsAllDay(!newEventIsAllDay)}
                            className="text-[10px] font-bold text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                          >
                            <span>{isAr ? 'طوال اليوم:' : 'All Day:'}</span>
                            <span className={cn(newEventIsAllDay ? "text-indigo-400" : "text-zinc-500")}>
                              {newEventIsAllDay ? (isAr ? 'تفعيل' : 'Enabled') : (isAr ? 'إلغاء' : 'Disabled')}
                            </span>
                          </button>
                        </div>
                        <input 
                          type="date"
                          required
                          value={newEventDate}
                          onChange={(e) => setNewEventDate(e.target.value)}
                          className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-[1.5rem] px-6 py-4 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-light text-base"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className={cn("text-[10px] font-bold text-zinc-500 uppercase ms-1", !isAr && "tracking-[0.3em]")}>
                          {isAr ? 'التكرار' : 'Recurrence'}
                        </label>
                        <select 
                          value={newEventRecurrence}
                          onChange={(e) => setNewEventRecurrence(e.target.value as any)}
                          className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-[1.5rem] px-6 py-4 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-light text-base appearance-none"
                        >
                          <option value="none" className="bg-zinc-950">{isAr ? 'بدون تكرار' : 'No Recurrence'}</option>
                          <option value="daily" className="bg-zinc-950">{isAr ? 'يومي' : 'Daily'}</option>
                          <option value="weekly" className="bg-zinc-950">{isAr ? 'أسبوعي' : 'Weekly'}</option>
                          <option value="monthly" className="bg-zinc-950">{isAr ? 'شهري' : 'Monthly'}</option>
                          <option value="yearly" className="bg-zinc-950">{isAr ? 'سنوي' : 'Yearly'}</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className={cn("text-[10px] font-bold text-zinc-500 uppercase ms-1", !isAr && "tracking-[0.3em]")}>
                        {isAr ? 'لون التمييز' : 'Accent Color'}
                      </label>
                      <div className="flex gap-3 flex-wrap bg-zinc-900/30 border border-zinc-800/50 rounded-[1.5rem] p-4 h-[60px]">
                        {colors.map(color => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setNewEventColor(color.value)}
                            className={cn(
                              "w-[25px] h-[25px] rounded-full transition-all relative flex items-center justify-center",
                              newEventColor === color.value ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110" : "hover:scale-110 opacity-70 hover:opacity-100"
                            )}
                            style={{ backgroundColor: color.value }}
                          >
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className={cn("text-[10px] font-bold text-zinc-500 uppercase ms-1", !isAr && "tracking-[0.3em]")}>
                        {isAr ? 'ملاحظات إضافية' : 'Additional Notes'}
                      </label>
                      <textarea 
                        value={newEventContent}
                        onChange={(e) => setNewEventContent(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-[1.5rem] px-6 py-4 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-light text-base min-h-[120px] resize-none"
                        placeholder={isAr ? 'أضف أي تفاصيل أخرى هنا...' : 'Add any other details here...'}
                      />
                    </div>
                  </div>

                  <div className="pt-4 pb-2">
                    <button 
                      type="submit"
                      className="w-full h-[54px] pt-[15px] rounded-[1.5rem] bg-zinc-100 text-zinc-950 font-bold text-[15px] hover:bg-white transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-[0.98]"
                    >
                      {editingEventId 
                        ? (isAr ? 'حفظ التغييرات' : 'Save Changes') 
                        : (isAr ? 'إضافة الحدث' : 'Add Event')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shared PDF Full-Screen Modal */}
      <AnimatePresence>
        {isSharedPdf && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center sm:p-4 md:p-8 lg:p-12 print:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-3xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-zinc-950 sm:rounded-[3rem] border-0 sm:border border-zinc-800/50 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-y-auto flex flex-col relative z-10 hide-scrollbar"
            >
              <div className="p-6 sm:p-10 lg:p-12 space-y-10">
                
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                    <CalendarIcon className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-light text-zinc-100 tracking-tight">
                    {isAr ? 'تقويم مشارك معك' : 'Shared Calendar'}
                  </h2>
                  <p className="text-sm text-zinc-400 font-light max-w-sm mx-auto">
                    {isAr ? 'قم بتخصيص التقويم قبل تحميله أو طباعته' : 'Customize the calendar before downloading or printing'}
                  </p>
                </div>

                <div className="space-y-8 bg-zinc-900/30 p-6 sm:p-8 rounded-[2rem] border border-zinc-800/50">
                  {/* Duration */}
                  <div className="space-y-3">
                    <label className={cn("text-[10px] font-light text-zinc-500 ms-1 uppercase", !isAr && "tracking-wider")}>
                      {isAr ? 'مدة العرض' : 'Duration'}
                    </label>
                    <div className="flex bg-zinc-950 border border-zinc-900 rounded-xl p-1">
                      <button
                        onClick={() => setPrintDuration('6months')}
                        className={cn("flex-1 py-3 rounded-lg text-[11px] sm:text-xs font-light transition-all", printDuration === '6months' ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        {isAr ? '6 أشهر' : '6 Months'}
                      </button>
                      <button
                        onClick={() => setPrintDuration('1year')}
                        className={cn("flex-1 py-3 rounded-lg text-[11px] sm:text-xs font-light transition-all", printDuration === '1year' ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        {isAr ? 'سنة كاملة' : 'Full Year'}
                      </button>
                    </div>
                  </div>

                  {/* Design */}
                  <div className="space-y-3">
                    <label className={cn("text-[10px] font-light text-zinc-500 ms-1 uppercase", !isAr && "tracking-wider")}>
                      {isAr ? 'نمط التصميم' : 'Design Style'}
                    </label>
                    <div className="flex bg-zinc-950 border border-zinc-900 rounded-xl p-1 overflow-x-auto hide-scrollbar">
                      <button
                        onClick={() => setPrintDesign('modern')}
                        className={cn("flex-1 py-3 px-3 rounded-lg text-[11px] sm:text-xs font-light transition-all whitespace-nowrap", printDesign === 'modern' ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        {isAr ? 'عصري' : 'Modern'}
                      </button>
                      <button
                        onClick={() => setPrintDesign('original')}
                        className={cn("flex-1 py-3 px-3 rounded-lg text-[11px] sm:text-xs font-light transition-all whitespace-nowrap", printDesign === 'original' ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        {isAr ? 'الأصلي' : 'Original'}
                      </button>
                      <button
                        onClick={() => setPrintDesign('custom')}
                        className={cn("flex-1 py-3 px-3 rounded-lg text-[11px] sm:text-xs font-light transition-all whitespace-nowrap", printDesign === 'custom' ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        {isAr ? 'مخصص' : 'Custom'}
                      </button>
                      <button
                        onClick={() => setPrintDesign('general')}
                        className={cn("flex-1 py-3 px-3 rounded-lg text-[11px] sm:text-xs font-light transition-all whitespace-nowrap", printDesign === 'general' ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        {isAr ? 'عام' : 'General'}
                      </button>
                    </div>
                  </div>

                  {/* Date Type */}
                  <div className="space-y-3">
                    <label className={cn("text-[10px] font-light text-zinc-500 ms-1 uppercase", !isAr && "tracking-wider")}>
                      {isAr ? 'نوع التاريخ' : 'Date Type'}
                    </label>
                    <div className="flex bg-zinc-950 border border-zinc-900 rounded-xl p-1">
                      <button
                        onClick={() => setPrintDateType('both')}
                        className={cn("flex-1 py-3 rounded-lg text-[11px] sm:text-xs font-light transition-all", printDateType === 'both' ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        {isAr ? 'الكل' : 'Both'}
                      </button>
                      <button
                        onClick={() => setPrintDateType('hijri')}
                        className={cn("flex-1 py-3 rounded-lg text-[11px] sm:text-xs font-light transition-all", printDateType === 'hijri' ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        {isAr ? 'هجري' : 'Hijri'}
                      </button>
                      <button
                        onClick={() => setPrintDateType('gregorian')}
                        className={cn("flex-1 py-3 rounded-lg text-[11px] sm:text-xs font-light transition-all", printDateType === 'gregorian' ? "bg-zinc-100 text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-300")}
                      >
                        {isAr ? 'ميلادي' : 'Gregorian'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => window.print()}
                    className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
                  >
                    <FileDown className="w-5 h-5" />
                    {isAr ? 'تحميل التقويم كـ PDF' : 'Download Calendar as PDF'}
                  </button>
                  
                  <button
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.delete('pdfId');
                      window.history.replaceState({}, '', url.toString());
                      setIsSharedPdf(false);
                    }}
                    className="w-full py-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-bold transition-all flex items-center justify-center gap-3 border border-zinc-800/50"
                  >
                    {isAr ? 'عرض التقويم التفاعلي' : 'View Interactive Calendar'}
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>

      {/* Print View */}
      <div className={cn(
        "hidden print:flex w-full h-[100vh] flex-col p-4 sm:p-8 print:p-8",
        printDesign === 'original' ? "bg-[#020202] text-zinc-100" : 
        printDesign === 'custom' ? "bg-[#f8fafc] text-slate-900" : 
        printDesign === 'modern' ? "bg-white text-zinc-900 modern-bg" : "bg-white text-black"
      )} dir={isAr ? 'rtl' : 'ltr'}>
        <style type="text/css" media="print">
          {`
            @page { size: ${printPaperSize} ${printOrientation}; margin: 0; }
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background: ${printDesign === 'original' ? '#020202' : printDesign === 'custom' ? '#f8fafc' : 'white'} !important; 
              margin: 0;
              padding: 0;
              font-family: ${isAr ? '"Thmanyah Sans", "IBM Plex Sans Arabic", sans-serif' : 'system-ui, sans-serif'};
            }
            ::-webkit-scrollbar { display: none; }
            .print-container {
              width: 100%;
              height: 100vh;
              overflow: hidden;
            }
            .modern-bg {
              background-image: radial-gradient(#e5e7eb 0.5px, transparent 0.5px);
              background-size: 10px 10px;
            }
          `}
        </style>
        
        {/* Header - Redesigned */}
        <div className={cn(
          "flex items-end justify-between mb-6 shrink-0 pb-6 border-b-2",
          printDesign === 'original' ? "border-zinc-800" : 
          printDesign === 'custom' ? "border-slate-200" : 
          printDesign === 'modern' ? "border-zinc-100" : "border-black"
        )}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                printDesign === 'original' ? "bg-indigo-500/20 text-indigo-400" : 
                printDesign === 'modern' ? "bg-zinc-900 text-white" : "bg-indigo-600 text-white"
              )}>
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h1 className={cn(
                "text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight leading-none",
                printDesign === 'original' ? "text-zinc-100" : 
                printDesign === 'modern' ? "text-zinc-900 font-bold" : "text-slate-900",
                printDesign === 'general' && "font-bold text-black"
              )}>
                {isAr ? 'التقويم السنوي' : 'Annual Calendar'}
              </h1>
            </div>
            <p className={cn(
              "text-sm sm:text-base lg:text-xl font-bold uppercase leading-none opacity-60 ps-16",
              !isAr && "tracking-[0.3em]",
              printDesign === 'original' ? "text-zinc-400" : 
              printDesign === 'modern' ? cn("text-zinc-500", !isAr && "tracking-[0.1em]") : "text-slate-500",
              printDesign === 'general' && "text-black opacity-100"
            )}>
              {isAr ? 'الدراسي والرواتب' : 'Academic & Salaries'} • {format(currentMonth, 'yyyy')} {isAr ? 'م' : 'CE'}
            </p>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-4 h-4 rounded-full",
                  printDesign === 'original' ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]" : 
                  printDesign === 'custom' ? "bg-emerald-500" : 
                  printDesign === 'modern' ? "bg-emerald-500" : "bg-black"
                )} />
                <span className={cn(
                  "text-xs sm:text-sm font-bold uppercase",
                  !isAr && "tracking-widest",
                  printDesign === 'original' ? "text-zinc-400" : 
                  printDesign === 'modern' ? "text-zinc-600" : "text-slate-600",
                  printDesign === 'general' && "font-bold text-black"
                )}>{isAr ? 'الرواتب' : 'Salaries'}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-4 h-4 rounded-full",
                  printDesign === 'original' ? "bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.6)]" : 
                  printDesign === 'custom' ? "bg-indigo-500" : 
                  printDesign === 'modern' ? "bg-indigo-500" : "bg-black"
                )} />
                <span className={cn(
                  "text-xs sm:text-sm font-bold uppercase",
                  !isAr && "tracking-widest",
                  printDesign === 'original' ? "text-zinc-400" : 
                  printDesign === 'modern' ? "text-zinc-600" : "text-slate-600",
                  printDesign === 'general' && "font-bold text-black"
                )}>{isAr ? 'التقويم الدراسي' : 'Academic'}</span>
              </div>
            </div>
            <div className={cn(
              "text-[8px] sm:text-[10px] font-mono opacity-40 uppercase",
              !isAr && "tracking-widest",
              printDesign === 'original' ? "text-zinc-500" : 
              printDesign === 'modern' ? "text-zinc-400" : "text-slate-400"
            )}>
              {GCC_CITIES.find(c => c.id === appSettings.cityId)?.[isAr ? 'nameAr' : 'nameEn']} • {format(new Date(), 'yyyy/MM/dd HH:mm')}
            </div>
          </div>
        </div>

        {/* Grid - Redesigned with better spacing and typography */}
        <div className={cn(
          "flex-1 grid gap-2 sm:gap-4 min-h-0",
          printDuration === '6months' 
            ? (printOrientation === 'landscape' ? "grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:grid-rows-2" : "grid-cols-2 lg:grid-cols-2 print:grid-cols-2 print:grid-rows-3")
            : (printOrientation === 'landscape' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 print:grid-rows-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-3 print:grid-cols-3 print:grid-rows-4")
        )}>
          {Array.from({ length: printDuration === '6months' ? 6 : 12 }).map((_, i) => {
            const monthDate = addMonths(startOfYear(currentMonth), i);
            const monthDays = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) });
            const firstDay = monthDays[0].getDay();
            const padding = Array.from({ length: firstDay });
            const endPaddingLength = 42 - (padding.length + monthDays.length);
            const endPadding = Array.from({ length: endPaddingLength });

            return (
              <div key={i} className={cn(
                "flex flex-col h-full rounded-2xl border-2 transition-all",
                printDesign === 'original' ? "bg-zinc-900/10 border-zinc-800/30" :
                printDesign === 'custom' ? "bg-white border-indigo-100 shadow-xl shadow-indigo-100/50" : 
                printDesign === 'modern' ? "bg-white border-zinc-100 shadow-sm" :
                "bg-white border-black rounded-none"
              )}>
                <div className={cn(
                  "text-center py-2 sm:py-3 text-sm sm:text-base font-bold shrink-0 uppercase",
                  !isAr && "tracking-[0.2em]",
                  printDesign === 'original' ? "bg-zinc-800/20 text-zinc-100" :
                  printDesign === 'custom' ? "bg-indigo-50/50 text-indigo-900 border-b border-indigo-100" : 
                  printDesign === 'modern' ? "bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white border-b border-zinc-700 shadow-sm" :
                  "bg-white text-black border-b-2 border-black"
                )}>
                  {format(monthDate, 'MMMM', { locale: isAr ? arSA : enUS })}
                </div>
                <div className={cn(
                  "grid grid-cols-7 text-center text-[6px] sm:text-[8px] font-bold uppercase shrink-0 py-1 sm:py-2 opacity-30",
                  !isAr && "tracking-[0.2em]",
                  printDesign === 'original' ? "text-zinc-400" :
                  printDesign === 'custom' ? "text-slate-500" : 
                  printDesign === 'modern' ? cn("text-zinc-500 opacity-60", !isAr && "tracking-[0.1em]") :
                  "text-black border-b border-black opacity-100"
                )}>
                  {weekDays.map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-0 w-full">
                  {padding.map((_, j) => <div key={`pad-${j}`} className={cn(
                    "border-t min-w-0",
                    isAr ? "border-l" : "border-r",
                    printDesign === 'original' ? "border-zinc-800/10" :
                    printDesign === 'custom' ? "border-slate-50" : 
                    printDesign === 'modern' ? "border-zinc-50" : "border-black"
                  )} />)}
                  {monthDays.map((day, j) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const hasAca = academicEvents.some(e => e.date === dayStr);
                    const hasSal = salaryDates.some(e => e.date === dayStr);
                    return (
                      <div key={j} className={cn(
                        "border-t p-1 sm:p-2 flex flex-col items-center justify-center relative group min-w-0",
                        isAr ? "border-l" : "border-r",
                        printDesign === 'original' ? "border-zinc-800/10" :
                        printDesign === 'custom' ? "border-slate-50" : 
                        printDesign === 'modern' ? "border-zinc-50" : "border-black"
                      )}>
                        <div className={cn(
                          "flex flex-col items-center z-10",
                          printDateType === 'both' ? "gap-0.5" : "gap-0"
                        )}>
                          {(printDateType === 'both' || printDateType === 'gregorian') && (
                            <span className={cn(
                              "font-bold leading-none",
                              printDateType === 'gregorian' ? "text-lg print:text-xl" : "text-[11px] print:text-[12px]",
                              printDesign === 'original' ? "text-zinc-100" :
                              printDesign === 'custom' ? "text-slate-900" : 
                              printDesign === 'modern' ? "text-zinc-900" : "text-black"
                            )}>{format(day, 'd')}</span>
                          )}
                          {(printDateType === 'both' || printDateType === 'hijri') && (
                            <span className={cn(
                              "font-bold leading-none font-secondary",
                              printDateType === 'hijri' ? "text-lg print:text-xl opacity-100" : "text-[8px] print:text-[10px] opacity-40",
                              printDesign === 'original' ? "text-zinc-400" :
                              printDesign === 'custom' ? "text-slate-500" : 
                              printDesign === 'modern' ? "text-zinc-500" : "text-black opacity-100"
                            )}>{getHijriDay(day)}</span>
                          )}
                        </div>
                        
                        <div className="absolute bottom-1 flex gap-1">
                          {hasSal && <div className={cn(
                            "w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full", 
                            printDesign === 'original' ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" : 
                            printDesign === 'custom' ? "bg-emerald-500" : 
                            printDesign === 'modern' ? "bg-emerald-500" : "bg-black"
                          )} />}
                          {hasAca && <div className={cn(
                            "w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full", 
                            printDesign === 'original' ? "bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]" : 
                            printDesign === 'custom' ? "bg-indigo-500" : 
                            printDesign === 'modern' ? "bg-indigo-500" : "bg-black"
                          )} />}
                        </div>
                      </div>
                    )
                  })}
                  {endPadding.map((_, j) => <div key={`endpad-${j}`} className={cn(
                    "border-t min-w-0",
                    isAr ? "border-l" : "border-r",
                    printDesign === 'original' ? "border-zinc-800/10" :
                    printDesign === 'custom' ? "border-slate-50" : 
                    printDesign === 'modern' ? "border-zinc-50" : "border-black"
                  )} />)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer - Redesigned */}
        <div className={cn(
          "shrink-0 mt-6 text-[9px] font-bold uppercase flex items-center justify-between px-8 opacity-30",
          !isAr && "tracking-[0.4em]",
          printDesign === 'original' ? "text-zinc-500" : 
          printDesign === 'modern' ? cn("text-zinc-400", !isAr && "tracking-[0.1em]") : "text-slate-400",
          printDesign === 'general' && "text-black opacity-100"
        )}>
          <div className="flex items-center gap-4">
            <span>{isAr ? 'التقويم العام' : 'General Calendar'}</span>
            <div className="w-1 h-1 rounded-full bg-current" />
            <span>{isAr ? 'بواسطة التقويم الدراسي والرواتب' : 'By Academic & Salary Calendar'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{format(new Date(), 'yyyy')}</span>
            <div className="w-1 h-1 rounded-full bg-current" />
            <span>{isAr ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
