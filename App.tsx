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
// CHG: Removed ProcessingOverlay as it's replaced by localized loaders.
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
  const [isAuthenticating, setIsAuthenticating] = useState(false); // Simplified to one loading state
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(false);

  const [alerts, setAlerts] = useState<{ id: number; messages: string[]; type: 'error' | 'success' }[]>([]);

  // All application data states
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseContracts, setPurchaseContracts] = useState<PurchaseContract[]>([]);
  const [supportContracts, setSupportContracts] = useState<SupportContract[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [introductions, setIntroductions] = useState<CustomerIntroduction[]>([]);
  const [introductionReferrals, setIntroductionReferrals] = useState<IntroductionReferral[]>([]);
  const [introductionReferralTableExists, setIntroductionReferralTableExists] = useState(true);
  
  const prevCustomersRef = useRef<Customer[] | undefined>(undefined);
  const prevSupportContractsRef = useRef<SupportContract[] | undefined>(undefined);

  const addAlert = useCallback((messages: string[], type: 'error' | 'success') => {
    setAlerts(prev => [...prev, { id: Date.now() + Math.random(), messages, type }]);
  }, []);

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };


  const fetchAllData = useCallback(async () => {
    if (!currentUser) return;
    setIsInitialDataLoading(true);
    
    try {
        const results = await Promise.allSettled([
            api.get('/users?select=*&order=id.asc'),
            api.get('/customers?select=*&order=id.asc'),
            api.get('/purchase_contracts?select=*&order=id.asc'),
            api.get('/support_contracts?select=*&order=id.asc'),
            api.get('/tickets?select=*&order=id.asc'),
            api.get('/referrals?select=*,ticket:tickets(*)&order=id.asc'),
            api.get('/customer_introductions?select=*&order=created_at.desc'),
            introductionReferralTableExists ? api.get('/introduction_referrals?select=*,introduction:customer_introductions(*)&order=id.asc') : Promise.resolve(null),
        ]);

        const [
            usersRes, customersRes, purchaseContractsRes, supportContractsRes, 
            ticketsRes, referralsRes, introductionsRes, introReferralsRes
        ] = results;

        const camelUsers = usersRes.status === 'fulfilled' ? convertKeysToCamelCase(usersRes.value.data) : [];
        const camelCustomers = customersRes.status === 'fulfilled' ? convertKeysToCamelCase(customersRes.value.data) : [];
        const camelPurchaseContracts = purchaseContractsRes.status === 'fulfilled' ? convertKeysToCamelCase(purchaseContractsRes.value.data) : [];
        const camelSupportContracts = supportContractsRes.status === 'fulfilled' ? convertKeysToCamelCase(supportContractsRes.value.data) : [];

        setUsers(camelUsers);
        setCustomers(camelCustomers);
        setPurchaseContracts(camelPurchaseContracts);
        setSupportContracts(camelSupportContracts);
        
        if (ticketsRes.status === 'fulfilled') {
            const camelTickets = convertKeysToCamelCase(ticketsRes.value.data);
            const scoredTickets = camelTickets.map((ticket: Ticket) => ({
                ...ticket,
                score: calculateTicketScore(ticket, camelCustomers, camelSupportContracts),
            }));
            scoredTickets.sort((a: Ticket, b: Ticket) => {
                if ((a.score ?? 999) !== (b.score ?? 999)) return (a.score ?? 999) - (b.score ?? 999);
                const dateA = parseJalaaliDateTime(a.creationDateTime)?.getTime() || 0;
                const dateB = parseJalaaliDateTime(b.creationDateTime)?.getTime() || 0;
                return dateB - dateA;
            });
            setTickets(scoredTickets);
            
            if (referralsRes.status === 'fulfilled') {
                const camelReferrals = convertKeysToCamelCase(referralsRes.value.data).map((ref: any) => {
                    if (ref.ticket) {
                        ref.ticket = convertKeysToCamelCase(ref.ticket);
                    } else {
                        ref.ticket = scoredTickets.find((t: Ticket) => t.id === ref.ticketId) || ref.ticket;
                    }
                    return ref;
                });
                setReferrals(camelReferrals);
            }
        }

        if (introductionsRes.status === 'fulfilled') {
            setIntroductions(convertKeysToCamelCase(introductionsRes.value.data));
        } else if (introductionsRes.status === 'rejected') {
            const error = introductionsRes.reason as any;
            const errorMessage = error.response?.data?.message || error.message || '';
            if (errorMessage.includes("relation \"public.customer_introductions\" does not exist")) {
                addAlert(['جدول "معرفی مشتریان" یافت نشد! برای فعال‌سازی این بخش، اسکریپت SQL مربوطه را در Supabase اجرا کنید.'], 'error');
            } else {
                addAlert(['خطا در دریافت اطلاعات معرفی مشتریان.', errorMessage], 'error');
            }
        }
        
        if (introReferralsRes.status === 'fulfilled' && introReferralsRes.value !== null) {
            setIntroductionReferrals(convertKeysToCamelCase(introReferralsRes.value.data));
        } else if (introReferralsRes.status === 'rejected') {
            const error = introReferralsRes.reason as any;
            const errorMessage = error.response?.data?.message || error.message || '';
            if (errorMessage.includes("relation \"public.introduction_referrals\" does not exist")) {
                 setIntroductionReferralTableExists(false);
            }
        }

    } catch (error) {
        addAlert(['یک خطای غیرمنتظره در هنگام بارگذاری داده‌ها رخ داد.'], 'error');
        console.error("خطا در بارگذاری اولیه:", error);
    } finally {
        setIsInitialDataLoading(false);
    }
  }, [currentUser, addAlert, introductionReferralTableExists]);

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    } else {
      setIsInitialDataLoading(false);
    }
  }, [currentUser, fetchAllData]);
  
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
  
  useEffect(() => {
    if (isAuthenticating || isInitialDataLoading) return;
    
    if (prevCustomersRef.current !== customers || prevSupportContractsRef.current !== supportContracts) {
        setTickets(currentTickets => sortAndScoreTickets(currentTickets));
    }

    prevCustomersRef.current = customers;
    prevSupportContractsRef.current = supportContracts;
  }, [customers, supportContracts, isAuthenticating, isInitialDataLoading, sortAndScoreTickets]);


   useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const updateTicketInState = useCallback((updatedTicket: Ticket) => {
      setTickets(prev => sortAndScoreTickets(prev.map(t => t.id === updatedTicket.id ? updatedTicket : t)));
      setReferrals(prev => prev.map(r => 
          r.ticket.id === updatedTicket.id 
              ? { ...r, ticket: updatedTicket }
              : r
      ));
  }, [sortAndScoreTickets]);

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
    if (introductionReferralTableExists) {
      channels.push(supabase.channel('public:introduction_referrals').on('postgres_changes', { event: '*', schema: 'public', table: 'introduction_referrals' }, createRealtimeHandler(setIntroductionReferrals)).subscribe());
    }

    return () => {
        channels.forEach(channel => supabase.removeChannel(channel));
    };
}, [currentUser, updateTicketInState, sortAndScoreTickets, introductionReferralTableExists]);

  const handleLogin = async (username: string, password: string): Promise<{ success: boolean; error?: string; }> => {
    try {
      const { data, error } = await supabase.rpc('login_user', {
        p_username: username,
        p_password: password
      });

      if (error) {
        console.error('RPC error logging in:', error);
        return { success: false, error: 'خطا در ارتباط با سرور. لطفا RLS policies و تابع login_user را بررسی کنید.' };
      }
      
      if (!data || data.length === 0) {
        return { success: false, error: 'نام کاربری یا رمز عبور اشتباه است.' };
      }

      const loggedInUser = convertKeysToCamelCase(data[0]);
      setCurrentUser(loggedInUser);
      return { success: true };
    } catch (error) {
      console.error('خطای کلی در ورود:', error);
      return { success: false, error: 'یک خطای پیش‌بینی نشده رخ داد.' };
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setActivePage('dashboard');
  };

  const handleSaveUser = useCallback(async (user: User | Omit<User, 'id'>) => {
    if (!user.accessibleMenus || user.accessibleMenus.length === 0) {
        const errorMessage = 'کاربر باید حداقل به یک منو دسترسی داشته باشد.';
        addAlert(['خطا در ذخیره کاربر.', errorMessage], 'error');
        throw new Error(errorMessage);
    }
    try {
        const { password, ...userWithoutPassword } = user as User;
        const payload = convertKeysToSnakeCase(user);
        const isEditing = 'id' in user;
        
        if (isEditing) {
            const { id, ...updateData } = payload;
            delete updateData.password; // Never update password from here
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
      throw error;
    }
  }, [addAlert]);
  
  const handleDeleteUser = useCallback(async (userId: number) => {
    if (userId === currentUser?.id) {
        addAlert(['شما نمی‌توانید حساب کاربری خود را حذف کنید.'], 'error');
        return;
    }
    try { 
      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete) throw new Error('کاربر برای حذف یافت نشد.');
      const usernameToDelete = userToDelete.username;

      await api.delete(`/referrals?referred_by_username=eq.${usernameToDelete}`);
      await api.delete(`/referrals?referred_to_username=eq.${usernameToDelete}`);
      await api.patch(`/tickets?assigned_to_username=eq.${usernameToDelete}`, { assigned_to_username: null });
      await api.patch(`/purchase_contracts?salesperson_username=eq.${usernameToDelete}`, { salesperson_username: null });
      await api.patch(`/purchase_contracts?crm_responsible_username=eq.${usernameToDelete}`, { crm_responsible_username: null });
      await api.delete(`/customer_introductions?introducer_username=eq.${usernameToDelete}`);
      await api.delete(`/customer_introductions?assigned_to_username=eq.${usernameToDelete}`);
      await api.delete(`/users?id=eq.${userId}`); 
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      addAlert([`کاربر با موفقیت حذف شد.`], 'success');
    } catch (error: any) { 
      const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
      addAlert(['خطا در حذف کاربر.', errorMessage], 'error');
    }
  }, [users, currentUser, addAlert]);

  const handleDeleteManyUsers = useCallback(async (userIds: number[]) => {
    if (userIds.includes(currentUser?.id ?? -1)) {
        addAlert(['شما نمی‌توانید حساب کاربری خود را در حذف گروهی انتخاب کنید.'], 'error');
        return;
    }
    try { 
      const usersToDelete = users.filter(u => userIds.includes(u.id));
      if (usersToDelete.length === 0) return;
      const usernamesToDelete = usersToDelete.map(u => u.username);
      const usernamesQuery = `in.(${usernamesToDelete.join(',')})`;
      const userIdsQuery = `in.(${userIds.join(',')})`;

      await api.delete(`/referrals?referred_by_username=${usernamesQuery}`);
      await api.delete(`/referrals?referred_to_username=${usernamesQuery}`);
      await api.patch(`/tickets?assigned_to_username=${usernamesQuery}`, { assigned_to_username: null });
      await api.patch(`/purchase_contracts?salesperson_username=${usernamesQuery}`, { salesperson_username: null });
      await api.patch(`/purchase_contracts?crm_responsible_username=${usernamesQuery}`, { crm_responsible_username: null });
      await api.delete(`/customer_introductions?introducer_username=${usernamesQuery}`);
      await api.delete(`/customer_introductions?assigned_to_username=${usernamesQuery}`);
      await api.delete(`/users?id=${userIdsQuery}`); 
      
      setUsers(prev => prev.filter(u => !userIds.includes(u.id)));
      addAlert([`${toPersianDigits(userIds.length)} کاربر با موفقیت حذف شدند.`], 'success');
    } catch (error: any) { 
      const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
      addAlert(['خطا در حذف گروهی کاربران.', errorMessage], 'error');
    }
  }, [users, currentUser, addAlert]);

  const useGenericCrudHandlers = <T extends {id: number}>(
    entityName: string, 
    endpoint: string,
    setState: React.Dispatch<React.SetStateAction<T[]>>,
    options?: {
      sortAfterInsert?: (a: T, b: T) => number;
      onItemUpdate?: (item: T) => void;
      onItemInsert?: (item: T) => void;
    }
  ) => {
    const onSave = useCallback(async (data: T | Omit<T, 'id'>): Promise<T> => {
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
        }
    }, [entityName, endpoint, setState, options, addAlert]);

    const onDelete = useCallback(async (id: number) => {
        try {
            await api.delete(`/${endpoint}?id=eq.${id}`);
            setState(prev => prev.filter(item => item.id !== id));
            addAlert([`${entityName} با موفقیت حذف شد.`], 'success');
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message;
            addAlert([`خطا در حذف ${entityName}.`, errorMessage], 'error');
        }
    }, [entityName, endpoint, setState, addAlert]);

    const onDeleteMany = useCallback(async (ids: number[]) => {
        try {
            await api.delete(`/${endpoint}?id=in.(${ids.join(',')})`);
            setState(prev => prev.filter(item => !ids.includes(item.id)));
            addAlert([`${toPersianDigits(ids.length)} ${entityName} با موفقیت حذف شدند.`], 'success');
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message;
            addAlert([`خطا در حذف گروهی ${entityName}.`, errorMessage], 'error');
        }
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
    try {
        const payload: { assigned_to_username: string; status?: CustomerIntroduction['status'] } = {
            assigned_to_username: newAssigneeUsername,
        };
        if (introduction.status === 'جدید') {
            payload.status = 'در حال پیگیری';
        }
        
        const { data: updatedIntroductionData } = await api.patch(
            `/customer_introductions?id=eq.${introduction.id}`, 
            payload,
            { headers: { 'Prefer': 'return=representation' } }
        );
        const updatedIntroduction = convertKeysToCamelCase(updatedIntroductionData[0]);
        setIntroductions(prev => prev.map(i => i.id === updatedIntroduction.id ? updatedIntroduction : i).sort((a: CustomerIntroduction, b: CustomerIntroduction) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (parseJalaali(a.introductionDate)?.getTime() || 0);
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (parseJalaali(b.introductionDate)?.getTime() || 0);
            return dateB - dateA;
        }));

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
                setIntroductionReferrals(prev => [...prev, newReferral]);
            } catch (error: any) {
                console.error("خطا در ثبت تاریخچه ارجاع معرفی:", error);
                const errorMessage = (error as any).response?.data?.message || '';
                if (errorMessage.includes("relation \"public.introduction_referrals\" does not exist")) {
                    setIntroductionReferralTableExists(false);
                }
            }
        }
        addAlert(['معرفی با موفقیت ارجاع داده شد.'], 'success');
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'خطای ناشناخته.';
        addAlert(['خطا در ارجاع معرفی.', errorMessage], 'error');
    }
  }, [currentUser, addAlert, introductionReferralTableExists]);
  
  const handleInsertTicket = useCallback((newTicket: Ticket) => {
    setTickets(prev => sortAndScoreTickets([ ...prev.filter(t => t.id !== newTicket.id), newTicket ]));
  }, [sortAndScoreTickets]);

  const { onSave: handleGenericTicketSave } = useGenericCrudHandlers<Ticket>(
    'تیکت', 
    'tickets', 
    setTickets, 
    { 
        onItemUpdate: updateTicketInState,
        onItemInsert: handleInsertTicket,
    }
  );

  const handleSaveTicket = useCallback(async (ticketData: (Ticket | Omit<Ticket, 'id'>) & { score?: number }) => {
    const { score, ...ticketToSave } = ticketData;
    let payload: Partial<Ticket> & { id?: number } = { ...ticketToSave };
    const isEditing = 'id' in payload;

    if (!isEditing) {
        const now = new Date();
        payload = {
            ...payload,
            ticketNumber: `new-${Date.now()}`,
            creationDateTime: formatJalaaliDateTime(now),
            lastUpdateDate: formatJalaaliDateTime(now),
            editableUntil: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        };
    } else {
        payload = { ...payload, lastUpdateDate: formatJalaaliDateTime(new Date()) };
    }
    await handleGenericTicketSave(payload as Ticket);
  }, [handleGenericTicketSave]);
  
  const handleDeleteTicket = useCallback(async (ticketId: number) => {
    try {
        const ticketToDelete = tickets.find(t => t.id === ticketId);

        if (ticketToDelete && ticketToDelete.attachments.length > 0) {
            const firstUrl = ticketToDelete.attachments[0];
            const urlParts = firstUrl.split(`/${BUCKET_NAME}/`);
            if (urlParts.length > 1) {
                const firstPath = decodeURIComponent(urlParts[1].split('?')[0]);
                const folderPath = firstPath.substring(0, firstPath.lastIndexOf('/'));
                if (folderPath) {
                    const { data: allFiles, error: listError } = await supabase.storage.from(BUCKET_NAME).list(folderPath);
                    if (allFiles && !listError && allFiles.length > 0) {
                        const allFilePaths = allFiles.map(f => `${folderPath}/${f.name}`);
                        await supabase.storage.from(BUCKET_NAME).remove(allFilePaths);
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
    }
  }, [tickets, addAlert]);

  const { onSave: handleSavePurchaseContract } = useGenericCrudHandlers<PurchaseContract>('قرارداد فروش', 'purchase_contracts', setPurchaseContracts);

  const handleDeletePurchaseContract = useCallback(async (contractId: number) => {
    try {
        const contractToDelete = purchaseContracts.find(c => c.id === contractId);
        if (contractToDelete?.contractId) {
            const folderPath = contractToDelete.contractId;
            const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list(folderPath);
            if (!listError && files && files.length > 0) {
                const filePaths = files.map(file => `${folderPath}/${file.name}`);
                await supabase.storage.from(BUCKET_NAME).remove(filePaths);
            }
        }

        await api.delete(`/purchase_contracts?id=eq.${contractId}`);
        setPurchaseContracts(prev => prev.filter(c => c.id !== contractId));
        addAlert([`قرارداد فروش با موفقیت حذف شد.`], 'success');
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        addAlert([`خطا در حذف قرارداد فروش.`, errorMessage], 'error');
    }
  }, [purchaseContracts, addAlert]);
  
  const handleDeleteManyPurchaseContracts = useCallback(async (contractIds: number[]) => {
    try {
        const contractsToDelete = purchaseContracts.filter(c => contractIds.includes(c.id));
        if (contractsToDelete.length === 0) return;
        
        for (const contract of contractsToDelete) {
             if (contract?.contractId) {
                const folderPath = contract.contractId;
                const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list(folderPath);
                if (!listError && files && files.length > 0) {
                    const filePaths = files.map(file => `${folderPath}/${file.name}`);
                    await supabase.storage.from(BUCKET_NAME).remove(filePaths);
                }
            }
        }
        
        await api.delete(`/purchase_contracts?id=in.(${contractIds.join(',')})`);
        setPurchaseContracts(prev => prev.filter(c => !contractIds.includes(c.id)));
        addAlert([`${toPersianDigits(contractIds.length)} قرارداد فروش با موفقیت حذف شدند.`], 'success');
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        addAlert([`خطا در حذف گروهی قراردادهای فروش.`, errorMessage], 'error');
    }
  }, [purchaseContracts, addAlert]);


  const handleReferTicket = useCallback(async (ticketId: number, isFromReferral: boolean, referredBy: User, referredToUsername: string) => {
    try {
        const { data: updatedTicketData } = await api.patch(`/tickets?id=eq.${ticketId}`, { status: 'ارجاع شده', assigned_to_username: referredToUsername }, { headers: { 'Prefer': 'return=representation' }});
        const updatedTicket = convertKeysToCamelCase(updatedTicketData[0]);
        updateTicketInState(updatedTicket);
        
        const referralPayload = { ticket_id: ticketId, referred_by_username: referredBy.username, referred_to_username: referredToUsername, referral_date: new Date().toISOString() };
        await api.post('/referrals', referralPayload);
        addAlert([`تیکت با موفقیت ارجاع داده شد.`], 'success');
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        addAlert(['خطا در ارجاع تیکت.', errorMessage], 'error');
    }
  }, [updateTicketInState, addAlert]);

  const handleToggleWork = useCallback(async (ticketId: number) => {
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
      }
  }, [tickets, referrals, updateTicketInState, addAlert]);

  const handleReopenTicket = useCallback(async (ticketId: number) => {
      try {
        const { data: updatedTicketData } = await api.patch(`/tickets?id=eq.${ticketId}`, { status: 'انجام نشده' }, { headers: { 'Prefer': 'return=representation' }});
        const updatedTicket = convertKeysToCamelCase(updatedTicketData[0]);
        updateTicketInState(updatedTicket);
        addAlert(['تیکت با موفقیت مجدداً باز شد.'], 'success');
      } catch (e) {
        addAlert(['خطا در باز کردن مجدد تیکت.'], 'error');
      }
  }, [updateTicketInState, addAlert]);
  
  const handleExtendEditTime = useCallback(async (ticketId: number) => {
      try {
        const newEditableUntil = new Date(new Date().getTime() + 30 * 60 * 1000).toISOString();
        const { data: updatedTicketData } = await api.patch(`/tickets?id=eq.${ticketId}`, { editable_until: newEditableUntil }, { headers: { 'Prefer': 'return=representation' } });
        const updatedTicket = convertKeysToCamelCase(updatedTicketData[0]);
        updateTicketInState(updatedTicket);
        addAlert(['زمان ویرایش تیکت برای ۳۰ دقیقه دیگر تمدید شد.'], 'success');
      } catch (e) {
        addAlert(['خطا در تمدید زمان ویرایش.'], 'error');
      }
  }, [updateTicketInState, addAlert]);
  
  const handleDeleteManyTickets = useCallback(async (ticketIds: number[]) => {
    try {
      const ticketsToDelete = tickets.filter(t => ticketIds.includes(t.id));
      if (ticketsToDelete.length === 0) return;
      
      for (const ticket of ticketsToDelete) {
         if (ticket?.attachments?.length > 0) {
            const firstUrl = ticket.attachments[0];
            const urlParts = firstUrl.split(`/${BUCKET_NAME}/`);
            if (urlParts.length > 1) {
                const firstPath = decodeURIComponent(urlParts[1].split('?')[0]);
                const folderPath = firstPath.substring(0, firstPath.lastIndexOf('/'));
                if (folderPath) {
                    const { data: allFiles, error: listError } = await supabase.storage.from(BUCKET_NAME).list(folderPath);
                    if (allFiles && !listError && allFiles.length > 0) {
                        const allFilePaths = allFiles.map(f => `${folderPath}/${f.name}`);
                        await supabase.storage.from(BUCKET_NAME).remove(allFilePaths);
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
    }
  }, [tickets, addAlert]);

  const handleSetStatusManyTickets = useCallback(async (ticketIds: number[], status: TicketStatus) => {
    try {
        const idsQuery = `in.(${ticketIds.join(',')})`;
        const payload = { status, work_session_started_at: null, last_update_date: formatJalaaliDateTime(new Date()) };
        const { data: updatedTicketsData } = await api.patch(`/tickets?id=${idsQuery}`, convertKeysToSnakeCase(payload), { headers: { 'Prefer': 'return=representation' } });
        
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
    }
  }, [addAlert, sortAndScoreTickets]);

  // --- END CRUD Handlers ---

  const renderPage = () => {
    if (!currentUser) return null;

    if (isInitialDataLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <span className="loader !border-cyan-600"></span>
        </div>
      );
    }
    
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
      case 'introductions':
        const introductionsForUser = introductions.filter(intro => {
          if (currentUser.role === 'مدیر') return true;
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
      default:
        return <DashboardPage users={users} customers={customers} purchaseContracts={purchaseContracts} supportContracts={supportContracts} tickets={tickets} referrals={referrals} />;
    }
  };
  
  if (isAuthenticating) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50">
        <span className="loader !border-cyan-600"></span>
      </div>
    );
  }

  return (
    <>
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