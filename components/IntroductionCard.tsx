import React, { useState } from 'react';
import { CustomerIntroduction, User, CustomerIntroductionStatus } from '../types';
import { EditIcon } from './icons/EditIcon';
import { UserCheckIcon } from './icons/UserCheckIcon';
import Avatar from './Avatar';
import { toPersianDigits } from '../utils/dateFormatter';
import { TrashIcon } from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';
import { LinkIcon } from './icons/LinkIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';

interface IntroductionCardProps {
  introduction: CustomerIntroduction;
  users: User[];
  currentUser: User;
  onEdit: (intro: CustomerIntroduction) => void;
  onRefer: (intro: CustomerIntroduction) => void;
  onStatusChange: (newStatus: CustomerIntroductionStatus) => void;
  onDelete: (id: number) => void;
}

const statusConfig: Record<CustomerIntroductionStatus, { label: string; color: string; ringColor: string }> = {
  'جدید': { label: 'جدید', color: 'bg-blue-100 text-blue-700', ringColor: 'ring-blue-500' },
  'در حال پیگیری': { label: 'در حال پیگیری', color: 'bg-yellow-100 text-yellow-700', ringColor: 'ring-yellow-500' },
  'موفق': { label: 'موفق', color: 'bg-green-100 text-green-700', ringColor: 'ring-green-500' },
  'ناموفق': { label: 'ناموفق', color: 'bg-red-100 text-red-700', ringColor: 'ring-red-500' },
};

const statusOptions: CustomerIntroductionStatus[] = ['جدید', 'در حال پیگیری', 'موفق', 'ناموفق'];


const IntroductionCard: React.FC<IntroductionCardProps> = ({ introduction, users, currentUser, onEdit, onRefer, onStatusChange, onDelete }) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const introducer = users.find(u => u.username === introduction.introducerUsername);
  const assignee = users.find(u => u.username === introduction.assignedToUsername);

  const canEdit = currentUser.username === introduction.introducerUsername || currentUser.username === introduction.assignedToUsername || currentUser.role === 'مدیر';
  const canDelete = currentUser.role === 'مدیر';
  
  const handleDelete = () => {
      onDelete(introduction.id);
      setIsConfirmOpen(false);
  }

  const isFinalState = introduction.status === 'موفق' || introduction.status === 'ناموفق';

  const canChangeStatus = currentUser.username === introduction.assignedToUsername && introduction.status === 'در حال پیگیری';
  const canConvertToCustomer = (currentUser.role === 'مسئول فروش' || currentUser.role === 'کارشناس فروش') && currentUser.username === introduction.assignedToUsername && introduction.status === 'در حال پیگیری';

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border flex flex-col justify-between ${introduction.linkedCustomerId ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-200/80'}`}>
        <div className="p-5">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {introduction.customerName}
                {introduction.linkedCustomerId && <LinkIcon className="h-4 w-4 text-green-500" title="به مشتری متصل شده است" />}
              </h3>
              <p className="text-sm text-gray-500">{introduction.keyPersonName} ({introduction.position})</p>
            </div>
            <div className="flex-shrink-0">
                {canChangeStatus ? (
                    <select 
                        value={introduction.status}
                        onChange={(e) => onStatusChange(e.target.value as CustomerIntroductionStatus)}
                        className={`text-xs font-bold rounded-full border-none focus:ring-2 focus:ring-offset-2 cursor-pointer ${statusConfig[introduction.status].color} ${statusConfig[introduction.status].ringColor}`}
                    >
                        {statusOptions.filter(s => s === 'در حال پیگیری' || s === 'ناموفق').map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                        <option value='موفق'>&#10003; بستن (موفق)</option>
                    </select>
                ) : (
                    <span className={`text-xs font-bold rounded-full px-3 py-1 ${statusConfig[introduction.status].color}`}>
                        {statusConfig[introduction.status].label}
                    </span>
                )}
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <p><strong className="font-semibold">تماس:</strong> <span className="font-mono">{toPersianDigits(introduction.contactNumber)}</span></p>
            <p><strong className="font-semibold">نیاز اصلی:</strong> {introduction.mainNeed}</p>
            <p className="truncate" title={introduction.acquaintanceDetails}><strong className="font-semibold">نحوه آشنایی:</strong> {introduction.acquaintanceDetails}</p>
            <p><strong className="font-semibold">تاریخ معرفی:</strong> <span className="font-mono">{toPersianDigits(introduction.introductionDate)}</span></p>
          </div>
        </div>

        <div className="bg-gray-50/70 p-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <div title={`معرفی شده توسط: ${introducer ? `${introducer.firstName} ${introducer.lastName}` : ''}`}>
              <Avatar name={introducer ? `${introducer.firstName} ${introducer.lastName}` : '?'} />
            </div>
            <div title={`مسئول پیگیری: ${assignee ? `${assignee.firstName} ${assignee.lastName}` : ''}`}>
              <Avatar name={assignee ? `${assignee.firstName} ${assignee.lastName}` : '?'} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canConvertToCustomer && (
                <button onClick={() => onStatusChange('موفق')} className="p-2 text-green-500 hover:text-green-600 rounded-full hover:bg-green-100 transition-colors" title="تبدیل به مشتری">
                    <UserPlusIcon />
                </button>
            )}
            {canEdit && (
              <button onClick={() => onEdit(introduction)} className="p-2 text-yellow-500 hover:text-yellow-600 rounded-full hover:bg-yellow-100 transition-colors" title="ویرایش/مشاهده جزئیات">
                  <EditIcon />
              </button>
            )}
            {!isFinalState && (
                <button onClick={() => onRefer(introduction)} className="p-2 text-blue-500 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-colors" title="ارجاع به همکار">
                  <UserCheckIcon />
                </button>
            )}
            {canDelete && (
              <button onClick={() => setIsConfirmOpen(true)} className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors" title="حذف">
                <TrashIcon />
              </button>
            )}
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="تایید حذف"
        message={`آیا از حذف معرفی "${introduction.customerName}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
      />
    </>
  );
};

export default IntroductionCard;
