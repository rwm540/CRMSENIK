import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, Customer, User, TicketStatus, TicketPriority, TicketType, TicketChannel, Referral, SupportContract } from '../types';
import Modal from './Modal';
import Alert from './Alert';
import { formatJalaaliDateTime, getCalculatedStatus } from '../utils/dateFormatter';
import { FileUploadIcon } from './icons/FileUploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PaperClipIcon } from './icons/PaperClipIcon';
import ReferralHistoryTimeline from './ReferralHistoryTimeline';
import SearchableSelect from './SearchableSelect';
import ConfirmationModal from './ConfirmationModal';
import { supabase, BUCKET_NAME } from '../supabaseClient';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';

interface TicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: Ticket | Omit<Ticket, 'id'>) => void;
  ticket: Ticket | null;
  customers: Customer[];
  users: User[];
  currentUser: User;
  referrals: Referral[];
  supportContracts: SupportContract[];
}

// FIX: Add missing ticket types to the options so they appear in the form dropdown.
const ticketTypeOptions: TicketType[] = [
    'نصب', 'اپدیت', 'اموزش', 'طراحی و چاپ', 'تبدیل اطلاعات', 
    'رفع اشکال', 'راه اندازی', 'مشکل برنامه نویسی', 'سایر', 'فراصدر', 'گزارشات', 
    'تنظیمات نرم افزاری', 'مجوزدهی', 'صندوق', 'پوز', 'ترازو', 
    'انبار', 'چک', 'تعریف', 'سیستم', 'مودیان', 'بیمه', 'حقوق دستمزد', 
    'بکاپ', 'اوند', 'کیوسک', 'افتتاحیه', 'اختتامیه', 'تغییر مسیر', 
    'پرینتر', 'کارتخوان', 'sql', 'پنل پیامکی', 'کلاینت', 'صورتحساب', 
    'مغایرت گیری', 'ویندوزی', 'چاپ', 'پایان سال', 'دمو',
    'خطا', 'درخواست', 'مشکل'
];

const getInitialState = (currentUser: User): Omit<Ticket, 'id'> => ({
    ticketNumber: '', // Will be set on save
    title: '',
    description: '',
    customerId: 0,
    creationDateTime: '',
    lastUpdateDate: '',
    status: 'انجام نشده',
    priority: 'متوسط',
    type: 'سایر',
    channel: 'تلفن',
    assignedToUsername: currentUser.username,
    attachments: [],
    editableUntil: '',
    totalWorkDuration: 0,
});

const inputClass = "block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const textareaClass = `${inputClass} min-h-[120px]`;

