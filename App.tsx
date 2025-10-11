

import React, { useState, useEffect, useCallback } from 'react';
// FIX: Imported `TicketStatus` to resolve 'Cannot find name' error.
import { User, Customer, PurchaseContract, SupportContract, Ticket, Referral, MenuItemId, TicketStatus } from './types';
import api from './src/api';
import { sha256, generateOtp } from './utils/dateFormatter';

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
import PurchaseContracts from './pages/PurchaseContracts';
import SupportContracts from './pages/SupportContracts';
import ProcessingOverlay from './components/ProcessingOverlay';
import { formatJalaaliDateTime, toPersianDigits } from './utils/dateFormatter';
import Alert from './components/Alert';

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

const convertKeysToSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeysToSnakeCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (Array.isArray(obj[key])) {
              acc[snakeKey] = obj[key];
            } else {
              acc[snakeKey] = convertKeysToSnakeCase(obj[key]);
            }
            return acc;
        }, {} as any);
    }
    return obj;
};

// FIX: Added missing menu item titles to satisfy the Record<MenuItemId, string> type.
const pageTitles: Record<MenuItemId, string> = {
  dashboard: 'داشبورد',
  customers: 'مدیریت مشتریان',
  users: 'مدیریت کاربران',
  contracts: 'مدیریت قرارداد ها',
  tickets: 'مدیریت تیکت‌ها',
  reports: 'گزارشات',
  referrals: 'ارجاعات',
  attendance: 'حضور و غیاب',
  leave: 'مرخصی‌ها',
  missions: 'ماموریت‌ها',
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<MenuItemId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [globalAlert, setGlobalAlert] = useState<{ messages: string[], type: 'error' | 'success' } | null>(null);

  // All application data states
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseContracts, setPurchaseContracts] = useState<PurchaseContract[]>([]);
  const [supportContracts, setSupportContracts] = useState<SupportContract[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  // Session management: Check for a valid session on initial load
  useEffect(() => {
    const checkSession = () => {
        try {
            const sessionDataString = localStorage.getItem('crm_session');
            if (sessionDataString) {
                const { user, loginTimestamp } = JSON.parse(sessionDataString);
                const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000;
                
                // Check if session is older than 3 days
                if (Date.now() - loginTimestamp < threeDaysInMillis) {
                    setCurrentUser(user);
                } else {
                    // Session expired, clear it
                    localStorage.removeItem('crm_session');
                }
            }
        } catch (error) {
            console.error("Failed to parse session data from localStorage", error);
            // Clear corrupted session data
            localStorage.removeItem('crm_session');
        } finally {
            // Finished checking session, hide main loader
            setIsLoading(false);
        }
    };
    checkSession();
  }, []); // Empty dependency array ensures this runs only once on mount

   useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    // Initial check
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (globalAlert) {
      const timer = setTimeout(() => {
        setGlobalAlert(null);
      }, 7000); // 7 seconds for OTP visibility
      return () => clearTimeout(timer);
    }
  }, [globalAlert]);

  const fetchAllData = useCallback(async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    try {
        const [
            usersRes, customersRes, purchaseContractsRes,
            supportContractsRes, ticketsRes, referralsRes
        ] = await Promise.all([
            api.get('/users?select=*&order=id.asc'),
            api.get('/customers?select=*&order=id.asc'),
            api.get('/purchase_contracts?select=*&order=id.asc'),
            api.get('/support_contracts?select=*&order=id.asc'),
            api.get('/tickets?select=*&order=id.asc'),
            api.get('/referrals?select=*,ticket:tickets(*)&order=id.asc')
        ]);

        const camelUsers = convertKeysToCamelCase(usersRes.data);
        const camelCustomers = convertKeysToCamelCase(customersRes.data);
        const camelTickets = convertKeysToCamelCase(ticketsRes.data);

        setUsers(camelUsers);
        setCustomers(camelCustomers);
        setPurchaseContracts(convertKeysToCamelCase(purchaseContractsRes.data));
        setSupportContracts(convertKeysToCamelCase(supportContractsRes.data));
        setTickets(camelTickets);
        
        const camelReferrals = convertKeysToCamelCase(referralsRes.data).map((ref: any) => {
            if (ref.ticket) {
                ref.ticket = convertKeysToCamelCase(ref.ticket);
            } else {
                ref.ticket = camelTickets.find((t: Ticket) => t.id === ref.ticketId) || ref.ticket;
            }
            return ref;
        });
        setReferrals(camelReferrals);

    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
        setGlobalAlert({ messages: ['خطا در دریافت اطلاعات کلی.', errorMessage], type: 'error' });
        console.error("خطا در دریافت اطلاعات کلی:", errorMessage);
    } finally {
        setIsProcessing(false);
    }
  }, [currentUser]);

  // Fetch all data when a user logs in (either via session or form)
  useEffect(() => {
    if (currentUser) {
        fetchAllData();
    }
  }, [currentUser, fetchAllData]);

  const setSuccessfulLogin = (user: User) => {
    const sessionData = {
        user,
        loginTimestamp: Date.now()
    };
    localStorage.setItem('crm_session', JSON.stringify(sessionData));
    setCurrentUser(user);
  };

  const handleLogin = async (payload: { identifier: string; password?: string; }): Promise<{ success: boolean; message?: string; }> => {
    setIsProcessing(true);
    try {
        const { identifier, password } = payload;
        
        if (!password) {
          return { success: false, message: 'رمز عبور الزامی است.' };
        }

        // Only allow login with username and password
        const query = `/users?username=eq.${identifier}&password=eq.${password}&select=*`;

        const { data, status } = await api.get(query);

        if (status === 200 && data && data.length > 0) {
            const user = data[0];
            setSuccessfulLogin(convertKeysToCamelCase(user));
            return { success: true };
        }
        
        return { success: false, message: 'نام کاربری یا رمز عبور اشتباه است.' };
    } catch (error) {
        console.error('خطای ورود:', error);
        return { success: false, message: 'خطایی در سرور رخ داد.' };
    } finally {
        setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    // Clear session from localStorage on logout
    localStorage.removeItem('crm_session');
    setCurrentUser(null);
    setActivePage('dashboard');
  };

  // CRUD Handlers
  const handleSaveUser = async (user: User | Omit<User, 'id'>) => {
    setIsProcessing(true);
    try {
        const payload = convertKeysToSnakeCase(user);
        const isEditing = 'id' in user;
        if (isEditing) {
            const { id, ...updateData } = payload;
            await api.patch(`/users?id=eq.${id}`, updateData);
        } else {
            await api.post('/users', payload, { headers: { 'Prefer': 'return=minimal' } });
        }
        await fetchAllData();
        setGlobalAlert({ messages: [`کاربر با موفقیت ${isEditing ? 'ویرایش' : 'ذخیره'} شد.`], type: 'success' });
    } catch (error: any) { 
      const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
      setGlobalAlert({ messages: ['خطا در ذخیره کاربر.', errorMessage], type: 'error' });
      console.error("خطا در ذخیره کاربر:", errorMessage);
    } finally { setIsProcessing(false); }
  };
  
  const handleDeleteUser = async (userId: number) => {
    if (userId === currentUser?.id) {
        setGlobalAlert({ messages: ['شما نمی‌توانید حساب کاربری خود را حذف کنید.'], type: 'error' });
        return;
    }
    setIsProcessing(true);
    try { 
      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete) throw new Error('کاربر برای حذف یافت نشد.');
      const usernameToDelete = userToDelete.username;

      // STEP 1: Delete records with NOT-NULL constraints pointing to the user.
      await api.delete(`/referrals?referred_by_username=eq.${usernameToDelete}`);
      await api.delete(`/referrals?referred_to_username=eq.${usernameToDelete}`);

      // STEP 2: Nullify references in other tables where NULL is allowed.
      await api.patch(`/tickets?assigned_to_username=eq.${usernameToDelete}`, { assigned_to_username: null });
      await api.patch(`/purchase_contracts?salesperson_username=eq.${usernameToDelete}`, { salesperson_username: null });
      await api.patch(`/purchase_contracts?crm_responsible_username=eq.${usernameToDelete}`, { crm_responsible_username: null });
      
      // STEP 3: Delete the user itself.
      await api.delete(`/users?id=eq.${userId}`); 
      await fetchAllData(); 
      setGlobalAlert({ messages: ['کاربر با موفقیت حذف شد.'], type: 'success' });
    } catch (error: any) { 
      const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
      setGlobalAlert({ messages: ['خطا در حذف کاربر.', errorMessage], type: 'error' });
      console.error("خطای حذف کاربر:", errorMessage); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleDeleteManyUsers = async (userIds: number[]) => {
    if (userIds.includes(currentUser?.id ?? -1)) {
        setGlobalAlert({ messages: ['شما نمی‌توانید حساب کاربری خود را در حذف گروهی انتخاب کنید.'], type: 'error' });
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

      // STEP 1: Delete dependent records
      await api.delete(`/referrals?referred_by_username=${usernamesQuery}`);
      await api.delete(`/referrals?referred_to_username=${usernamesQuery}`);
      
      // STEP 2: Nullify other references
      await api.patch(`/tickets?assigned_to_username=${usernamesQuery}`, { assigned_to_username: null });
      await api.patch(`/purchase_contracts?salesperson_username=${usernamesQuery}`, { salesperson_username: null });
      await api.patch(`/purchase_contracts?crm_responsible_username=${usernamesQuery}`, { crm_responsible_username: null });
      
      // STEP 3: Delete the users
      await api.delete(`/users?id=${userIdsQuery}`); 
      
      await fetchAllData(); 
      setGlobalAlert({ messages: [`${toPersianDigits(userIds.length)} کاربر با موفقیت حذف شدند.`], type: 'success' });
    } catch (error: any) { 
      const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
      setGlobalAlert({ messages: ['خطا در حذف گروهی کاربران.', errorMessage], type: 'error' });
      console.error("خطای حذف گروهی کاربران:", errorMessage); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  // Generic Handlers (simplified for brevity)
  const createSaveHandler = (entityName: string, endpoint: string) => async (data: any) => {
    setIsProcessing(true);
    try {
        const payload = convertKeysToSnakeCase(data);
        const isEditing = 'id' in data;
        if (isEditing) {
            const { id, ...updateData } = payload;
            await api.patch(`/${endpoint}?id=eq.${id}`, updateData);
        } else {
            await api.post(`/${endpoint}`, payload, { headers: { 'Prefer': 'return=minimal' } });
        }
        await fetchAllData();
        setGlobalAlert({ messages: [`${entityName} با موفقیت ${isEditing ? 'ویرایش' : 'ذخیره'} شد.`], type: 'success' });
    } catch (error: any) { 
      const errorMessage = error.response?.data?.message || error.message;
      setGlobalAlert({ messages: [`خطا در ذخیره ${entityName}.`, errorMessage], type: 'error' });
      // Re-throw the error to be caught by the calling form modal
      throw error;
    } finally { setIsProcessing(false); }
  };
  
  const createDeleteHandler = (entityName: string, endpoint: string) => async (id: number) => {
    setIsProcessing(true);
    try {
        await api.delete(`/${endpoint}?id=eq.${id}`);
        await fetchAllData();
        setGlobalAlert({ messages: [`${entityName} با موفقیت حذف شد.`], type: 'success' });
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        setGlobalAlert({ messages: [`خطا در حذف ${entityName}.`, errorMessage], type: 'error' });
    } finally { setIsProcessing(false); }
  };

  const createDeleteManyHandler = (entityName: string, endpoint: string) => async (ids: number[]) => {
    setIsProcessing(true);
    try {
        await api.delete(`/${endpoint}?id=in.(${ids.join(',')})`);
        await fetchAllData();
        setGlobalAlert({ messages: [`${toPersianDigits(ids.length)} ${entityName} با موفقیت حذف شدند.`], type: 'success' });
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        setGlobalAlert({ messages: [`خطا در حذف گروهی ${entityName}.`, errorMessage], type: 'error' });
    } finally { setIsProcessing(false); }
  };

  const handleSaveCustomer = createSaveHandler('مشتری', 'customers');
  const handleDeleteCustomer = createDeleteHandler('مشتری', 'customers');
  const handleDeleteManyCustomers = createDeleteManyHandler('مشتری', 'customers');

  const handleSavePurchaseContract = createSaveHandler('قرارداد فروش', 'purchase_contracts');
  const handleDeletePurchaseContract = createDeleteHandler('قرارداد فروش', 'purchase_contracts');
  const handleDeleteManyPurchaseContracts = createDeleteManyHandler('قرارداد فروش', 'purchase_contracts');
  
  const handleSaveSupportContract = createSaveHandler('قرارداد پشتیبانی', 'support_contracts');
  const handleDeleteSupportContract = createDeleteHandler('قرارداد پشتیبانی', 'support_contracts');
  const handleDeleteManySupportContracts = createDeleteManyHandler('قرارداد فروش', 'support_contracts');
  
  // Ticket Handlers
  const handleSaveTicket = async (ticketData: Ticket | Omit<Ticket, 'id'>) => {
    try {
        // Destructure to remove the client-side 'score' property before saving.
        const { score, ...ticketToSave } = ticketData as Ticket & { score?: number };

        let payload: Partial<Ticket> & { id?: number } = { ...ticketToSave };
        const isEditing = 'id' in payload;

        if (!isEditing) {
            const now = new Date();
            const lastTicketNumber = tickets.reduce((max, t) => Math.max(max, parseInt(t.ticketNumber.split('-')[1], 10) || 0), 0);
            payload = {
                ...payload,
                ticketNumber: `T-${lastTicketNumber + 1}`,
                creationDateTime: formatJalaaliDateTime(now),
                lastUpdateDate: formatJalaaliDateTime(now),
                editableUntil: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
            };
        } else {
            payload = {
                ...payload,
                lastUpdateDate: formatJalaaliDateTime(new Date()),
            };
        }
        
        await createSaveHandler('تیکت', 'tickets')(payload);
    } catch (error) {
        // Errors are handled in createSaveHandler and re-thrown to be caught in the form modal
        throw error;
    }
  };
  
  const handleReferTicket = async (ticketId: number, isFromReferral: boolean, referredBy: User, referredToUsername: string) => {
    setIsProcessing(true);
    try {
        // Update ticket status to 'ارجاع شده'
        await api.patch(`/tickets?id=eq.${ticketId}`, { status: 'ارجاع شده', assigned_to_username: referredToUsername });
        
        // Create a new referral record
        const referralPayload = {
            ticket_id: ticketId,
            referred_by_username: referredBy.username,
            referred_to_username: referredToUsername,
            referral_date: new Date().toISOString()
        };
        await api.post('/referrals', referralPayload);
        
        await fetchAllData();
        setGlobalAlert({ messages: [`تیکت با موفقیت ارجاع داده شد.`], type: 'success' });
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        setGlobalAlert({ messages: ['خطا در ارجاع تیکت.', errorMessage], type: 'error' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleToggleWork = async (ticketId: number) => {
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
                const sessionStart = new Date(workSessionStartedAt).getTime();
                const now = new Date().getTime();
                totalWorkDuration += Math.floor((now - sessionStart) / 1000);
            }
            workSessionStartedAt = null;
        } else {
            newStatus = 'در حال پیگیری';
            workSessionStartedAt = new Date().toISOString();
        }

        await api.patch(`/tickets?id=eq.${ticketId}`, { status: newStatus, work_session_started_at: workSessionStartedAt, total_work_duration: totalWorkDuration });
        await fetchAllData();
        setGlobalAlert({ messages: [`وضعیت تیکت با موفقیت تغییر کرد.`], type: 'success' });
      } catch(e) {
         setGlobalAlert({ messages: ['خطا در تغییر وضعیت تیکت.'], type: 'error' });
      } finally {
        setIsProcessing(false);
      }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    setIsProcessing(true);
    try {
        await api.delete(`/referrals?ticket_id=eq.${ticketId}`);
        await api.delete(`/tickets?id=eq.${ticketId}`);
        await fetchAllData();
        setGlobalAlert({ messages: [`تیکت با موفقیت حذف شد.`], type: 'success' });
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        setGlobalAlert({ messages: ['خطا در حذف تیکت.', errorMessage], type: 'error' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteManyTickets = async (ticketIds: number[]) => {
    if (ticketIds.length === 0) {
      setIsProcessing(false);
      return;
    }
    setIsProcessing(true);
    try {
      const idsQuery = `in.(${ticketIds.join(',')})`;
      await api.delete(`/referrals?ticket_id=${idsQuery}`);
      await api.delete(`/tickets?id=${idsQuery}`);
      await fetchAllData();
      setGlobalAlert({ messages: [`${toPersianDigits(ticketIds.length)} تیکت با موفقیت حذف شدند.`], type: 'success' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'یک خطای ناشناخته رخ داد.';
      setGlobalAlert({ messages: ['خطا در حذف گروهی تیکت‌ها.', errorMessage], type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopenTicket = async (ticketId: number) => {
      setIsProcessing(true);
      try {
        await api.patch(`/tickets?id=eq.${ticketId}`, { status: 'انجام نشده' });
        await fetchAllData();
        setGlobalAlert({ messages: ['تیکت با موفقیت مجدداً باز شد.'], type: 'success' });
      } catch (e) {
        setGlobalAlert({ messages: ['خطا در باز کردن مجدد تیکت.'], type: 'error' });
      } finally {
        setIsProcessing(false);
      }
  };

  const handleExtendEditTime = async (ticketId: number) => {
      setIsProcessing(true);
      try {
        const newEditableUntil = new Date(new Date().getTime() + 30 * 60 * 1000).toISOString();
        await api.patch(`/tickets?id=eq.${ticketId}`, { editable_until: newEditableUntil });
        await fetchAllData();
        setGlobalAlert({ messages: ['زمان ویرایش تیکت با موفقیت تمدید شد.'], type: 'success' });
      } catch (e) {
        setGlobalAlert({ messages: ['خطا در تمدید زمان ویرایش.'], type: 'error' });
      } finally {
        setIsProcessing(false);
      }
  };

  const renderPage = () => {
    if (!currentUser) return null;
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage users={users} customers={customers} purchaseContracts={purchaseContracts} supportContracts={supportContracts} tickets={tickets} referrals={referrals} />;
      case 'users':
        return <UserManagement users={users} onSave={handleSaveUser} onDelete={handleDeleteUser} onDeleteMany={handleDeleteManyUsers} currentUser={currentUser} />;
      case 'customers':
        return <CustomerList customers={customers} onSave={handleSaveCustomer} onDelete={handleDeleteCustomer} onDeleteMany={handleDeleteManyCustomers} currentUser={currentUser} />;
      case 'contracts':
          return (
            <div className="flex-1 bg-gray-50 text-slate-800 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <main className="max-w-7xl mx-auto space-y-12">
                  <PurchaseContracts contracts={purchaseContracts} users={users} customers={customers} onSave={handleSavePurchaseContract} onDelete={handleDeletePurchaseContract} onDeleteMany={handleDeleteManyPurchaseContracts} currentUser={currentUser} />
                  <SupportContracts contracts={supportContracts} customers={customers} onSave={handleSaveSupportContract} onDelete={handleDeleteSupportContract} onDeleteMany={handleDeleteManySupportContracts} currentUser={currentUser} />
                </main>
            </div>
          );
      case 'tickets':
        return <Tickets tickets={tickets} referrals={referrals} customers={customers} users={users} supportContracts={supportContracts} onSave={handleSaveTicket} onReferTicket={handleReferTicket} onToggleWork={handleToggleWork} onDeleteTicket={handleDeleteTicket} onDeleteManyTickets={handleDeleteManyTickets} onReopenTicket={handleReopenTicket} onExtendEditTime={handleExtendEditTime} currentUser={currentUser} />;
      case 'referrals':
        return <ReferralsPage referrals={referrals} currentUser={currentUser} users={users} customers={customers} supportContracts={supportContracts} onSave={handleSaveTicket} onReferTicket={handleReferTicket} onToggleWork={handleToggleWork} onExtendEditTime={handleExtendEditTime} onDeleteTicket={handleDeleteTicket} onDeleteManyTickets={handleDeleteManyTickets} onReopenTicket={handleReopenTicket} />;
      case 'reports':
        return <ReportsPage customers={customers} users={users} purchaseContracts={purchaseContracts} supportContracts={supportContracts} tickets={tickets} currentUser={currentUser} />;
      default:
        return <DashboardPage users={users} customers={customers} purchaseContracts={purchaseContracts} supportContracts={supportContracts} tickets={tickets} referrals={referrals} />;
    }
  };

  if (isLoading) {
    return <ProcessingOverlay isVisible={true} />;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100" dir="rtl">
      <ProcessingOverlay isVisible={isProcessing} />
      <div className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => setIsSidebarOpen(false)}></div>
      <Sidebar 
        activePage={activePage} 
        setActivePage={(page) => setActivePage(page as MenuItemId)} 
        isSidebarOpen={isSidebarOpen}
        user={currentUser}
        onLogout={handleLogout}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle={pageTitles[activePage]} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        {globalAlert && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[101] w-full max-w-md"><Alert messages={globalAlert.messages} type={globalAlert.type} onClose={() => setGlobalAlert(null)} /></div>}
        {renderPage()}
      </div>
    </div>
  );
};

export default App;