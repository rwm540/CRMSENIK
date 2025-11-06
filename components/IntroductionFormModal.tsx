import React, { useState, useEffect } from 'react';
import { CustomerIntroduction, User, FamiliarityLevel, IntroductionReferral } from '../types';
import Modal from './Modal';
import Alert from './Alert';
import DatePicker from './DatePicker';
import SearchableSelect from './SearchableSelect';
import { formatJalaali } from '../utils/dateFormatter';
import IntroductionReferralHistory from './IntroductionReferralHistory';

interface IntroductionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (intro: CustomerIntroduction | Omit<CustomerIntroduction, 'id'>) => void;
  introduction: CustomerIntroduction | null;
  currentUser: User;
  assignableUsers: User[];
  introductionHistory: IntroductionReferral[];
}

const getInitialState = (currentUser: User): Omit<CustomerIntroduction, 'id'> => ({
  introducerUsername: currentUser.username,
  assignedToUsername: currentUser.username,
  customerName: '',
  keyPersonName: '',
  position: '',
  contactNumber: '',
  businessType: '',
  location: '',
  mainNeed: '',
  familiarityLevel: 'جدید',
  introductionDate: formatJalaali(new Date()),
  acquaintanceDetails: '',
  status: 'جدید',
});

const inputClass = "mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const IntroductionFormModal: React.FC<IntroductionFormModalProps> = ({ isOpen, onClose, onSave, introduction, currentUser, assignableUsers, introductionHistory }) => {
  const [formData, setFormData] = useState(() => getInitialState(currentUser));
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
        setFormData(introduction ? { ...introduction } : getInitialState(currentUser));
    } else {
        setTimeout(() => {
            setFormData(getInitialState(currentUser));
            setErrors([]);
        }, 300);
    }
  }, [introduction, isOpen, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: string[] = [];

    if (!formData.customerName.trim()) validationErrors.push('نام مشتری/شرکت الزامی است.');
    if (!formData.contactNumber.trim()) validationErrors.push('شماره تماس الزامی است.');
    if (!formData.assignedToUsername) validationErrors.push('باید یک مسئول پیگیری انتخاب شود.');
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <h3 className="text-lg font-medium leading-6 text-cyan-600 mb-4">
            {introduction ? 'ویرایش معرفی مشتری' : 'ثبت معرفی جدید'}
          </h3>
          <div className="space-y-4">
            <Alert messages={errors} onClose={() => setErrors([])} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelClass}>نام مشتری/شرکت</label><input type="text" name="customerName" value={formData.customerName} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>نام فرد کلیدی</label><input type="text" name="keyPersonName" value={formData.keyPersonName} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>سمت</label><input type="text" name="position" value={formData.position} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>شماره تماس</label><input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>نوع کسب‌وکار</label><input type="text" name="businessType" value={formData.businessType} onChange={handleChange} className={inputClass} /></div>
              <div><label className={labelClass}>محل فعالیت (شهر/منطقه)</label><input type="text" name="location" value={formData.location} onChange={handleChange} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className={labelClass}>نیاز یا دغدغه اصلی</label><textarea name="mainNeed" value={formData.mainNeed} onChange={handleChange} className={`${inputClass} min-h-[80px]`}></textarea></div>
              <div><label className={labelClass}>سطح آشنایی با سه‌نیک</label><select name="familiarityLevel" value={formData.familiarityLevel} onChange={handleChange} className={inputClass}>{(['آشنا', 'جدید'] as FamiliarityLevel[]).map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className={labelClass}>تاریخ معرفی</label><DatePicker value={formData.introductionDate} onChange={date => setFormData(f => ({...f, introductionDate: date}))} /></div>
              <div className="sm:col-span-2"><label className={labelClass}>نحوه آشنایی</label><textarea name="acquaintanceDetails" value={formData.acquaintanceDetails} onChange={handleChange} className={`${inputClass} min-h-[80px]`}></textarea></div>
               <div><label className={labelClass}>مسئول پیگیری</label><SearchableSelect options={assignableUsers.map(u => ({value: u.username, label: `${u.firstName} ${u.lastName} (${u.role})`}))} value={formData.assignedToUsername} onChange={val => setFormData(f => ({...f, assignedToUsername: String(val)}))} /></div>
            </div>
             {introduction && introductionHistory && (
              <div className="mt-4">
                <label className={labelClass}>تاریخچه ارجاعات</label>
                <IntroductionReferralHistory history={introductionHistory} users={assignableUsers} />
              </div>
            )}
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100">انصراف</button>
          <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">ذخیره</button>
        </div>
      </form>
    </Modal>
  );
};

export default IntroductionFormModal;
