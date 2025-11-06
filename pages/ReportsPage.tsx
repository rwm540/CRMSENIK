import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, PurchaseContract, SupportContract, Ticket, User, TicketStatus, TicketPriority, ContractStatus, CustomerStatus, UserRole } from '../types';
import DatePicker from '../components/DatePicker';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import { exportReportToCSV } from '../utils/dateFormatter';
import { DownloadIcon } from '../components/icons/DownloadIcon';

type ReportType = 'customers' | 'contracts' | 'tickets';

interface ReportsPageProps {
  customers: Customer[];
  users: User[];
  purchaseContracts: PurchaseContract[];
  supportContracts: SupportContract[];
  tickets: Ticket[];
  currentUser: User;
}

const ITEMS_PER_PAGE = 10;

const ReportsPage: React.FC<ReportsPageProps> = ({ customers, users, purchaseContracts, supportContracts, tickets, currentUser }) => {
    const [reportType, setReportType] = useState<ReportType>('customers');
    const [filters, setFilters] = useState(() => {
        const initialAssignedTo = currentUser.role.startsWith('کارشناس') ? currentUser.username : 'all';
        return {
            startDate: '',
            endDate: '',
            status: 'all',
            priority: 'all',
            assignedTo: initialAssignedTo,
        };
    });
    const [reportData, setReportData] = useState<any[]>([]);
    const [reportColumns, setReportColumns] = useState<{ header: string; accessor: string }[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const toPersianDigits = (n: string | number): string => {
        if (n === undefined || n === null) return '';
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(n).replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
    };
    
    const getUserFullName = (username: string | null): string => {
        if (!username) return '---';
        const user = users.find(u => u.username === username);
        return user ? `${user.firstName} ${user.lastName}` : username;
    };

    const assigneeFilterOptions = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === 'مدیر') {
            return users;
        }
        if (currentUser.role.startsWith('مسئول')) {
            const departmentName = currentUser.role.replace('مسئول ', '');
            const specialistRole = `کارشناس ${departmentName}` as UserRole;
            const departmentSpecialists = users.filter(u => u.role === specialistRole);
            return [currentUser, ...departmentSpecialists];
        }
        return [currentUser];
    }, [currentUser, users]);
    
    const searchableAssigneeOptions = useMemo(() => {
        const isSpecialist = currentUser.role.startsWith('کارشناس');
        const userOptions = assigneeFilterOptions.map(u => ({
            value: u.username,
            label: `${u.firstName} ${u.lastName}`
        }));
        
        if (isSpecialist) {
            return userOptions;
        }
        
        return [{ value: 'all', label: 'همه' }, ...userOptions];
    }, [assigneeFilterOptions, currentUser.role]);

    const accessibleData = useMemo(() => {
        if (!currentUser || currentUser.role === 'مدیر') {
            return { customers, purchaseContracts, supportContracts, tickets };
        }

        let accessibleUsernames: string[] = [];
        if (currentUser.role.startsWith('مسئول')) { // Lead
            const departmentName = currentUser.role.replace('مسئول ', '');
            const specialistRole = `کارشناس ${departmentName}` as UserRole;
            const departmentSpecialists = users
                .filter(u => u.role === specialistRole)
                .map(u => u.username);
            accessibleUsernames = [currentUser.username, ...departmentSpecialists];
        } else { // Specialist
            accessibleUsernames = [currentUser.username];
        }

        const accessibleTickets = tickets.filter(t =>
            t.assignedToUsername && accessibleUsernames.includes(t.assignedToUsername)
        );

        const accessiblePurchaseContracts = purchaseContracts.filter(pc =>
            (pc.salespersonUsername && accessibleUsernames.includes(pc.salespersonUsername)) ||
            (pc.crmResponsibleUsername && accessibleUsernames.includes(pc.crmResponsibleUsername))
        );

        const accessibleCustomerIds = new Set<number>();
        accessibleTickets.forEach(t => { if (t.customerId) accessibleCustomerIds.add(t.customerId); });
        accessiblePurchaseContracts.forEach(pc => { if (pc.customerId) accessibleCustomerIds.add(pc.customerId); });

        const accessibleCustomers = customers.filter(c => accessibleCustomerIds.has(c.id));

        const accessibleSupportContracts = supportContracts.filter(sc =>
            sc.customerId && accessibleCustomerIds.has(sc.customerId)
        );

        return {
            customers: accessibleCustomers,
            purchaseContracts: accessiblePurchaseContracts,
            supportContracts: accessibleSupportContracts,
            tickets: accessibleTickets,
        };
    }, [currentUser, users, customers, purchaseContracts, supportContracts, tickets]);
    
    const handleGenerateReport = useCallback(() => {
        setCurrentPage(1);
        let data: any[] = [];
        let columns: { header: string; accessor: string }[] = [];

        const {
            customers: reportCustomers,
            purchaseContracts: reportPurchaseContracts,
            supportContracts: reportSupportContracts,
            tickets: reportTickets
        } = accessibleData;

        const allContracts = [
            ...reportPurchaseContracts.map(c => ({ ...c, type: 'خرید', customerName: customers.find(cust => cust.id === c.customerId)?.companyName || 'N/A' })),
            ...reportSupportContracts.map(c => ({ ...c, type: 'پشتیبانی', contractId: `SC-${c.id}`, customerName: customers.find(cust => cust.id === c.customerId)?.companyName || 'N/A', totalAmount: 0, contractStatus: c.status, contractDate: c.startDate }))
        ];

        const checkDateRange = (dateStr: string) => {
            if (!dateStr) return false;
            const dateOnly = dateStr.split(' ')[0];
            if (filters.startDate && dateOnly < filters.startDate) return false;
            if (filters.endDate && dateOnly > filters.endDate) return false;
            return true;
        };
        
        const getSpecialistsForCustomer = (customerId: number | null): string => {
            if (customerId === null) return '---';
            const specialists = new Set<string>();

            let relevantTickets = accessibleData.tickets.filter(t => t.customerId === customerId);
            let relevantContracts = accessibleData.purchaseContracts.filter(pc => pc.customerId === customerId);

            // If the user is a lead or specialist, we filter by their team
            if (currentUser.role !== 'مدیر') {
                let teamUsernames: string[];
                if (currentUser.role.startsWith('مسئول')) {
                    const departmentName = currentUser.role.replace('مسئول ', '');
                    const specialistRole = `کارشناس ${departmentName}` as UserRole;
                    const specialistsUsernames = users.filter(u => u.role === specialistRole).map(u => u.username);
                    teamUsernames = [currentUser.username, ...specialistsUsernames];
                } else { // Specialist
                    teamUsernames = [currentUser.username];
                }
                
                relevantTickets = relevantTickets.filter(t => t.assignedToUsername && teamUsernames.includes(t.assignedToUsername));
                relevantContracts = relevantContracts.filter(pc => 
                    (pc.salespersonUsername && teamUsernames.includes(pc.salespersonUsername)) ||
                    (pc.crmResponsibleUsername && teamUsernames.includes(pc.crmResponsibleUsername))
                );
            }
            
            relevantTickets.forEach(ticket => {
                if (ticket.assignedToUsername) {
                    specialists.add(getUserFullName(ticket.assignedToUsername));
                }
            });

            relevantContracts.forEach(pc => {
                if (pc.salespersonUsername) specialists.add(getUserFullName(pc.salespersonUsername));
                if (pc.crmResponsibleUsername) specialists.add(getUserFullName(pc.crmResponsibleUsername));
            });

            if (specialists.size === 0) return '---';
            return Array.from(specialists).join('، ');
        };


        switch (reportType) {
            case 'customers':
                columns = [
                    { header: 'کد مشتری', accessor: 'id' },
                    { header: 'نام مشتری', accessor: 'name' },
                    { header: 'شرکت', accessor: 'company' },
                    { header: 'سطح', accessor: 'level' },
                    { header: 'وضعیت', accessor: 'status' },
                    { header: 'تاریخ خرید', accessor: 'purchaseDate' },
                    { header: 'کارشناس مسئول', accessor: 'specialist' }
                ];
                data = reportCustomers.filter(c => {
                    if (!checkDateRange(c.purchaseDate)) return false;
                    if (filters.status !== 'all' && c.status !== filters.status) return false;
                    return true;
                }).map(c => ({
                    id: c.id,
                    name: `${c.firstName} ${c.lastName}`,
                    company: c.companyName,
                    level: c.level,
                    status: c.status,
                    purchaseDate: c.purchaseDate,
                    specialist: getSpecialistsForCustomer(c.id)
                }));
                break;
            case 'contracts':
                columns = [
                    { header: 'شناسه', accessor: 'id' },
                    { header: 'نام مشتری', accessor: 'customerName' },
                    { header: 'نوع', accessor: 'type' },
                    { header: 'وضعیت', accessor: 'status' },
                    { header: 'تاریخ قرارداد', accessor: 'date' },
                    { header: 'مبلغ (ریال)', accessor: 'amount' },
                    { header: 'کارشناس', accessor: 'specialist' }
                ];
                 data = allContracts.filter(c => {
                    if (!checkDateRange(c.contractDate)) return false;
                    if (filters.status !== 'all' && c.contractStatus !== filters.status) return false;
                    if (filters.assignedTo !== 'all') {
                        if (c.type === 'خرید') {
                            const pc = c as PurchaseContract;
                            if (pc.salespersonUsername !== filters.assignedTo && pc.crmResponsibleUsername !== filters.assignedTo) {
                                return false;
                            }
                        } else {
                            // Logic to check if any associated specialist matches the filter
                            const specialistsForCustomer = getSpecialistsForCustomer(c.customerId).split('، ');
                            const filteredUserFullName = getUserFullName(filters.assignedTo);
                            if (!specialistsForCustomer.includes(filteredUserFullName)) {
                                return false;
                            }
                        }
                    }
                    return true;
                }).map(c => ({
                    id: c.contractId,
                    customerName: c.customerName,
                    type: c.type,
                    status: c.contractStatus,
                    date: c.contractDate,
                    amount: (c.totalAmount || 0).toLocaleString('en-US'),
                    specialist: c.type === 'خرید' ? getUserFullName((c as PurchaseContract).crmResponsibleUsername) : getSpecialistsForCustomer(c.customerId)
                }));
                break;
            case 'tickets':
                columns = [
                    { header: 'شماره تیکت', accessor: 'id' },
                    { header: 'عنوان', accessor: 'title' },
                    { header: 'مشتری', accessor: 'customer' },
                    { header: 'وضعیت', accessor: 'status' },
                    { header: 'اولویت', accessor: 'priority' },
                    { header: 'کارشناس', accessor: 'specialist' }
                ];
                data = reportTickets.filter(t => {
                    if (!checkDateRange(t.creationDateTime)) return false;
                    if (filters.status !== 'all' && t.status !== filters.status) return false;
                    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
                    if (filters.assignedTo !== 'all' && t.assignedToUsername !== filters.assignedTo) return false;
                    return true;
                }).map(t => ({
                    id: t.ticketNumber,
                    title: t.title,
                    customer: customers.find(c => c.id === t.customerId)?.companyName || 'N/A',
                    status: t.status,
                    priority: t.priority,
                    specialist: getUserFullName(t.assignedToUsername)
                }));
                break;
        }

        setReportData(data);
        setReportColumns(columns);
        setShowResults(true);
    }, [filters, reportType, customers, users, accessibleData, currentUser]);

    useEffect(() => {
        handleGenerateReport();
    }, [handleGenerateReport]);

    const totalPages = Math.ceil(reportData.length / ITEMS_PER_PAGE);
    const paginatedData = reportData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );
    
    const handleExport = () => {
        if (reportData.length === 0) return;
        exportReportToCSV(reportType, reportData, reportColumns, filters);
    };

    const renderFilters = () => {
        const ticketStatuses: TicketStatus[] = ['در حال پیگیری', 'انجام نشده', 'اتمام یافته'];
        const contractStatuses: ContractStatus[] = ['فعال', 'منقضی شده', 'لغو شده', 'در انتظار تایید'];
        const customerStatuses: CustomerStatus[] = ['فعال', 'غیرفعال'];
        const priorities: TicketPriority[] = ['اضطراری', 'متوسط', 'کم'];
        
        let statusOptions: {value: string, label: string}[] = [];
        if (reportType === 'tickets') statusOptions = ticketStatuses.map(s => ({value: s, label: s}));
        if (reportType === 'contracts') statusOptions = contractStatuses.map(s => ({value: s, label: s}));
        if (reportType === 'customers') statusOptions = customerStatuses.map(s => ({value: s, label: s}));

        const isSpecialist = currentUser.role.startsWith('کارشناس');
        
        return (
            <>
                {statusOptions.length > 0 && (
                     <div>
                        <label className="text-sm font-medium text-gray-700">وضعیت</label>
                        <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="w-full mt-1 bg-white border border-gray-300 rounded-md py-2 px-3 text-sm">
                            <option value="all">همه</option>
                            {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                )}
                
                {reportType === 'tickets' && (
                     <div>
                        <label className="text-sm font-medium text-gray-700">اولویت</label>
                        <select value={filters.priority} onChange={e => setFilters(f => ({...f, priority: e.target.value}))} className="w-full mt-1 bg-white border border-gray-300 rounded-md py-2 px-3 text-sm">
                            <option value="all">همه</option>
                            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                )}
                
                {(reportType === 'tickets' || reportType === 'contracts') && (
                     <div className="mt-1">
                        <label className="text-sm font-medium text-gray-700">کاربر مسئول</label>
                        <SearchableSelect
                            options={searchableAssigneeOptions}
                            value={filters.assignedTo}
                            onChange={value => setFilters(f => ({ ...f, assignedTo: String(value) }))}
                            placeholder="جستجو یا انتخاب کاربر..."
                            disabled={isSpecialist}
                        />
                    </div>
                )}
            </>
        )
    };
    
  return (
    <div className="flex-1 bg-gray-50 text-slate-800 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <main className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">گزارشات</h1>
          <p className="text-gray-500 mt-1">گزارشات سیستم را در این بخش مشاهده و فیلتر کنید.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200/80 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-4">
                    <label className="text-sm font-medium text-gray-700">نوع گزارش</label>
                    <div className="flex flex-wrap gap-4 mt-2">
                        {(['customers', 'contracts', 'tickets'] as ReportType[]).map(type => (
                            <button key={type} onClick={() => { setReportType(type); setFilters(f => ({...f, status: 'all', priority: 'all'})); }}
                                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${reportType === type ? 'bg-cyan-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                {type === 'customers' ? 'مشتریان' : type === 'contracts' ? 'قراردادها' : 'تیکت‌ها'}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700">از تاریخ</label>
                    <DatePicker value={filters.startDate} onChange={date => setFilters(f => ({...f, startDate: date}))} />
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-700">تا تاریخ</label>
                    <DatePicker value={filters.endDate} onChange={date => setFilters(f => ({...f, endDate: date}))} />
                </div>
                {renderFilters()}
            </div>
        </div>
        
        {showResults && (
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200/80 overflow-hidden">
                 <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-800">نتایج گزارش</h3>
                     {reportData.length > 0 && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                            <DownloadIcon />
                            <span>خروجی اکسل</span>
                        </button>
                    )}
                </div>
                {reportData.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right text-gray-600">
                                <thead className="text-xs text-cyan-700 font-semibold uppercase bg-slate-50">
                                    <tr>{reportColumns.map(col => <th key={col.accessor} className="px-6 py-4">{col.header}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((row, index) => (
                                        <tr key={index} className="border-b hover:bg-slate-50/50">
                                            {reportColumns.map(col => <td key={col.accessor} className="px-6 py-4">{toPersianDigits(row[col.accessor])}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            itemsPerPage={ITEMS_PER_PAGE}
                            totalItems={reportData.length}
                        />
                    </>
                ) : (
                    <div className="p-16 text-center text-gray-500">
                        <p>هیچ نتیجه‌ای برای فیلترهای انتخابی یافت نشد.</p>
                    </div>
                )}
            </div>
        )}

      </main>
    </div>
  );
};

export default ReportsPage;