const TicketFormModal: React.FC<TicketFormModalProps> = ({ isOpen, onClose, onSave, ticket, customers, users, currentUser, referrals, supportContracts }) => {
  const [formData, setFormData] = useState<Ticket | Omit<Ticket, 'id'>>(() => getInitialState(currentUser));
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmationData, setConfirmationData] = useState<Ticket | Omit<Ticket, 'id'> | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isReadOnly = ticket 
    ? (
        (new Date().getTime() > new Date(ticket.editableUntil).getTime() || ticket.status === 'اتمام یافته') 
        && currentUser.role !== 'مدیر' // Managers can always edit.
      ) 
    : false;

  const modalTitle = ticket 
    ? (isReadOnly ? `مشاهده تیکت #${ticket.ticketNumber}` : `ویرایش تیکت #${ticket.ticketNumber}`)
    : 'ایجاد تیکت جدید';
  
  const ticketHistory = ticket ? referrals.filter(r => r.ticket.id === ticket.id).sort((a,b) => new Date(a.referralDate).getTime() - new Date(b.referralDate).getTime()) : [];
  
  useEffect(() => {
    if (isOpen) {
        if (ticket) {
            const validPriorities: TicketPriority[] = ['کم', 'متوسط', 'اضطراری'];
            const validatedTicket = {
                ...ticket,
                // If the ticket's priority is not one of the valid options, default to 'متوسط'
                priority: validPriorities.includes(ticket.priority) ? ticket.priority : 'متوسط',
            };
            setFormData(validatedTicket);
        } else {
            setFormData(getInitialState(currentUser));
        }
    } else {
        setTimeout(() => {
            setFormData(getInitialState(currentUser));
            setNewAttachments([]);
            setErrors([]);
            setConfirmationData(null);
        }, 300);
    }
  }, [ticket, isOpen, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      
      const validationErrors: string[] = [];
      const validFiles: File[] = [];

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          validationErrors.push(`نوع فایل "${file.name}" مجاز نیست (فقط عکس و PDF).`);
          continue;
        }
        if (file.size > 500 * 1024) { // 500KB limit
          validationErrors.push(`حجم فایل "${file.name}" بیشتر از ۵۰۰ کیلوبایت است.`);
          continue;
        }
        validFiles.push(file);
      }

      if (validationErrors.length > 0) {
        setErrors(prev => [...prev, ...validationErrors]);
      }

      setNewAttachments(prev => [...prev, ...validFiles]);
      e.target.value = ''; // Reset input to allow re-selecting the same file
  };

  const handleRemoveAttachment = (itemToRemove: string) => {
    // If it's a URL, remove from formData.attachments
    if (itemToRemove.startsWith('http')) {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter(url => url !== itemToRemove)
        }));
    } else { // It's a file name from newAttachments
        setNewAttachments(prev => prev.filter(f => f.name !== itemToRemove));
    }
  };
  
  const handleFinalSave = async (dataToProcess: Ticket | Omit<Ticket, 'id'>) => {
    if (isReadOnly || isUploading) return;
    setIsUploading(true);
    setErrors([]);
    try {
        const uploadedUrls: string[] = [];
        if (newAttachments.length > 0) {
            const ticketIdForPath = 'ticketNumber' in dataToProcess && dataToProcess.ticketNumber ? dataToProcess.ticketNumber : `new-${Date.now()}`;
            for (const file of newAttachments) {
                const filePath = `${ticketIdForPath}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);
                if (uploadError) throw new Error(`خطا در آپلود فایل ${file.name}: ${uploadError.message}`);
                
                const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
                if (!data.publicUrl) throw new Error(`Could not get public URL for ${file.name}`);
                uploadedUrls.push(data.publicUrl);
            }
        }
        
        const finalData = {
            ...dataToProcess,
            lastUpdateDate: formatJalaaliDateTime(new Date()),
            attachments: [...dataToProcess.attachments, ...uploadedUrls]
        };
        onSave(finalData);
    } catch (error: any) {
        setErrors([error.message || 'یک خطای ناشناخته رخ داد.']);
    } finally {
        setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(isReadOnly) return;

    const validationErrors: string[] = [];
    if (!formData.title.trim()) validationErrors.push('عنوان تیکت الزامی است.');
    if (!formData.customerId) validationErrors.push('انتخاب مشتری الزامی است.');
    if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
    }
    
    // Final validation layer to guarantee priority is correct before saving.
    const validPriorities: TicketPriority[] = ['کم', 'متوسط', 'اضطراری'];
    const finalPriority = validPriorities.includes(formData.priority) ? formData.priority : 'متوسط';

    const dataToSave = { ...formData, priority: finalPriority };

    // Check for support contract only when creating a new ticket
    if (!ticket && formData.customerId) {
        const hasActiveContract = supportContracts.some(
            c => c.customerId === formData.customerId && getCalculatedStatus(c.endDate, c.status) === 'فعال'
        );

        if (!hasActiveContract) {
            setConfirmationData(dataToSave);
            return;
        }
    }
    
    handleFinalSave(dataToSave);
  };

  const handleConfirmSave = () => {
    if (confirmationData) {
        handleFinalSave(confirmationData);
    }
    setConfirmationData(null);
  };
  
  const allAttachments = [...formData.attachments, ...newAttachments.map(f => f.name)];
  
  const searchableOptions = useMemo(() => {
    const customerOptions = customers.map(c => {
      // A customer is considered "inactive" for support if their global status is inactive
      // OR if they don't have at least one active support contract.
      const isGloballyInactive = c.status === 'غیرفعال';
      
      const hasActiveContract = supportContracts.some(
        sc => sc.customerId === c.id && getCalculatedStatus(sc.endDate, sc.status) === 'فعال'
      );
  
      const isEffectivelyInactive = isGloballyInactive || !hasActiveContract;
  
      return {
        value: c.id,
        label: `${c.companyName} (${c.firstName} ${c.lastName})`,
        // If inactive, apply red style. Otherwise, apply nothing.
        className: isEffectivelyInactive ? 'text-red-600 font-semibold' : ''
      };
    });

    return {
      titles: ticketTypeOptions.map(t => ({ value: t, label: t })),
      customers: customerOptions,
      users: users.map(u => ({ value: u.username, label: `${u.firstName} ${u.lastName}` })),
      types: ticketTypeOptions.map(t => ({ value: t, label: t })),
    };
  }, [customers, users, supportContracts]);


  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium leading-6 text-cyan-600">{modalTitle}</h3>
            {isReadOnly && <p className="text-sm text-amber-600 mt-1">زمان ویرایش این تیکت به پایان رسیده یا تیکت اتمام یافته است و در حالت فقط-خواندنی نمایش داده می‌شود.</p>}
          </div>

          <div className="p-6 space-y-6">
            <Alert messages={errors} onClose={() => setErrors([])} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
              <div>
                <label htmlFor="title" className={labelClass}>عنوان تیکت</label>
                <SearchableSelect
                  options={searchableOptions.titles}
                  value={formData.title}
                  onChange={value => setFormData(f => ({ ...f, title: String(value) }))}
                  placeholder="انتخاب یا جستجوی عنوان..."
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label htmlFor="customerId" className={labelClass}>مشتری</label>
                <SearchableSelect
                  options={searchableOptions.customers}
                  value={formData.customerId}
                  onChange={value => setFormData(f => ({ ...f, customerId: Number(value) }))}
                  placeholder="انتخاب یا جستجوی مشتری..."
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label htmlFor="assignedToUsername" className={labelClass}>کاربر مسئول</label>
                <SearchableSelect
                  options={searchableOptions.users}
                  value={formData.assignedToUsername}
                  onChange={value => setFormData(f => ({ ...f, assignedToUsername: String(value) }))}
                  placeholder="انتخاب یا جستجوی کاربر..."
                  disabled={isReadOnly}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="description" className={labelClass}>شرح کامل</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} className={textareaClass} disabled={isReadOnly}></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
              <div>
                <label htmlFor="priority" className={labelClass}>اولویت</label>
                <select id="priority" name="priority" value={formData.priority} onChange={handleChange} className={inputClass} disabled={isReadOnly}>
                  {(['کم', 'متوسط', 'اضطراری'] as TicketPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="type" className={labelClass}>نوع مشکل</label>
                <SearchableSelect
                  options={searchableOptions.types}
                  value={formData.type}
                  onChange={value => setFormData(f => ({ ...f, type: value as TicketType }))}
                  placeholder="انتخاب یا جستجوی نوع..."
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label htmlFor="channel" className={labelClass}>کانال ورودی</label>
                <select id="channel" name="channel" value={formData.channel} onChange={handleChange} className={inputClass} disabled={isReadOnly}>
                  {(['تلفن', 'ایمیل', 'پورتال', 'حضوری'] as TicketChannel[]).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            
            <div>
                <label className={labelClass}>فایل‌های پیوست (عکس یا PDF، حداکثر ۵۰۰ کیلوبایت)</label>
                {!isReadOnly && (
                  <div className="mt-2 mb-4">
                    <input type="file" id="file-upload" multiple accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" disabled={isUploading} />
                    <label htmlFor="file-upload" className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}>
                      <FileUploadIcon />
                      <span>افزودن فایل</span>
                    </label>
                  </div>
                )}
                {allAttachments.length > 0 ? (
                  <div className="mt-4 border rounded-md p-3 bg-gray-50 max-h-40 overflow-y-auto space-y-2">
                      {allAttachments.map((item, index) => (
                        <div key={`${item}-${index}`} className="flex items-center justify-between p-2 bg-white border rounded-md text-sm">
                          <div className="flex items-center gap-2 text-slate-700 truncate">
                              <PaperClipIcon />
                              <span className="truncate">{item.startsWith('http') ? new URL(item).pathname.split('/').pop() : item}</span>
                          </div>
                          {!isReadOnly && (
                            <button type="button" onClick={() => handleRemoveAttachment(item)} className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 transition-colors">
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="mt-2 text-center text-sm text-gray-400 p-4 border border-dashed rounded-md">
                      هیچ فایلی پیوست نشده است.
                  </div>
                )}
            </div>
            
            {ticketHistory.length > 0 && (
              <div>
                  <label className={labelClass}>تاریخچه ارجاعات</label>
                  <ReferralHistoryTimeline history={ticketHistory} users={users} />
              </div>
            )}

          </div>

          <div className="p-4 bg-gray-50 border-t flex justify-end items-center">
              <div className="flex gap-3">
                  <button type="button" onClick={onClose} disabled={isUploading} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 disabled:bg-gray-200">
                      {isReadOnly ? 'بستن' : 'انصراف'}
                  </button>
                  {!isReadOnly && (
                      <button type="submit" disabled={isUploading} className="px-4 py-2 w-32 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 flex justify-center items-center transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white disabled:bg-gray-400">
                         {isUploading ? <LoadingSpinnerIcon /> : (ticket ? 'ذخیره تغییرات' : 'ایجاد تیکت')}
                      </button>
                  )}
              </div>
          </div>
        </form>
      </Modal>
      <ConfirmationModal
        isOpen={!!confirmationData}
        onClose={() => setConfirmationData(null)}
        onConfirm={handleConfirmSave}
        title="هشدار قرارداد پشتیبانی"
        message="قرارداد پشتیبانی این مشتری منقضی شده یا وجود ندارد. آیا مایل به ثبت تیکت هستید؟"
        confirmText="بله، ثبت شود"
        cancelText="انصراف"
        confirmButtonColor="bg-orange-500 hover:bg-orange-600"
      />
    </>
  );
};

export default TicketFormModal;