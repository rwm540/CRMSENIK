import React, { useState, useMemo } from 'react';
import { Ticket, Customer, User, Referral, SupportContract } from '../types';
// FIX: Corrected import path for component.
import TicketTable from '../components/TicketTable';
// FIX: Corrected import path for component.
import TicketFormModal from '../components/TicketFormModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import TicketBoard from '../components/TicketBoard';
import ReferTicketModal from '../components/ReferTicketModal';
import { parseJalaaliDateTime, toPersianDigits } from '../utils/dateFormatter';
import Pagination from '../components/Pagination';
import { calculateTicketScore } from '../utils/ticketScoring';
import { UserCheckIcon } from '../components/icons/UserCheckIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import AttachmentPreviewModal from '../components/AttachmentPreviewModal';

interface TicketsProps {
  tickets: Ticket[];
  referrals: Referral[];
  customers: Customer[];
  users: User[];
  supportContracts: SupportContract[];
  onSave: (ticket: Ticket | Omit<Ticket, 'id'>) => Promise<void>;
  onReferTicket: (ticketId: number, isFromReferral: boolean, referredBy: User, referredToUsername: string) => void;
  onToggleWork: (ticketId: number) => void;
  onDeleteTicket: (ticketId: number) => void;
  onDeleteManyTickets: (ticketIds: number[]) => void;
  onReopenTicket: (ticketId: number) => void;
  onExtendEditTime: (ticketId: number) => void;
  currentUser: User;
}

const ITEMS_PER_PAGE = 10;

