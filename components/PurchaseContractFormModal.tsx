import React, { useState, useEffect } from 'react';
import { PurchaseContract, User, Customer, ContractType, PaymentMethod, PaymentStatus, NetworkSupport, UserRole } from '../types';
import Modal from './Modal';
import DatePicker from './DatePicker';
import Alert from './Alert';
import { formatCurrency, convertPersianToEnglish, getPurchaseContractStatusByDate } from '../utils/dateFormatter';
import SearchableSelect from './SearchableSelect';
import { supabase, BUCKET_NAME } from '../supabaseClient';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';
import { FileUploadIcon } from './icons/FileUploadIcon';
import { TrashIcon } from './icons/TrashIcon';

interface PurchaseContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: PurchaseContract | Omit<PurchaseContract, 'id'>) => Promise<void>;
  contract: PurchaseContract | null;
  users: User[];
  contracts: PurchaseContract[];
  customers: Customer[];
  currentUser: User;
}

const getInitialState = (currentUser: User, contracts: PurchaseContract[]): Omit<PurchaseContract, 'id'> => {
  const lastContractNum = Math.max(0, ...contracts.map(c => parseInt(c.contractId.replace('PC-', ''), 10) || 0));
  const newContractId = `PC-${String(lastContractNum + 1).padStart(4, '0')}`;
  
  return {
    contractId: newContractId,
    contractStartDate: '',
    contractEndDate: '',
    contractDate: '',
    contractType: "خرید دائم",
    contractStatus: 'در انتظار تایید',
    softwareVersion: '1.0.0',
    customerId: null,
    economicCode: '',
    customerAddress: '',
    customerContact: '',
    customerRepresentative: '',
    vendorName: 'شرکت نرم افزاری',
    salespersonUsername: null,
    softwareName: '',
    licenseCount: 1,
    softwareDescription: '',
    platform: 'Windows',
    networkSupport: "خیر",
    webMobileSupport: '',
    initialTraining: '',
    setupAndInstallation: '',
    technicalSupport: 'یک سال پشتیبانی رایگان',
    updates: 'یک سال آپدیت رایگان',
    customizations: '',
    totalAmount: 0,
    prepayment: 0,
    paymentStages: '',
    paymentMethods: [],
    paymentStatus: "در حال پیگیری",
    invoiceNumber: '',
    attachments: [],
    deliverySchedule: '',
    moduleList: '',
    terminationConditions: '',
    warrantyConditions: '',
    ownershipRights: 'حقوق مالکیت نرم افزار متعلق به فروشنده است.',
    confidentialityClause: 'طرفین متعهد به حفظ اطلاعات محرمانه هستند.',
    nonCompeteClause: '',
    disputeResolution: 'از طریق مراجع قانونی',
    lastStatusChangeDate: new Date().toISOString(),
    crmResponsibleUsername: currentUser.username,
    notes: '',
    futureTasks: '',
  };
};

const inputClass = "block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><label className={labelClass}>{label}</label>{children}</div>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h4 className="col-span-full text-md font-semibold text-slate-700 border-b pb-2 mb-2">{title}</h4>
);

const getFilenameFromUrl = (url: string) => {
    try {
        const decodedUrl = decodeURIComponent(url);
        return decodedUrl.split('/').pop()?.split('?')[0] || 'فایل پیوست';
    } catch (e) {
        return url.split('/').pop()?.split('?')[0] || 'فایل پیوست';
    }
};

