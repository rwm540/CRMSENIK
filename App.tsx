


import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// FIX: Added CustomerIntroduction type for the new feature.
import { User, Customer, PurchaseContract, SupportContract, Ticket, Referral, MenuItemId, TicketStatus, CustomerIntroduction, IntroductionReferral, CustomerIntroductionStatus } from './types';
import api from './src/api';
import { supabase, BUCKET_NAME } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Components and Pages
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserManagement from './pages/UserManagement';
import CustomerList from './pages/CustomerList';
import Tickets from './pages/Tickets';
import ReferralsPage from './pages/ReferralsPage';
import ReportsPage from './pages/ReportsPage';
import ContractsPage from './pages/ContractsPage';
import PurchaseContracts from './pages/PurchaseContracts';
import SupportContracts from './pages/SupportContracts';
// FIX: Added import for the new IntroductionsPage.
import IntroductionsPage from './pages/IntroductionsPage';
// FIX: Removed unused HR page imports.
import ProcessingOverlay from './components/ProcessingOverlay';
// FIX: Import parseJalaali to handle date conversions for sorting.
import { formatJalaaliDateTime, toPersianDigits, parseJalaali, parseJalaaliDateTime } from './utils/dateFormatter';
import Alert from './components/Alert';
import { calculateTicketScore } from './utils/ticketScoring';

// Helper functions for key conversion
const convertKeysToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => convertKeysToCamelCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
      acc[camelKey] = convertKeysToCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

// FIX: Corrected the snake_case conversion to handle nested arrays of objects properly.
const convertKeysToSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeysToSnakeCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            acc[snakeKey] = convertKeysToSnakeCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

