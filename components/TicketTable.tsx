import React from 'react';
import { Ticket, Customer, User, SupportContract } from '../types';
import { toPersianDigits } from '../utils/dateFormatter';
import TicketActions from './TicketActions';
import Avatar from './Avatar';
import { PaperClipIcon } from './icons/PaperClipIcon';

interface TicketTableProps {
  tickets: (Ticket & { score: number })[];
  customers: Customer[];
  users: User[];
  supportContracts: SupportContract[];
  onEdit: (ticket: Ticket) => void;
  onRefer: (ticket: Ticket) => void;
  onToggleWork: (ticketId: number) => void;
  onShowAttachments: (attachments: string[]) => void;
  isReferralTable: boolean;
  emptyMessage?: string;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  currentUser: User;
  onDelete?: (ticketId: number) => void;
  onReopen?: (ticketId: number) => void;
  onExtendEditTime: (ticketId: number) => void;
}

const getScoreColor = (score: number) => {
  if (score <= 12) return 'bg-red-500'; // Highest priority
  if (score <= 24) return 'bg-orange-500';
  if (score <= 36) return 'bg-yellow-500';
  return 'bg-green-500'; // Lowest priority
};

const TicketTable: React.FC<TicketTableProps> = (props) => {
  const { tickets, customers, users, onEdit, onRefer, onToggleWork, onShowAttachments, selectedIds, onToggleSelect, onToggleSelectAll, currentUser, onDelete, onReopen, onExtendEditTime } = props;

  const allOnPageSelected = tickets.length > 0 && tickets.every(t => selectedIds.includes(t.id));

  const getCustomerName = (customerId: number) => customers.find(c => c.id === customerId)?.companyName || 'مشتری حذف شده';
  const getAssigneeName = (username: string) => {
    const user = users.find(u => u.username === username);
    return user ? `${user.firstName} ${user.lastName}` : 'ناشناس';
  };

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200/80 p-16 text-center">
        <h3 className="text-xl font-semibold text-slate-700">{props.emptyMessage || 'هیچ تیکتی یافت نشد'}</h3>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200/80 overflow-hidden">
        {/* Mobile & Tablet Card View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-px bg-gray-200">
            {tickets.map(ticket => (
                <div 
                    key={ticket.id} 
                    className="bg-white p-4 space-y-3 relative cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => onEdit(ticket)}
                >
                     <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
                        <input 
                            type="checkbox"
                            className="h-5 w-5 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500"
                            checked={selectedIds.includes(ticket.id)}
                            onChange={() => onToggleSelect(ticket.id)}
                        />
                    </div>
                    <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${getScoreColor(ticket.score)}`} title={`امتیاز: ${toPersianDigits(ticket.score)}`}></div>
                        <div>
                           <p className="font-bold text-slate-800 leading-tight">{ticket.title}</p>
                           <p className="text-xs text-gray-400 mt-1">{toPersianDigits(ticket.ticketNumber)}</p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-2 pt-2 border-t border-gray-100">
                        <p><span className="font-semibold">مشتری:</span> {getCustomerName(ticket.customerId)}</p>
                        <p><span className="font-semibold">ارجاع به:</span> {getAssigneeName(ticket.assignedToUsername)}</p>
                        <p><span className="font-semibold">تاریخ:</span> <span className="font-mono">{toPersianDigits(ticket.creationDateTime.split(' ')[0])}</span></p>
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                        <TicketActions {...props} ticket={ticket} />
                    </div>
                </div>
            ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm text-right text-gray-600">
                <thead className="text-xs text-cyan-700 font-semibold uppercase bg-slate-50 tracking-wider">
                    <tr>
                        <th scope="col" className="p-4"><input type="checkbox" onChange={onToggleSelectAll} checked={allOnPageSelected} className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500" /></th>
                        <th scope="col" className="px-2 py-4"></th>
                        <th scope="col" className="px-6 py-4">شماره تیکت</th>
                        <th scope="col" className="px-6 py-4">عنوان</th>
                        <th scope="col" className="px-6 py-4">مشتری</th>
                        <th scope="col" className="px-6 py-4">ارجاع به</th>
                        <th scope="col" className="px-6 py-4">تاریخ</th>
                        <th scope="col" className="px-6 py-4 text-left">اقدامات</th>
                    </tr>
                </thead>
                <tbody>
                    {tickets.map(ticket => (
                        <tr 
                            key={ticket.id} 
                            className="border-b border-gray-200 hover:bg-slate-50/50 transition-colors duration-200 cursor-pointer"
                            onClick={() => onEdit(ticket)}
                        >
                            <td className="w-4 p-4" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(ticket.id)} onChange={() => onToggleSelect(ticket.id)} className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500" /></td>
                            <td className="px-2 py-4"><div className={`w-3 h-3 rounded-full ${getScoreColor(ticket.score)}`} title={`امتیاز اولویت: ${toPersianDigits(ticket.score)}`}></div></td>
                            <td className="px-6 py-4 font-mono">{toPersianDigits(ticket.ticketNumber)}</td>
                            <td className="px-6 py-4 font-medium text-slate-800">
                                <div className="flex items-center gap-2">
                                    <span>{ticket.title}</span>
                                    {ticket.attachments.length > 0 && <button onClick={(e) => { e.stopPropagation(); onShowAttachments(ticket.attachments); }} title="نمایش پیوست‌ها"><PaperClipIcon /></button>}
                                </div>
                            </td>
                            <td className="px-6 py-4">{getCustomerName(ticket.customerId)}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <Avatar name={getAssigneeName(ticket.assignedToUsername)} />
                                    {getAssigneeName(ticket.assignedToUsername)}
                                </div>
                            </td>
                            <td className="px-6 py-4 font-mono">{toPersianDigits(ticket.creationDateTime)}</td>
                            <td className="px-6 py-4 text-left" onClick={e => e.stopPropagation()}>
                                <TicketActions {...props} ticket={ticket} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default TicketTable;