const PurchaseContractFormModal: React.FC<PurchaseContractFormModalProps> = ({ isOpen, onClose, onSave, contract, users, contracts, customers, currentUser }) => {
  const [formData, setFormData] = useState(() => getInitialState(currentUser, contracts));
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const salesSpecialists = users.filter(u => u.role === 'کارشناس فروش' || u.role === 'مسئول فروش' || u.role === 'مدیر');

  useEffect(() => {
    if (isOpen) {
      if (contract) {
        setFormData(contract);
      } else {
        setFormData(getInitialState(currentUser, contracts));
      }
    } else {
      setTimeout(() => {
        setErrors([]);
        setIsSubmitting(false);
      }, 300);
    }
  }, [contract, isOpen, currentUser, contracts]);

  const handleCustomerChange = (customerId: number | string) => {
    const selectedCustomer = customers.find(c => c.id === Number(customerId));
    if (selectedCustomer) {
      setFormData(prev => ({
        ...prev,
        customerId: selectedCustomer.id,
        economicCode: selectedCustomer.taxCode,
        customerAddress: selectedCustomer.address,
        customerContact: selectedCustomer.mobileNumbers[0] || selectedCustomer.phone[0] || '',
        customerRepresentative: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'totalAmount' | 'prepayment') => {
    const rawValue = e.target.value;
    const numericValue = parseInt(convertPersianToEnglish(rawValue).replace(/[^0-9]/g, ''), 10) || 0;
    setFormData(prev => ({ ...prev, [field]: numericValue }));
  };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsSubmitting(true);
        const currentAttachments = [...formData.attachments];
        
        try {
            for (const file of Array.from(files)) {
                const fileExt = file.name.split('.').pop();
                const fileName = `contract-${formData.contractId}-${Date.now()}.${fileExt}`;
                const filePath = `${currentUser.username}/${fileName}`;
                
                const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);

                if (uploadError) {
                    throw new Error(`خطا در آپلود ${file.name}: ${uploadError.message}`);
                }
                
                const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
                currentAttachments.push(data.publicUrl);
            }
            setFormData(prev => ({...prev, attachments: currentAttachments}));
        } catch (error) {
            // FIX: The caught error is of type 'unknown'. Cast to 'any' to access the 'message' property.
            setErrors(prev => [...prev, (error as any).message]);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRemoveAttachment = async (urlToRemove: string) => {
        const isConfirmed = window.confirm('آیا از حذف این پیوست اطمینان دارید؟');
        if (!isConfirmed) return;

        setIsSubmitting(true);
        try {
            const filePath = new URL(urlToRemove).pathname.split(`/${BUCKET_NAME}/`)[1];
            await supabase.storage.from(BUCKET_NAME).remove([filePath]);
            setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(url => url !== urlToRemove) }));
        } catch (error) {
            // FIX: The caught error is of type 'unknown'. Cast to 'any' to access the 'message' property for better feedback.
            setErrors(prev => [...prev, `خطا در حذف پیوست از سرور. ${(error as any).message}`]);
        } finally {
            setIsSubmitting(false);
        }
    };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    if (!formData.customerId) {
      setErrors(['لطفا یک مشتری انتخاب کنید.']);
      return;
    }
    setIsSubmitting(true);
    try {
      const finalData = {
        ...formData,
        contractStatus: getPurchaseContractStatusByDate(formData.contractStartDate, formData.contractEndDate),
        lastStatusChangeDate: new Date().toISOString(),
      };
      await onSave(finalData as PurchaseContract | Omit<PurchaseContract, 'id'>);
      onClose();
    } catch (error: any) {
      setErrors(['خطا در ذخیره سازی قرارداد.', error.message || 'لطفا با پشتیبانی تماس بگیرید.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl">
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <h3 className="text-lg font-medium leading-6 text-cyan-600 mb-4">
            {contract ? 'ویرایش قرارداد فروش' : 'افزودن قرارداد فروش'}
          </h3>
          <Alert messages={errors} onClose={() => setErrors([])} />
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 pb-4">
            
            {/* Main Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6">
                <SectionHeader title="اطلاعات اصلی قرارداد" />
                <FormField label="شناسه قرارداد"><input type="text" value={formData.contractId} readOnly className={`${inputClass} bg-slate-100`} /></FormField>
                <div className="lg:col-span-3">
                    <FormField label="مشتری">
                        <SearchableSelect options={customers.map(c => ({ value: c.id, label: `${c.companyName} (${c.firstName} ${c.lastName})` }))} value={formData.customerId} onChange={handleCustomerChange} placeholder="جستجوی مشتری..." />
                    </FormField>
                </div>
                <FormField label="تاریخ عقد قرارداد"><DatePicker value={formData.contractDate} onChange={d => setFormData(f => ({ ...f, contractDate: d }))} /></FormField>
                <FormField label="تاریخ شروع"><DatePicker value={formData.contractStartDate} onChange={d => setFormData(f => ({ ...f, contractStartDate: d }))} /></FormField>
                <FormField label="تاریخ پایان"><DatePicker value={formData.contractEndDate} onChange={d => setFormData(f => ({ ...f, contractEndDate: d }))} /></FormField>
                <FormField label="مسئول CRM"><input type="text" value={currentUser.username} readOnly className={`${inputClass} bg-slate-100`} /></FormField>
            </div>
            
            {/* Software Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                <SectionHeader title="جزئیات نرم افزار و فروش" />
                <FormField label="نام نرم افزار"><input name="softwareName" value={formData.softwareName} onChange={handleChange} className={inputClass} /></FormField>
                <FormField label="نسخه"><input name="softwareVersion" value={formData.softwareVersion} onChange={handleChange} className={inputClass} /></FormField>
                <FormField label="تعداد مجوز"><input name="licenseCount" type="number" value={formData.licenseCount} onChange={handleChange} className={inputClass} /></FormField>
                <FormField label="پلتفرم"><input name="platform" value={formData.platform} onChange={handleChange} className={inputClass} /></FormField>
                <FormField label="پشتیبانی شبکه">
                    <select name="networkSupport" value={formData.networkSupport} onChange={handleChange} className={inputClass}>
                        <option value="بله">بله</option><option value="خیر">خیر</option>
                    </select>
                </FormField>
                <FormField label="مسئول فروش">
                     <SearchableSelect options={salesSpecialists.map(u => ({ value: u.username, label: `${u.firstName} ${u.lastName}` }))} value={formData.salespersonUsername} onChange={val => setFormData(f => ({ ...f, salespersonUsername: String(val) }))} placeholder="انتخاب کنید..." />
                </FormField>
                <div className="lg:col-span-3"><FormField label="شرح نرم افزار و ماژول ها"><textarea name="softwareDescription" value={formData.softwareDescription} onChange={handleChange} className={`${inputClass} min-h-[80px]`}></textarea></FormField></div>
            </div>

            {/* Financial Details */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                <SectionHeader title="جزئیات مالی" />
                <FormField label="مبلغ کل (ریال)"><input value={formatCurrency(formData.totalAmount)} onChange={e => handleAmountChange(e, 'totalAmount')} className={`${inputClass} font-mono`} /></FormField>
                <FormField label="پیش پرداخت (ریال)"><input value={formatCurrency(formData.prepayment)} onChange={e => handleAmountChange(e, 'prepayment')} className={`${inputClass} font-mono`} /></FormField>
                <FormField label="وضعیت پرداخت">
                    <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className={inputClass}>
                        <option value="پرداخت شده">پرداخت شده</option><option value="بدهی باقی مانده">بدهی باقی مانده</option><option value="در حال پیگیری">در حال پیگیری</option>
                    </select>
                </FormField>
                <div className="lg:col-span-3"><FormField label="مراحل پرداخت"><input name="paymentStages" value={formData.paymentStages} onChange={handleChange} className={inputClass} /></FormField></div>
            </div>
            
            {/* Attachments */}
            <div>
                <h4 className="col-span-full text-md font-semibold text-slate-700 border-b pb-2 mb-4">پیوست ها</h4>
                <div className="space-y-3">
                     <input type="file" multiple onChange={handleFileUpload} id="contract-attachments-upload" className="hidden" disabled={isSubmitting} />
                     <label htmlFor="contract-attachments-upload" className={`cursor-pointer flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md ${isSubmitting ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                        {isSubmitting ? <LoadingSpinnerIcon className="h-6 w-6 text-cyan-600" /> : <FileUploadIcon />}
                        <span>{isSubmitting ? 'در حال آپلود...' : 'افزودن پیوست جدید'}</span>
                    </label>
                    {formData.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                            {formData.attachments.map(url => (
                                <div key={url} className="flex items-center justify-between text-sm bg-gray-100 p-2 rounded">
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline truncate text-right flex-grow" title={getFilenameFromUrl(url)}>
                                        {getFilenameFromUrl(url)}
                                    </a>
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveAttachment(url)}
                                        className="p-1 text-red-500 hover:bg-red-100 rounded-full flex-shrink-0 ml-2"
                                        title="حذف پیوست"
                                        disabled={isSubmitting}
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

          </div>
        </div>
        <div className="pt-4 px-6 pb-4 flex justify-end gap-3 border-t bg-gray-50 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100">انصراف</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 w-28 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 flex items-center justify-center">
            {isSubmitting ? <LoadingSpinnerIcon /> : 'ذخیره'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PurchaseContractFormModal;