// CHG: حذف عناوین صفحات منابع انسانی
const pageTitles: Record<MenuItemId, string> = {
  dashboard: 'داشبورد',
  customers: 'مدیریت مشتریان',
  users: 'مدیریت کاربران',
  contracts: 'مدیریت قرارداد ها',
  tickets: 'مدیریت تیکت‌ها',
  reports: 'گزارشات',
  referrals: 'ارجاعات',
  introductions: 'معرفی مشتریان',
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<MenuItemId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ id: number; messages: string[]; type: 'error' | 'success' }[]>([]);

  // All application data states
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseContracts, setPurchaseContracts] = useState<PurchaseContract[]>([]);
  const [supportContracts, setSupportContracts] = useState<SupportContract[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  // FIX: Added state for the new Customer Introductions feature.
  const [introductions, setIntroductions] = useState<CustomerIntroduction[]>([]);
  const [introductionReferrals, setIntroductionReferrals] = useState<IntroductionReferral[]>([]);
  // FIX: Add state to track if the referral history table exists to prevent errors.
  const [introductionReferralTableExists, setIntroductionReferralTableExists] = useState(true);
  // FIX: Removed unused HR data states.
  
  // FIX: Add refs to track changes in dependencies for ticket scoring effect.
  // FIX: Provided an initial value to useRef to fix "Expected 1 arguments, but got 0" error.
  const prevCustomersRef = useRef<Customer[] | undefined>(undefined);
  // FIX: Provided an initial value to useRef to fix "Expected 1 arguments, but got 0" error.
  const prevSupportContractsRef = useRef<SupportContract[] | undefined>(undefined);

  const addAlert = useCallback((messages: string[], type: 'error' | 'success') => {
    setAlerts(prev => [...prev, { id: Date.now() + Math.random(), messages, type }]);
  }, []);

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };


  // Centralized data fetching function
  const fetchAllData = useCallback(async () => {
    if (!currentUser) return;
    // Note: isProcessing is NOT set here. The main `isLoading` state handles the initial load.
    try {
        // Fetch core data first
        const [
            usersRes, customersRes, purchaseContractsRes,
            supportContractsRes, ticketsRes, referralsRes,
        ] = await Promise.all([
            api.get('/users?select=*&order=id.asc'),
            api.get('/customers?select=*&order=id.asc'),
            api.get('/purchase_contracts?select=*&order=id.asc'),
            api.get('/support_contracts?select=*&order=id.asc'),
            api.get('/tickets?select=*&order=id.asc'),
            api.get('/referrals?select=*,ticket:tickets(*)&order=id.asc'),
        ]);

        const camelUsers = convertKeysToCamelCase(usersRes.data);
        const camelCustomers = convertKeysToCamelCase(customersRes.data);
        const camelPurchaseContracts = convertKeysToCamelCase(purchaseContractsRes.data);
        const camelSupportContracts = convertKeysToCamelCase(supportContractsRes.data);

        // Score and sort tickets using newly fetched data to break dependency cycle
        const camelTickets = convertKeysToCamelCase(ticketsRes.data);
        const scoredTickets = camelTickets.map((ticket: Ticket) => ({
            ...ticket,
            score: calculateTicketScore(ticket, camelCustomers, camelSupportContracts),
        }));

        scoredTickets.sort((a: Ticket, b: Ticket) => {
            if ((a.score ?? 999) !== (b.score ?? 999)) {
                return (a.score ?? 999) - (b.score ?? 999);
            }
            const dateA = parseJalaaliDateTime(a.creationDateTime)?.getTime() || 0;
            const dateB = parseJalaaliDateTime(b.creationDateTime)?.getTime() || 0;
            return dateB - dateA; // Sort by creation date descending as a tie-breaker
        });
        
        setUsers(camelUsers);
        setCustomers(camelCustomers);
        setPurchaseContracts(camelPurchaseContracts);
        setSupportContracts(camelSupportContracts);
        setTickets(scoredTickets);
        
        const camelReferrals = convertKeysToCamelCase(referralsRes.data).map((ref: any) => {
            if (ref.ticket) {
                ref.ticket = convertKeysToCamelCase(ref.ticket);
            } else {
                ref.ticket = scoredTickets.find((t: Ticket) => t.id === ref.ticketId) || ref.ticket;
            }
            return ref;
        });
        setReferrals(camelReferrals);

    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
        addAlert(['خطا در دریافت اطلاعات اصلی.', errorMessage], 'error');
        console.error("خطا در دریافت اطلاعات اصلی:", errorMessage);
    }

    // Separately fetch introductions data to handle potential errors gracefully
    try {
        const introductionsRes = await api.get('/customer_introductions?select=*&order=created_at.desc');
        setIntroductions(convertKeysToCamelCase(introductionsRes.data));
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || '';
        const isMissingTableError = errorMessage.includes("relation \"public.customer_introductions\" does not exist") || errorMessage.includes("Could not find the table");

        if (isMissingTableError) {
             addAlert([
                'جدول "معرفی مشتریان" یافت نشد!', 
                'برای فعال‌سازی این بخش، لازم است جدول مربوطه در پایگاه داده شما ایجاد شود.',
                'لطفا اسکریپت SQL مربوط به ساخت جدول را در Supabase اجرا کنید.'
            ], 'error');
            console.error("خطا: جدول customer_introductions وجود ندارد.");
        } else {
            addAlert(['خطا در دریافت اطلاعات معرفی مشتریان.', errorMessage], 'error');
            console.error("خطا در دریافت اطلاعات معرفی مشتریان:", errorMessage);
        }
    }
    
    // Fetch introduction referrals history only if we believe the table exists.
    if (introductionReferralTableExists) {
        try {
            const introReferralsRes = await api.get('/introduction_referrals?select=*,introduction:customer_introductions(*)&order=id.asc');
            setIntroductionReferrals(convertKeysToCamelCase(introReferralsRes.data));
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || '';
            // FIX: Improve error detection and set a flag to disable the feature if the table is missing.
            const isMissingTableError = errorMessage.includes("relation \"public.introduction_referrals\" does not exist") || errorMessage.includes("Could not find the table");
            if(isMissingTableError) {
                 console.warn("جدول تاریخچه ارجاعات معرفی (introduction_referrals) وجود ندارد. ویژگی تاریخچه غیرفعال شد.");
                 setIntroductionReferralTableExists(false);
            } else {
                console.error("خطا در دریافت تاریخچه ارجاعات معرفی:", errorMessage);
            }
        }
    }
  }, [currentUser, addAlert, introductionReferralTableExists]);

  // Session management: Check for a valid session on initial load
  useEffect(() => {
    const checkSession = () => {
        try {
            const sessionDataString = localStorage.getItem('crm_session');
            if (sessionDataString) {
                const { user, loginTimestamp } = JSON.parse(sessionDataString);
                const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000;
                
                if (Date.now() - loginTimestamp < threeDaysInMillis) {
                    // Session is valid. Set the user. Data fetching will be triggered by another useEffect.
                    setCurrentUser(user);
                } else {
                    // Session expired, stop loading and show login page.
                    localStorage.removeItem('crm_session');
                    setIsLoading(false);
                }
            } else {
                 // No session found, stop loading and show login page.
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Failed to parse session data from localStorage", error);
            localStorage.removeItem('crm_session');
            setIsLoading(false); // Stop loading on error
        }
    };
    checkSession();
  }, []); // Empty dependency array ensures this runs only once on mount

  // This effect runs when `currentUser` is set (either from session or from login).
  useEffect(() => {
    const performInitialFetch = async () => {
      // If a user is set, fetch their data.
      if (currentUser) {
        await fetchAllData();
        // Once data is fetched, hide the main loader.
        setIsLoading(false);
      }
    };
    performInitialFetch();
  }, [currentUser, fetchAllData]);
  
  // Centralized function for sorting and scoring tickets
  const sortAndScoreTickets = useCallback((ticketArr: Ticket[]) => {
    const scoredTickets = ticketArr.map(ticket => ({
        ...ticket,
        score: calculateTicketScore(ticket, customers, supportContracts),
    }));

    scoredTickets.sort((a: Ticket, b: Ticket) => {
        if ((a.score ?? 999) !== (b.score ?? 999)) {
            return (a.score ?? 999) - (b.score ?? 999);
        }
        const dateA = parseJalaaliDateTime(a.creationDateTime)?.getTime() || 0;
        const dateB = parseJalaaliDateTime(b.creationDateTime)?.getTime() || 0;
        return dateB - dateA; // Sort by creation date descending as a tie-breaker
    });
    return scoredTickets;
  }, [customers, supportContracts]);
  
  // FIX: This effect re-scores and re-sorts all tickets whenever the underlying data
  // (customers or support contracts) changes. This ensures ticket scores are always up-to-date.
  useEffect(() => {
    // Don't run on initial load or while another process is running, as data is still changing.
    if (isLoading || isProcessing) return;
    
    // Check if the dependencies have actually changed since the last run to prevent infinite loops.
    // FIX: Simplified state update and corrected function call.
    if (prevCustomersRef.current !== customers || prevSupportContractsRef.current !== supportContracts) {
        // FIX: Replaced problematic shorthand functional update with an explicit one to resolve error.
        setTickets(currentTickets => sortAndScoreTickets(currentTickets));
    }

    // Update the refs for the next render.
    // FIX: Corrected assignment to ref's .current property.
    prevCustomersRef.current = customers;
    prevSupportContractsRef.current = supportContracts;
  }, [customers, supportContracts, isLoading, isProcessing, sortAndScoreTickets]);


   useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // A unified function to update a ticket across all relevant states and re-sort
  const updateTicketInState = useCallback((updatedTicket: Ticket) => {
      setTickets(prev => sortAndScoreTickets(prev.map(t => t.id === updatedTicket.id ? updatedTicket : t)));
      setReferrals(prev => prev.map(r => 
          r.ticket.id === updatedTicket.id 
              ? { ...r, ticket: updatedTicket } // Note: nested ticket won't have score until next full re-render
              : r
      ));
  }, [sortAndScoreTickets]);

  // Realtime data synchronization
  useEffect(() => {
    if (!currentUser) return;

    const createRealtimeHandler = <T extends { id: number }>(
        setState: React.Dispatch<React.SetStateAction<T[]>>
    ) => (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        const processRecord = (record: any) => convertKeysToCamelCase(record) as T;

        if (eventType === 'INSERT') {
            setState(prev => [processRecord(newRecord), ...prev.filter(item => item.id !== newRecord.id)]);
        } else if (eventType === 'UPDATE') {
            setState(prev => prev.map(item => item.id === newRecord.id ? processRecord(newRecord) : item));
        } else if (eventType === 'DELETE') {
            const id = oldRecord.id;
            setState(prev => prev.filter(item => item.id !== id));
        }
    };
    
    const handleTicketChange = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const processTicket = (record: any) => convertKeysToCamelCase(record) as Ticket;

        if (eventType === 'INSERT') {
            const newTicket = processTicket(newRecord);
            setTickets(prev => sortAndScoreTickets([...prev.filter(t => t.id !== newTicket.id), newTicket]));
        } else if (eventType === 'UPDATE') {
            const updatedTicket = processTicket(newRecord);
            updateTicketInState(updatedTicket);
        } else if (eventType === 'DELETE') {
            const id = oldRecord.id;
            setTickets(prev => prev.filter(t => t.id !== id));
            setReferrals(prev => prev.filter(r => r.ticketId !== id));
        }
    };
    
    const handleReferralChange = async (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const recordId = newRecord.id;
            try {
                const { data } = await api.get(`/referrals?id=eq.${recordId}&select=*,ticket:tickets(*)`);
                if (data && data.length > 0) {
                    const fullReferral = convertKeysToCamelCase(data[0]);
                    if (fullReferral.ticket) {
                        fullReferral.ticket = convertKeysToCamelCase(fullReferral.ticket);
                    }
                    
                    if (eventType === 'INSERT') {
                        setReferrals(prev => [...prev.filter(r => r.id !== fullReferral.id), fullReferral]);
                    } else { // UPDATE
                        setReferrals(prev => prev.map(r => r.id === fullReferral.id ? fullReferral : r));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch full referral on realtime update:", error);
            }
        } else if (eventType === 'DELETE') {
            const id = oldRecord.id;
            setReferrals(prev => prev.filter(r => r.id !== id));
        }
    };

    const introSortFn = (a: CustomerIntroduction, b: CustomerIntroduction) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (parseJalaali(a.introductionDate)?.getTime() || 0);
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (parseJalaali(b.introductionDate)?.getTime() || 0);
        return dateB - dateA;
    };

    const handleIntroductionChange = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const processRecord = (record: any) => convertKeysToCamelCase(record) as CustomerIntroduction;

        if (eventType === 'INSERT') {
            setIntroductions(prev => 
                [...prev.filter(item => item.id !== newRecord.id), processRecord(newRecord)]
                .sort(introSortFn)
            );
        } else if (eventType === 'UPDATE') {
            setIntroductions(prev => 
                prev.map(item => item.id === newRecord.id ? processRecord(newRecord) : item)
                .sort(introSortFn)
            );
        } else if (eventType === 'DELETE') {
            const id = oldRecord.id;
            setIntroductions(prev => prev.filter(item => item.id !== id));
        }
    };


    const channels: RealtimeChannel[] = [];
    channels.push(supabase.channel('public:users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, createRealtimeHandler(setUsers)).subscribe());
    channels.push(supabase.channel('public:customers').on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, createRealtimeHandler(setCustomers)).subscribe());
    channels.push(supabase.channel('public:purchase_contracts').on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_contracts' }, createRealtimeHandler(setPurchaseContracts)).subscribe());
    channels.push(supabase.channel('public:support_contracts').on('postgres_changes', { event: '*', schema: 'public', table: 'support_contracts' }, createRealtimeHandler(setSupportContracts)).subscribe());
    channels.push(supabase.channel('public:tickets').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, handleTicketChange).subscribe());
    channels.push(supabase.channel('public:referrals').on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, handleReferralChange).subscribe());
    channels.push(supabase.channel('public:customer_introductions').on('postgres_changes', { event: '*', schema: 'public', table: 'customer_introductions' }, handleIntroductionChange).subscribe());
    // FIX: Conditionally subscribe to referral history table.
    if (introductionReferralTableExists) {
      channels.push(supabase.channel('public:introduction_referrals').on('postgres_changes', { event: '*', schema: 'public', table: 'introduction_referrals' }, createRealtimeHandler(setIntroductionReferrals)).subscribe());
    }
    // FIX: Removed realtime subscriptions for HR tables.

    return () => {
        channels.forEach(channel => supabase.removeChannel(channel));
    };
}, [currentUser, updateTicketInState, sortAndScoreTickets, introductionReferralTableExists]);


  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    // The login page has its own internal loading state for the button.
    try {
      const { data, status } = await api.get(`/users?username=eq.${username}&password=eq.${password}&select=*`);
      if (status === 200 && data && data.length > 0) {
        const loggedInUser = convertKeysToCamelCase(data[0]);
        
        const sessionData = {
            user: loggedInUser,
            loginTimestamp: Date.now()
        };
        localStorage.setItem('crm_session', JSON.stringify(sessionData));

        // Show the main app loader BEFORE setting the user.
        setIsLoading(true);
        // Set the user. This will trigger the performInitialFetch useEffect.
        setCurrentUser(loggedInUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('خطای ورود:', error);
      return false;
    }
  };

  const handleLogout = () => {
    // Clear session from localStorage on logout
    localStorage.removeItem('crm_session');
    setCurrentUser(null);
    setActivePage('dashboard');
  };

  // --- START CRUD Handlers (wrapped in useCallback) ---
  
  // FIX: Updated user handlers to manually update state, making the UI responsive
  // even if realtime is not configured correctly (e.g., due to RLS policies).
  const handleSaveUser = useCallback(async (user: User | Omit<User, 'id'>) => {
    setIsProcessing(true);
    try {
        const payload = convertKeysToSnakeCase(user);
        const isEditing = 'id' in user;
        if (isEditing) {
            const { id, ...updateData } = payload;
            const { data } = await api.patch(`/users?id=eq.${id}`, updateData, { headers: { 'Prefer': 'return=representation' } });
            const updatedUser = convertKeysToCamelCase(data[0]);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        } else {
            const { data } = await api.post('/users', payload, { headers: { 'Prefer': 'return=representation' } });
            const newUser = convertKeysToCamelCase(data[0]);
            setUsers(prev => [...prev, newUser]);
        }
        addAlert([`کاربر با موفقیت ${isEditing ? 'ویرایش' : 'ذخیره'} شد.`], 'success');
    } catch (error: any) { 
      const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
      addAlert(['خطا در ذخیره کاربر.', errorMessage], 'error');
      console.error("خطا در ذخیره کاربر:", errorMessage);
    } finally { setIsProcessing(false); }
  }, [addAlert]);
  
  const handleDeleteUser = useCallback(async (userId: number) => {
    if (userId === currentUser?.id) {
        addAlert(['شما نمی‌توانید حساب کاربری خود را حذف کنید.'], 'error');
        return;
    }
    setIsProcessing(true);
    try { 
      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete) throw new Error('کاربر برای حذف یافت نشد.');
      const usernameToDelete = userToDelete.username;

      await api.delete(`/referrals?referred_by_username=eq.${usernameToDelete}`);
      await api.delete(`/referrals?referred_to_username=eq.${usernameToDelete}`);
      await api.patch(`/tickets?assigned_to_username=eq.${usernameToDelete}`, { assigned_to_username: null });
      await api.patch(`/purchase_contracts?salesperson_username=eq.${usernameToDelete}`, { salesperson_username: null });
      await api.patch(`/purchase_contracts?crm_responsible_username=eq.${usernameToDelete}`, { crm_responsible_username: null });
      // FIX: Added deletion of related customer introductions.
      await api.delete(`/customer_introductions?introducer_username=eq.${usernameToDelete}`);
      await api.delete(`/customer_introductions?assigned_to_username=eq.${usernameToDelete}`);

      await api.delete(`/users?id=eq.${userId}`); 
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      addAlert(['کاربر با موفقیت حذف شد.'], 'success');
    } catch (error: any) { 
      const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
      addAlert(['خطا در حذف کاربر.', errorMessage], 'error');
    } finally { setIsProcessing(false); }
  }, [users, currentUser, addAlert]);

  const handleDeleteManyUsers = useCallback(async (userIds: number[]) => {
    if (userIds.includes(currentUser?.id ?? -1)) {
        addAlert(['شما نمی‌توانید حساب کاربری خود را در حذف گروهی انتخاب کنید.'], 'error');
        return;
    }
    setIsProcessing(true);
    try { 
      const usersToDelete = users.filter(u => userIds.includes(u.id));
      if (usersToDelete.length === 0) {
        setIsProcessing(false);
        return;
      }
      const usernamesToDelete = usersToDelete.map(u => u.username);
      const usernamesQuery = `in.(${usernamesToDelete.join(',')})`;
      const userIdsQuery = `in.(${userIds.join(',')})`;

      await api.delete(`/referrals?referred_by_username=${usernamesQuery}`);
      await api.delete(`/referrals?referred_to_username=${usernamesQuery}`);
      await api.patch(`/tickets?assigned_to_username=${usernamesQuery}`, { assigned_to_username: null });
      await api.patch(`/purchase_contracts?salesperson_username=${usernamesQuery}`, { salesperson_username: null });
      await api.patch(`/purchase_contracts?crm_responsible_username=${usernamesQuery}`, { crm_responsible_username: null });
       // FIX: Added deletion of related customer introductions.
      await api.delete(`/customer_introductions?introducer_username=${usernamesQuery}`);
      await api.delete(`/customer_introductions?assigned_to_username=${usernamesQuery}`);

      await api.delete(`/users?id=${userIdsQuery}`); 
      
      setUsers(prev => prev.filter(u => !userIds.includes(u.id)));
      addAlert([`${toPersianDigits(userIds.length)} کاربر با موفقیت حذف شدند.`], 'success');
    } catch (error: any) { 
      const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
      addAlert(['خطا در حذف گروهی کاربران.', errorMessage], 'error');
    } finally { setIsProcessing(false); }
  }, [users, currentUser, addAlert]);

  const useGenericCrudHandlers = <T extends {id: number}>(
    entityName: string, 
    endpoint: string,
    setState: React.Dispatch<React.SetStateAction<T[]>>,
    options?: {
      sortAfterInsert?: (a: T, b: T) => number;
      onItemUpdate?: (item: T) => void;
      // FIX: Add an onItemInsert callback to handle special logic for new items.
      onItemInsert?: (item: T) => void;
    }
  ) => {
    const onSave = useCallback(async (data: T | Omit<T, 'id'>): Promise<T> => {
        setIsProcessing(true);
        try {
            const payload = convertKeysToSnakeCase(data);
            const isEditing = 'id' in data;
            let savedItem: T;
            if (isEditing) {
                const { id, ...updateData } = payload;
                const { data: updatedData } = await api.patch(`/${endpoint}?id=eq.${id}`, updateData, { headers: { 'Prefer': 'return=representation' } });
                savedItem = convertKeysToCamelCase(updatedData[0]);
                if (options?.onItemUpdate) {
                    options.onItemUpdate(savedItem);
                } else {
                    setState(prev => prev.map(item => item.id === savedItem.id ? savedItem : item));
                }
            } else {
                const { data: newData } = await api.post(`/${endpoint}`, payload, { headers: { 'Prefer': 'return=representation' } });
                savedItem = convertKeysToCamelCase(newData[0]);
                // FIX: Use the new onItemInsert callback if provided.
                if (options?.onItemInsert) {
                    options.onItemInsert(savedItem);
                } else {
                    setState(prev => [...prev.filter(item => item.id !== savedItem.id), savedItem].sort(options?.sortAfterInsert || (() => 0)));
                }
            }
            addAlert([`${entityName} با موفقیت ${isEditing ? 'ویرایش' : 'ذخیره'} شد.`], 'success');
            return savedItem;
        } catch (error: any) { 
            const errorMessage = error.response?.data?.message || error.message;
            addAlert([`خطا در ذخیره ${entityName}.`, errorMessage], 'error');
            throw error;
        } finally { setIsProcessing(false); }
    }, [entityName, endpoint, setState, options, addAlert]);

    const onDelete = useCallback(async (id: number) => {
        setIsProcessing(true);
        try {
            await api.delete(`/${endpoint}?id=eq.${id}`);
            setState(prev => prev.filter(item => item.id !== id));
            addAlert([`${entityName} با موفقیت حذف شد.`], 'success');
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message;
            addAlert([`خطا در حذف ${entityName}.`, errorMessage], 'error');
        } finally { setIsProcessing(false); }
    }, [entityName, endpoint, setState, addAlert]);

    const onDeleteMany = useCallback(async (ids: number[]) => {
        setIsProcessing(true);
        try {
            await api.delete(`/${endpoint}?id=in.(${ids.join(',')})`);
            setState(prev => prev.filter(item => !ids.includes(item.id)));
            addAlert([`${toPersianDigits(ids.length)} ${entityName} با موفقیت حذف شدند.`], 'success');
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message;
            addAlert([`خطا در حذف گروهی ${entityName}.`, errorMessage], 'error');
        } finally { setIsProcessing(false); }
    }, [entityName, endpoint, setState, addAlert]);

    return { onSave, onDelete, onDeleteMany };
  };
  
  const { onSave: handleSaveCustomer, onDelete: handleDeleteCustomer, onDeleteMany: handleDeleteManyCustomers } = useGenericCrudHandlers<Customer>('مشتری', 'customers', setCustomers);
  
  const { onSave: handleSaveSupportContract, onDelete: handleDeleteSupportContract, onDeleteMany: handleDeleteManySupportContracts } = useGenericCrudHandlers<SupportContract>('قرارداد پشتیبانی', 'support_contracts', setSupportContracts);
  const { onSave: handleSaveIntroduction, onDelete: handleDeleteIntroduction } = useGenericCrudHandlers<CustomerIntroduction>(
    'معرفی مشتری', 
    'customer_introductions', 
    setIntroductions,
    {
      sortAfterInsert: (a: CustomerIntroduction, b: CustomerIntroduction) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (parseJalaali(a.introductionDate)?.getTime() || 0);
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (parseJalaali(b.introductionDate)?.getTime() || 0);
          return dateB - dateA;
      }
    }
  );
  
  const handleReferIntroduction = useCallback(async (introduction: CustomerIntroduction, newAssigneeUsername: string) => {
    setIsProcessing(true);
    try {
        const payload: { assigned_to_username: string; status?: CustomerIntroduction['status'] } = {
            assigned_to_username: newAssigneeUsername,
        };
        // Automatically move to "In Progress" on the first referral.
        if (introduction.status === 'جدید') {
            payload.status = 'در حال پیگیری';
        }
        
        // Update the main introduction record and get the updated data back.
        const { data: updatedIntroductionData } = await api.patch(
            `/customer_introductions?id=eq.${introduction.id}`, 
            payload,
            { headers: { 'Prefer': 'return=representation' } }
        );
        const updatedIntroduction = convertKeysToCamelCase(updatedIntroductionData[0]);

        // Manually update the local state for immediate UI feedback.
        setIntroductions(prev => prev.map(i => i.id === updatedIntroduction.id ? updatedIntroduction : i).sort((a: CustomerIntroduction, b: CustomerIntroduction) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (parseJalaali(a.introductionDate)?.getTime() || 0);
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (parseJalaali(b.introductionDate)?.getTime() || 0);
            return dateB - dateA;
        }));

        // Conditionally add to history only if the table exists.
        if (introductionReferralTableExists) {
            try {
                const referralPayload = {
                    introduction_id: introduction.id,
                    referred_by_username: currentUser?.username,
                    referred_to_username: newAssigneeUsername,
                    referral_date: new Date().toISOString()
                };
                const { data: newReferralData } = await api.post('/introduction_referrals', referralPayload, { headers: { 'Prefer': 'return=representation' } });
                const newReferral = convertKeysToCamelCase(newReferralData[0]);
                // Manually update the history state for immediate UI feedback.
                setIntroductionReferrals(prev => [...prev, newReferral]);
            } catch (error: any) {
                console.error("خطا در ثبت تاریخچه ارجاع معرفی:", error);
                const errorMessage = (error as any).response?.data?.message || '';
                const isMissingTableError = errorMessage.includes("relation \"public.introduction_referrals\" does not exist") || errorMessage.includes("Could not find the table");
                if (isMissingTableError) {
                    setIntroductionReferralTableExists(false); // Update our knowledge.
                }
            }
        }
        
        addAlert(['معرفی با موفقیت ارجاع داده شد.'], 'success');
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'خطای ناشناخته.';
        addAlert(['خطا در ارجاع معرفی.', errorMessage], 'error');
    } finally {
        setIsProcessing(false);
    }
  }, [currentUser, addAlert, introductionReferralTableExists]);
  
  // FIX: Add a specific handler for ticket insertion to ensure scoring and sorting.
  const handleInsertTicket = useCallback((newTicket: Ticket) => {
    setTickets(prev => sortAndScoreTickets([ ...prev.filter(t => t.id !== newTicket.id), newTicket ]));
  }, [sortAndScoreTickets]);

  const { onSave: handleGenericTicketSave } = useGenericCrudHandlers<Ticket>(
    'تیکت', 
    'tickets', 
    setTickets, 
    { 
        onItemUpdate: updateTicketInState,
        // FIX: Use the new custom insert handler.
        onItemInsert: handleInsertTicket,
    }
  );

  const handleSaveTicket = useCallback(async (ticketData: (Ticket | Omit<Ticket, 'id'>) & { score?: number }) => {
    setIsProcessing(true);
    try {
        const { score, ...ticketToSave } = ticketData;

        let payload: Partial<Ticket> & { id?: number } = { ...ticketToSave };
        const isEditing = 'id' in payload;

        if (!isEditing) {
            const now = new Date();
            payload = {
                ...payload,
                ticketNumber: `new-${Date.now()}`, // Consistent name for folder and ticket number initially
                creationDateTime: formatJalaaliDateTime(now),
                lastUpdateDate: formatJalaaliDateTime(now),
                editableUntil: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
            };
        } else {
            payload = { ...payload, lastUpdateDate: formatJalaaliDateTime(new Date()) };
        }
        await handleGenericTicketSave(payload as Ticket);

    } catch (error: any) {
    } finally { setIsProcessing(false); }
  }, [handleGenericTicketSave]);
  
  const handleDeleteTicket = useCallback(async (ticketId: number) => {
    setIsProcessing(true);
    try {
        const ticketToDelete = tickets.find(t => t.id === ticketId);

        if (ticketToDelete && ticketToDelete.attachments && ticketToDelete.attachments.length > 0) {
            const firstUrl = ticketToDelete.attachments[0];
            const urlParts = firstUrl.split(`/${BUCKET_NAME}/`);
            if (urlParts.length > 1) {
                const firstPath = decodeURIComponent(urlParts[1].split('?')[0]);
                const folderPath = firstPath.substring(0, firstPath.lastIndexOf('/'));

                if (folderPath) {
                    const { data: allFiles, error: listError } = await supabase.storage.from(BUCKET_NAME).list(folderPath);
                    if (allFiles && !listError && allFiles.length > 0) {
                        const allFilePaths = allFiles.map(f => `${folderPath}/${f.name}`);
                        const { error: removeError } = await supabase.storage.from(BUCKET_NAME).remove(allFilePaths);
                        if (removeError) {
                           console.error(`Could not delete files for folder ${folderPath}:`, removeError);
                        }
                    }
                }
            }
        }
        
        await api.delete(`/referrals?ticket_id=eq.${ticketId}`);
        await api.delete(`/tickets?id=eq.${ticketId}`);

        setTickets(prev => prev.filter(t => t.id !== ticketId));
        setReferrals(prev => prev.filter(r => r.ticketId !== ticketId));
        
        addAlert(['تیکت با موفقیت حذف شد.'], 'success');
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        addAlert(['خطا در حذف تیکت.', errorMessage], 'error');
    } finally { setIsProcessing(false); }
  }, [tickets, referrals, addAlert]);

  const { onSave: handleSavePurchaseContract } = useGenericCrudHandlers<PurchaseContract>('قرارداد فروش', 'purchase_contracts', setPurchaseContracts);

  const handleDeletePurchaseContract = useCallback(async (contractId: number) => {
    setIsProcessing(true);
    try {
        const contractToDelete = purchaseContracts.find(c => c.id === contractId);
        if (contractToDelete && contractToDelete.contractId) {
            const folderPath = contractToDelete.contractId;
            const { data: files, error: listError } = await supabase.storage
                .from(BUCKET_NAME)
                .list(folderPath);

            if (listError && listError.message !== 'The resource was not found') {
                console.error(`Failed to list files for contract ${folderPath}:`, listError);
            } else if (files && files.length > 0) {
                const filePaths = files.map(file => `${folderPath}/${file.name}`);
                try {
                    const { error: removeError } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);
                    if (removeError) throw removeError;
                } catch (storageError) {
                    console.error("Failed to delete contract attachments, proceeding with DB deletion:", storageError);
                }
            }
        }

        await api.delete(`/purchase_contracts?id=eq.${contractId}`);
        setPurchaseContracts(prev => prev.filter(c => c.id !== contractId));
        addAlert([`قرارداد فروش با موفقیت حذف شد.`], 'success');
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        addAlert([`خطا در حذف قرارداد فروش.`, errorMessage], 'error');
    } finally { setIsProcessing(false); }
  }, [purchaseContracts, addAlert]);
  
  const handleDeleteManyPurchaseContracts = useCallback(async (contractIds: number[]) => {
    setIsProcessing(true);
    try {
        const contractsToDelete = purchaseContracts.filter(c => contractIds.includes(c.id));
        if (contractsToDelete.length === 0) {
            setIsProcessing(false);
            return;
        }

        for (const contract of contractsToDelete) {
             if (contract && contract.contractId) {
                const folderPath = contract.contractId;
                const { data: files, error: listError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .list(folderPath);

                if (listError && listError.message !== 'The resource was not found') {
                    console.error(`Failed to list files for contract ${folderPath}:`, listError);
                } else if (files && files.length > 0) {
                    const filePaths = files.map(file => `${folderPath}/${file.name}`);
                    try {
                       const { error: removeError } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);
                       if (removeError) {
                           console.error(`Could not delete files for ${folderPath}:`, removeError);
                           // Decide if you want to throw or just log
                       }
                    } catch (storageError) {
                        console.error("A general error occurred deleting attachments for a contract, proceeding with DB deletion:", storageError);
                    }
                }
            }
        }
        
        await api.delete(`/purchase_contracts?id=in.(${contractIds.join(',')})`);
        setPurchaseContracts(prev => prev.filter(c => !contractIds.includes(c.id)));
        addAlert([`${toPersianDigits(contractIds.length)} قرارداد فروش با موفقیت حذف شدند.`], 'success');
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        addAlert([`خطا در حذف گروهی قراردادهای فروش.`, errorMessage], 'error');
    } finally { setIsProcessing(false); }
  }, [purchaseContracts, addAlert]);


  const handleReferTicket = useCallback(async (ticketId: number, isFromReferral: boolean, referredBy: User, referredToUsername: string) => {
    setIsProcessing(true);
    try {
        const { data: updatedTicketData } = await api.patch(`/tickets?id=eq.${ticketId}`, { status: 'ارجاع شده', assigned_to_username: referredToUsername }, { headers: { 'Prefer': 'return=representation' }});
        const updatedTicket = convertKeysToCamelCase(updatedTicketData[0]);
        updateTicketInState(updatedTicket);
        
        const referralPayload = {
            ticket_id: ticketId,
            referred_by_username: referredBy.username,
            referred_to_username: referredToUsername,
            referral_date: new Date().toISOString()
        };
        await api.post('/referrals', referralPayload);
        addAlert([`تیکت با موفقیت ارجاع داده شد.`], 'success');
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        addAlert(['خطا در ارجاع تیکت.', errorMessage], 'error');
    } finally { setIsProcessing(false); }
  }, [updateTicketInState, addAlert]);

  const handleToggleWork = useCallback(async (ticketId: number) => {
      setIsProcessing(true);
      try {
        const ticket = tickets.find(t => t.id === ticketId) || referrals.find(r => r.ticket.id === ticketId)?.ticket;
        if (!ticket) return;

        let newStatus: TicketStatus;
        let workSessionStartedAt: string | null = ticket.workSessionStartedAt || null;
        let totalWorkDuration = ticket.totalWorkDuration || 0;

        if (ticket.status === 'در حال پیگیری') {
            newStatus = 'اتمام یافته';
            if (workSessionStartedAt) {
                totalWorkDuration += Math.floor((new Date().getTime() - new Date(workSessionStartedAt).getTime()) / 1000);
            }
            workSessionStartedAt = null;
        } else {
            newStatus = 'در حال پیگیری';
            workSessionStartedAt = new Date().toISOString();
        }

        const { data: updatedTicketData } = await api.patch(`/tickets?id=eq.${ticketId}`, { status: newStatus, work_session_started_at: workSessionStartedAt, total_work_duration: totalWorkDuration }, { headers: { 'Prefer': 'return=representation' }});
        const updatedTicket = convertKeysToCamelCase(updatedTicketData[0]);
        updateTicketInState(updatedTicket);
        addAlert([`وضعیت تیکت با موفقیت تغییر کرد.`], 'success');
      } catch(e) {
         addAlert(['خطا در تغییر وضعیت تیکت.'], 'error');
      } finally { setIsProcessing(false); }
  }, [tickets, referrals, updateTicketInState, addAlert]);

  const handleReopenTicket = useCallback(async (ticketId: number) => {
      setIsProcessing(true);
      try {
        const { data: updatedTicketData } = await api.patch(`/tickets?id=eq.${ticketId}`, { status: 'انجام نشده' }, { headers: { 'Prefer': 'return=representation' }});
        const updatedTicket = convertKeysToCamelCase(updatedTicketData[0]);
        updateTicketInState(updatedTicket);
        addAlert(['تیکت با موفقیت مجدداً باز شد.'], 'success');
      } catch (e) {
        addAlert(['خطا در باز کردن مجدد تیکت.'], 'error');
      } finally { setIsProcessing(false); }
  }, [updateTicketInState, addAlert]);
  
  const handleExtendEditTime = useCallback(async (ticketId: number) => {
      setIsProcessing(true);
      try {
        const newEditableUntil = new Date(new Date().getTime() + 30 * 60 * 1000).toISOString();
        const { data: updatedTicketData } = await api.patch(
            `/tickets?id=eq.${ticketId}`,
            { editable_until: newEditableUntil },
            { headers: { 'Prefer': 'return=representation' } }
        );
        const updatedTicket = convertKeysToCamelCase(updatedTicketData[0]);
        updateTicketInState(updatedTicket);
        addAlert(['زمان ویرایش تیکت برای ۳۰ دقیقه دیگر تمدید شد.'], 'success');
      } catch (e) {
        addAlert(['خطا در تمدید زمان ویرایش.'], 'error');
      } finally { setIsProcessing(false); }
  }, [updateTicketInState, addAlert]);
  
  const handleDeleteManyTickets = useCallback(async (ticketIds: number[]) => {
    setIsProcessing(true);
    try {
      const ticketsToDelete = tickets.filter(t => ticketIds.includes(t.id));
      if (ticketsToDelete.length === 0) {
        setIsProcessing(false);
        return;
      }

      for (const ticket of ticketsToDelete) {
         if (ticket && ticket.attachments && ticket.attachments.length > 0) {
            const firstUrl = ticket.attachments[0];
            const urlParts = firstUrl.split(`/${BUCKET_NAME}/`);
            if (urlParts.length > 1) {
                const firstPath = decodeURIComponent(urlParts[1].split('?')[0]);
                const folderPath = firstPath.substring(0, firstPath.lastIndexOf('/'));

                if (folderPath) {
                    const { data: allFiles, error: listError } = await supabase.storage.from(BUCKET_NAME).list(folderPath);
                    if (allFiles && !listError && allFiles.length > 0) {
                        const allFilePaths = allFiles.map(f => `${folderPath}/${f.name}`);
                        const { error: removeError } = await supabase.storage.from(BUCKET_NAME).remove(allFilePaths);
                        if (removeError) {
                            console.error(`Could not delete files for folder ${folderPath}:`, removeError);
                        }
                    }
                }
            }
         }
      }

      const idsQuery = `in.(${ticketIds.join(',')})`;
      await api.delete(`/referrals?ticket_id=${idsQuery}`);
      await api.delete(`/tickets?id=${idsQuery}`);
      
      setTickets(prev => prev.filter(t => !ticketIds.includes(t.id)));
      setReferrals(prev => prev.filter(r => !ticketIds.includes(r.ticketId)));

      addAlert([`${toPersianDigits(ticketIds.length)} تیکت با موفقیت حذف شدند.`], 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
      addAlert(['خطا در حذف گروهی تیکت‌ها.', errorMessage], 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [tickets, referrals, addAlert]);

  const handleSetStatusManyTickets = useCallback(async (ticketIds: number[], status: TicketStatus) => {
    setIsProcessing(true);
    try {
        const idsQuery = `in.(${ticketIds.join(',')})`;
        const payload = {
            status,
            work_session_started_at: null,
            last_update_date: formatJalaaliDateTime(new Date())
        };

        const { data: updatedTicketsData } = await api.patch(`/tickets?id=${idsQuery}`, convertKeysToSnakeCase(payload), { headers: { 'Prefer': 'return=representation' } });
        
        // FIX: Add explicit type annotation to resolve type inference issues.
        const updatedTickets: Ticket[] = convertKeysToCamelCase(updatedTicketsData);
        const updatedTicketMap = new Map(updatedTickets.map((t: Ticket) => [t.id, t]));
        
        setTickets(prev => sortAndScoreTickets(prev.map(t => updatedTicketMap.get(t.id) || t)));

        setReferrals(prev => prev.map(r => {
            const updatedTicket = updatedTickets.find((t: Ticket) => t.id === r.ticket.id);
            return updatedTicket ? { ...r, ticket: updatedTicket } : r;
        }));
        
        addAlert([`${toPersianDigits(ticketIds.length)} تیکت با موفقیت به وضعیت "${status}" تغییر یافت.`], 'success');
    } catch (error: any) { 
        const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
        addAlert(['خطا در تغییر وضعیت گروهی تیکت‌ها.', errorMessage], 'error');
    } finally { setIsProcessing(false); }
  }, [addAlert, sortAndScoreTickets]);

  // --- END CRUD Handlers ---

  const renderPage = () => {
    if (!currentUser) return null;
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage users={users} customers={customers} purchaseContracts={purchaseContracts} supportContracts={supportContracts} tickets={tickets} referrals={referrals} />;
      case 'users':
        return <UserManagement users={users} onSave={handleSaveUser} onDelete={handleDeleteUser} onDeleteMany={handleDeleteManyUsers} currentUser={currentUser} />;
      case 'customers':
        return <CustomerList customers={customers} introductions={introductions} onSave={handleSaveCustomer} onDelete={handleDeleteCustomer} onDeleteMany={handleDeleteManyCustomers} currentUser={currentUser} />;
      case 'contracts':
        return (
            <ContractsPage 
                purchaseContracts={purchaseContracts}
                supportContracts={supportContracts}
                users={users}
                customers={customers}
                onSavePurchaseContract={handleSavePurchaseContract}
                onDeletePurchaseContract={handleDeletePurchaseContract}
                onDeleteManyPurchaseContracts={handleDeleteManyPurchaseContracts}
                onSaveSupportContract={handleSaveSupportContract}
                onDeleteSupportContract={handleDeleteSupportContract}
                onDeleteManySupportContracts={handleDeleteManySupportContracts}
                currentUser={currentUser}
            />
        );
      case 'tickets':
        return <Tickets tickets={tickets} referrals={referrals} customers={customers} users={users} supportContracts={supportContracts} onSave={handleSaveTicket} onReferTicket={handleReferTicket} onToggleWork={handleToggleWork} onDeleteTicket={handleDeleteTicket} onReopenTicket={handleReopenTicket} onExtendEditTime={handleExtendEditTime} currentUser={currentUser} onDeleteManyTickets={handleDeleteManyTickets} onSetStatusManyTickets={handleSetStatusManyTickets} />;
      case 'reports':
        return <ReportsPage customers={customers} users={users} purchaseContracts={purchaseContracts} supportContracts={supportContracts} tickets={tickets} currentUser={currentUser} />;
      case 'referrals':
        return <ReferralsPage referrals={referrals} currentUser={currentUser} users={users} customers={customers} supportContracts={supportContracts} tickets={tickets} onSave={handleSaveTicket} onReferTicket={handleReferTicket} onToggleWork={handleToggleWork} onExtendEditTime={handleExtendEditTime} />;
      // FIX: Added case for the new introductions page.
      case 'introductions':
        const introductionsForUser = introductions.filter(intro => {
          // Manager can see all introductions
          if (currentUser.role === 'مدیر') {
            return true;
          }
          // Others see intros they created OR are assigned to.
          return intro.introducerUsername === currentUser.username || intro.assignedToUsername === currentUser.username;
        });
        return <IntroductionsPage 
            introductions={introductionsForUser} 
            users={users} 
            customers={customers}
            onSaveIntroduction={handleSaveIntroduction} 
            onDeleteIntroduction={handleDeleteIntroduction} 
            currentUser={currentUser} 
            onReferIntroduction={handleReferIntroduction} 
            introductionReferrals={introductionReferrals}
            onSaveCustomer={handleSaveCustomer}
        />;
      // FIX: Removed unused HR page cases.
      default:
        return <DashboardPage users={users} customers={customers} purchaseContracts={purchaseContracts} supportContracts={supportContracts} tickets={tickets} referrals={referrals} />;
    }
  };
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50">
        <span className="loader !border-cyan-600"></span>
      </div>
    );
  }

  return (
    <>
      <ProcessingOverlay isVisible={isProcessing} />
      <div className="fixed top-5 left-5 z-[9999] space-y-3">
        {alerts.map(alert => (
          <Alert 
            key={alert.id}
            messages={alert.messages} 
            type={alert.type} 
            onClose={() => removeAlert(alert.id)} 
          />
        ))}
      </div>
      {currentUser ? (
        <div className="h-screen flex bg-gray-100">
          <Sidebar 
            activePage={activePage} 
            setActivePage={(page) => setActivePage(page as MenuItemId)} 
            isSidebarOpen={isSidebarOpen} 
            user={currentUser} 
            onLogout={handleLogout}
            onClose={() => setIsSidebarOpen(false)}
          />
           {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-30 lg:hidden"></div>}
          <div className="flex-1 flex flex-col overflow-y-auto w-0">
            <Header pageTitle={pageTitles[activePage]} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            {renderPage()}
          </div>
        </div>
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </>
  );
};

export default App;