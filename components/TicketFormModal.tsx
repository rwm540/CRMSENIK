import React, { useState, useEffect } from 'react';
import { Ticket, Customer, User, Referral, SupportContract, TicketType, TicketPriority, TicketChannel } from '../types';
import Modal from './Modal';
import Alert from './Alert';
import SearchableSelect from './SearchableSelect';
import ReferralHistoryTimeline from './ReferralHistoryTimeline';
import { supabase, BUCKET_NAME } from '../supabaseClient';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FileUploadIcon } from './icons/FileUploadIcon';

interface TicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: Ticket | Omit<Ticket, 'id'>, isFromReferral?: boolean) => Promise<void> | void;
  ticket: Ticket | null;
  customers: Customer[];
  users: User[];
  currentUser: User;
  referrals: Referral[];
  supportContracts: SupportContract[];
  onShowAttachments?: (attachments: string[]) => void;
}

// FIX: Updated the getInitialState function to return a complete `Omit<Ticket, 'id'>` object by adding dummy values for properties that are generated on save. This resolves a TypeScript error where the formData for a new ticket was missing properties expected by the onSave handler.
const getInitialState = (currentUser: User): Omit<Ticket, 'id'> => ({
  title: '',
  description: '',
  customerId: 0,
  status: 'انجام نشده',
  priority: 'متوسط',
  type: 'سایر',
  channel: 'تلفن',
  assignedToUsername: currentUser.username,
  attachments: [],
  workSessionStartedAt: undefined,
  totalWorkDuration: 0,
  // Properties for new tickets, will be set on the server/App.tsx
  ticketNumber: '',
  creationDateTime: '',
  lastUpdateDate: '',
  editableUntil: '',
});

const getFilenameFromUrl = (url: string) => {
    try {
        const decodedUrl = decodeURIComponent(url);
        return decodedUrl.split('/').pop()?.split('?')[0] || 'فایل پیوست';
    } catch (e) {
        return url.split('/').pop()?.split('?')[0] || 'فایل پیوست';
    }
};