const Tickets: React.FC<TicketsProps> = ({ tickets, referrals, customers, users, onSave, onReferTicket, onToggleWork, currentUser, supportContracts, onDeleteTicket, onDeleteManyTickets, onReopenTicket, onExtendEditTime }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isReferModalOpen, setIsReferModalOpen] = useState(false);
  const [referringTickets, setReferringTickets] = useState<Ticket[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [showCompleted, setShowCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [itemsToDelete, setItemsToDelete] = useState<number[] | null>(null);
  const [previewAttachments, setPreviewAttachments] = useState<string[] | null>(null);
  
  const referredTicketIds = useMemo(() => new Set(referrals.map(r => r.ticket.id)), [referrals]);

  const handleOpenModal = (ticket: Ticket | null = null) => {
    setEditingTicket(ticket);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingTicket(null), 300);
  };
  
  const handleOpenReferModal = (ticket: Ticket) => {
    setReferringTickets([ticket]);
    setIsReferModalOpen(true);
  };
  
  const handleOpenGroupReferModal = () => {
    const ticketsToRefer = sortedAndFilteredTickets.filter(t => selectedIds.includes(t.id));
    if (ticketsToRefer.length > 0) {
        setReferringTickets(ticketsToRefer);
        setIsReferModalOpen(true);
    }
  };

  const handleCloseReferModal = () => {
    setIsReferModalOpen(false);
    setTimeout(() => setReferringTickets(null), 300);
  };

  const handleSaveTicket = async (ticketData: Ticket | Omit<Ticket, 'id'>) => {
    await onSave(ticketData);
    // handleCloseModal is now called from within the form modal after async ops.
  };

  const handleReferTicketSubmit = (newAssigneeUsername: string) => {
    if (!referringTickets) return;
    referringTickets.forEach(ticket => {
        const isFromReferral = referredTicketIds.has(ticket.id);
        onReferTicket(ticket.id, isFromReferral, currentUser, newAssigneeUsername);
    });
    handleCloseReferModal();
    setSelectedIds([]);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  
  const handleConfirmDelete = () => {
    if (itemsToDelete) {
        onDeleteManyTickets(itemsToDelete);
        setSelectedIds([]);
    }
    setItemsToDelete(null);
  };

  const sortedAndFilteredTickets = useMemo(() => {
    let sourceTickets: Ticket[];

    // When showing completed, we want to show ALL completed tickets, including those that might have been referred and then completed.
    // When showing active, we only want from the main 'tickets' list.
    if (showCompleted) {
        const allTicketsMap = new Map<number, Ticket>();
        tickets.forEach(ticket => allTicketsMap.set(ticket.id, ticket));
        referrals.forEach(referral => allTicketsMap.set(referral.ticket.id, referral.ticket));
        sourceTickets = Array.from(allTicketsMap.values());
    } else {
        sourceTickets = [...tickets];
    }

    // Filter by status: show completed OR show active (not completed AND not referred)
    sourceTickets = sourceTickets.filter(ticket =>
      showCompleted 
        ? ticket.status === 'اتمام یافته' 
        : ticket.status !== 'اتمام یافته' && ticket.status !== 'ارجاع شده'
    );

    // Filter by user access rights
    if (currentUser.role !== 'مدیر') {
      if (currentUser.role.startsWith('مسئول')) { // Is a department lead
        const department = currentUser.role.replace('مسئول ', '');
        const specialistsInDept = users
            .filter(user => user.role === `کارشناس ${department}`)
            .map(user => user.username);
        const departmentMembers = [currentUser.username, ...specialistsInDept];
        
        sourceTickets = sourceTickets.filter(ticket => 
            ticket.assignedToUsername && departmentMembers.includes(ticket.assignedToUsername)
        );

      } else { // Is a specialist
        sourceTickets = sourceTickets.filter(ticket => ticket.assignedToUsername === currentUser.username);
      }
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      sourceTickets = sourceTickets.filter(ticket => {
        const customer = customers.find(c => c.id === ticket.customerId);
        return (
          ticket.title.toLowerCase().includes(search) ||
          ticket.ticketNumber.toLowerCase().includes(search) ||
          (customer && `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(search)) ||
          (customer && customer.companyName.toLowerCase().includes(search))
        );
      });
    }

    // Score and sort the tickets
    const scoredTickets = sourceTickets.map(ticket => ({
        ...ticket,
        score: calculateTicketScore(ticket, customers, supportContracts),
    }));

    scoredTickets.sort((a, b) => {
        if (a.score !== b.score) {
            return a.score - b.score;
        }
        const dateA = parseJalaaliDateTime(a.creationDateTime)?.getTime() || 0;
        const dateB = parseJalaaliDateTime(b.creationDateTime)?.getTime() || 0;
        return dateB - dateA; // Sort by creation date descending as a tie-breaker
    });

    return scoredTickets;
  }, [tickets, referrals, searchTerm, customers, showCompleted, currentUser, supportContracts, users]);


  const totalPages = Math.ceil(sortedAndFilteredTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = sortedAndFilteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const paginatedIds = paginatedTickets.map(t => t.id);
    const allOnPageSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedIds.includes(id));
    if (allOnPageSelected) {
        setSelectedIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
        setSelectedIds(prev => [...new Set([...prev, ...paginatedIds])]);
    }
  };

  const allOnPageSelected = paginatedTickets.length > 0 && paginatedTickets.every(t => selectedIds.includes(t.id));

  return (
    <div className="flex-1 bg-gray-50 text-slate-800 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <main className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              {showCompleted ? 'تیکت‌های اتمام یافته' : 'مدیریت تیکت‌ها'}
            </h1>
            <p className="text-gray-500 mt-1">
              {showCompleted
                ? 'تیکت‌های تکمیل شده در این بخش آرشیو می‌شوند.'
                : 'تیکت های پشتیبانی را پیگیری و مدیریت کنید.'
              }
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setShowCompleted(!showCompleted);
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-white text-cyan-600 border border-cyan-600 font-semibold rounded-lg hover:bg-cyan-50 transition-colors"
            >
              {showCompleted ? 'نمایش تیکت‌های جاری' : 'نمایش تیکت‌های اتمام یافته'}
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-50"
            >
              <PlusIcon />
              <span>تیکت جدید</span>
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
            <input
              type="text"
              placeholder="جستجوی تیکت (شماره، عنوان، مشتری)..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full max-w-sm bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
            />
             {selectedIds.length > 0 && !showCompleted && (
                 <button 
                    onClick={handleOpenGroupReferModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <UserCheckIcon className="h-5 w-5" />
                    <span>ارجاع ({toPersianDigits(selectedIds.length)}) مورد</span>
                 </button>
            )}
            {currentUser.role === 'مدیر' && selectedIds.length > 0 && (
                <button
                    onClick={() => setItemsToDelete(selectedIds)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm whitespace-nowrap"
                  >
                    <TrashIcon />
                    <span>حذف ({toPersianDigits(selectedIds.length)}) مورد</span>
                </button>
            )}
          </div>
          <div className="flex items-center lg:hidden mb-4">
              <input 
                  id="checkbox-all-mobile-tickets" 
                  type="checkbox"
                  onChange={handleToggleSelectAll}
                  checked={allOnPageSelected}
                  className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500" 
              />
              <label htmlFor="checkbox-all-mobile-tickets" className="mr-2 text-sm font-medium text-gray-700">انتخاب همه در این صفحه</label>
          </div>
          {viewMode === 'list' ? (
            <>
              <TicketTable
                tickets={paginatedTickets}
                customers={customers}
                users={users}
                supportContracts={supportContracts}
                onEdit={handleOpenModal}
                onRefer={handleOpenReferModal}
                onToggleWork={(ticketId) => onToggleWork(ticketId)}
                onShowAttachments={setPreviewAttachments}
                isReferralTable={false}
                emptyMessage={showCompleted ? 'هیچ تیکت اتمام یافته‌ای برای نمایش وجود ندارد.' : 'هیچ تیکت فعالی یافت نشد. برای شروع یک تیکت جدید ایجاد کنید.'}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                onDelete={onDeleteTicket}
                onReopen={onReopenTicket}
                onExtendEditTime={onExtendEditTime}
                currentUser={currentUser}
              />
              <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={ITEMS_PER_PAGE}
                  totalItems={sortedAndFilteredTickets.length}
              />
            </>
          ) : (
            <TicketBoard tickets={sortedAndFilteredTickets} />
          )}
        </div>

        <TicketFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveTicket}
          ticket={editingTicket}
          customers={customers}
          users={users}
          currentUser={currentUser}
          referrals={referrals}
          supportContracts={supportContracts}
          onShowAttachments={setPreviewAttachments}
        />
        <ReferTicketModal
          isOpen={isReferModalOpen}
          onClose={handleCloseReferModal}
          onRefer={handleReferTicketSubmit}
          tickets={referringTickets}
          users={users}
          currentUser={currentUser}
        />
        <ConfirmationModal
          isOpen={!!itemsToDelete}
          onClose={() => setItemsToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="تایید حذف"
          message={`آیا از حذف ${toPersianDigits(itemsToDelete?.length || 0)} تیکت انتخاب شده اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        />
        <AttachmentPreviewModal 
            isOpen={!!previewAttachments}
            onClose={() => setPreviewAttachments(null)}
            attachments={previewAttachments || []}
        />
      </main>
    </div>
  );
};

export default Tickets;