const TicketFormModal: React.FC<TicketFormModalProps> = ({ isOpen, onClose, onSave, ticket, customers, users, currentUser, referrals, supportContracts, onShowAttachments }) => {
  const [formData, setFormData] = useState(getInitialState(currentUser));
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStillEditable, setIsStillEditable] = useState(true);
  const [isReadOnlyAlertVisible, setIsReadOnlyAlertVisible] = useState(true);

  const ticketTypes: TicketType[] = ['نصب', 'اپدیت', 'اموزش', 'طراحی و چاپ', 'تبدیل اطلاعات', 'رفع اشکال', 'راه اندازی', 'مشکل برنامه نویسی', 'سایر', 'فراصدر', 'گزارشات', 'تنظیمات نرم افزاری', 'مجوزدهی', 'صندوق', 'پوز', 'ترازو', 'انبار', 'چک', 'تعریف', 'سیستم', 'مودیان', 'بیمه', 'حقوق دستمزد', 'بکاپ', 'اوند', 'کیوسک', 'افتتاحیه', 'اختتامیه', 'تغییر مسیر', 'پرینتر', 'کارتخوان', 'sql', 'پنل پیامکی', 'کلاینت', 'صورتحساب', 'مغایرت گیری', 'ویندوزی', 'چاپ', 'پایان سال', 'دمو', 'خطا', 'درخواست', 'مشکل'];
  const ticketPriorities: TicketPriority[] = ['کم', 'متوسط', 'اضطراری'];
  const ticketChannels: TicketChannel[] = ['تلفن', 'ایمیل', 'پورتال', 'حضوری'];
  
  const referralHistory = ticket ? referrals.filter(r => r.ticketId === ticket.id).sort((a,b) => new Date(a.referralDate).getTime() - new Date(b.referralDate).getTime()) : [];
  
  useEffect(() => {
    if (isOpen) {
      setIsReadOnlyAlertVisible(true); // Reset alert visibility on open
      if (ticket) {
        setFormData(ticket);
        setIsStillEditable(new Date().getTime() < new Date(ticket.editableUntil).getTime());
      } else {
        setFormData(getInitialState(currentUser));
        setIsStillEditable(true);
      }
    } else {
        setTimeout(() => {
            setFormData(getInitialState(currentUser));
            setErrors([]);
            setIsSubmitting(false);
        }, 300);
    }
  }, [ticket, isOpen, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsSubmitting(true);
    const uploadPromises = Array.from(files).map(async file => {
      const filePath = `${currentUser.username}/tickets/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      return data.publicUrl;
    });

    try {
      const newUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...newUrls] }));
    } catch (error: any) {
      setErrors([`خطا در آپلود فایل: ${error.message}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAttachment = (urlToRemove: string) => {
    setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(url => url !== urlToRemove) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
        setErrors(['لطفا یک مشتری انتخاب کنید.']);
        return;
    }
    if (!formData.title.trim()) {
        setErrors(['عنوان تیکت نمی‌تواند خالی باشد.']);
        return;
    }

    setIsSubmitting(true);
    try {
        await onSave(formData);
        onClose();
    } catch (error) {
        // FIX: The caught error is of type 'unknown'. Cast to 'any' to access the 'message' property.
        // This addresses potential errors from accessing properties on an untyped error object.
        setErrors(['خطا در ذخیره تیکت.', (error as any).message || 'خطای ناشناخته']);
    } finally {
        setIsSubmitting(false);
    }
  };

  const isReadOnly = !isStillEditable && ticket !== null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <h3 className="text-lg font-medium leading-6 text-cyan-600 mb-4">{ticket ? 'ویرایش تیکت' : 'افزودن تیکت جدید'}</h3>
          {isReadOnly && isReadOnlyAlertVisible && <Alert messages={['زمان ویرایش این تیکت به پایان رسیده است. فقط حالت نمایش فعال است.']} type="error" onClose={() => setIsReadOnlyAlertVisible(false)} />}
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
            <Alert messages={errors} onClose={() => setErrors([])} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SearchableSelect options={customers.map(c => ({ value: c.id, label: `${c.companyName} (${c.firstName} ${c.lastName})`}))} value={formData.customerId} onChange={val => setFormData(f => ({ ...f, customerId: Number(val) }))} placeholder="انتخاب مشتری..." disabled={isReadOnly} />
              <SearchableSelect options={users.map(u => ({ value: u.username, label: `${u.firstName} ${u.lastName}` }))} value={formData.assignedToUsername} onChange={val => setFormData(f => ({ ...f, assignedToUsername: String(val) }))} placeholder="ارجاع به..." disabled={isReadOnly} />
            </div>
            <input name="title" value={formData.title} onChange={handleChange} placeholder="عنوان تیکت" className="w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3" readOnly={isReadOnly} />
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="شرح کامل تیکت..." className="w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 min-h-[120px]" readOnly={isReadOnly}></textarea>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3" disabled={isReadOnly}>
                {ticketTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select name="priority" value={formData.priority} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3" disabled={isReadOnly}>
                {ticketPriorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select name="channel" value={formData.channel} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3" disabled={isReadOnly}>
                {ticketChannels.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">پیوست‌ها</label>
                {!isReadOnly && (
                    <>
                        <input type="file" onChange={handleFileUpload} multiple id="file-upload" className="hidden" disabled={isSubmitting}/>
                        <label htmlFor="file-upload" className="cursor-pointer flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md hover:bg-gray-50">
                            <FileUploadIcon /><span>برای آپلود فایل کلیک کنید یا فایل‌ها را اینجا بکشید</span>
                        </label>
                    </>
                )}
                {formData.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {formData.attachments.map(url => (
                            <div key={url} className="flex items-center justify-between text-sm bg-gray-100 p-2 rounded">
                                 <button 
                                    type="button" 
                                    onClick={() => onShowAttachments?.([url])} 
                                    className="text-cyan-600 hover:underline truncate text-right flex-grow"
                                    title="مشاهده پیوست"
                                >
                                    {getFilenameFromUrl(url)}
                                </button>
                                {!isReadOnly && (
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveAttachment(url)}
                                        className="p-1 text-red-500 hover:bg-red-100 rounded-full flex-shrink-0"
                                        title="حذف پیوست"
                                    >
                                        <TrashIcon />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {referralHistory.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تاریخچه ارجاعات</label>
                <ReferralHistoryTimeline history={referralHistory} users={users} />
              </div>
            )}
          </div>
        </div>
        <div className="pt-4 px-6 pb-4 flex justify-end gap-3 border-t bg-gray-50 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100">انصراف</button>
          {!isReadOnly && <button type="submit" disabled={isSubmitting} className="px-4 py-2 w-28 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 flex items-center justify-center">{isSubmitting ? <LoadingSpinnerIcon /> : 'ذخیره'}</button>}
        </div>
      </form>
    </Modal>
  );
};

export default TicketFormModal;