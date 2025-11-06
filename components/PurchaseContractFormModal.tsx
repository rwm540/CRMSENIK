import React, { useState, useEffect } from 'react';
import { PurchaseContract, User, Customer, ContractType, ContractStatus, NetworkSupport, PaymentMethod, PaymentStatus } from '../types';
import Modal from './Modal';
import DatePicker from './DatePicker';
import { FileUploadIcon } from './icons/FileUploadIcon';
import Alert from './Alert';
import { getPurchaseContractStatusByDate, formatCurrency, convertPersianToEnglish } from '../utils/dateFormatter';
import SearchableSelect from './SearchableSelect';
import jalaali from 'jalaali-js';
import { supabase, BUCKET_NAME } from '../supabaseClient';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';
import { TrashIcon } from './icons/TrashIcon';

// declare const jalaali: any;

interface PurchaseContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: PurchaseContract | Omit<PurchaseContract, 'id'>) => void;
  contract: PurchaseContract | null;
  users: User[];
  contracts: PurchaseContract[];
  customers: Customer[];
  currentUser: User;
}

const getInitialState = (currentUser: User): Omit<PurchaseContract, 'id'> => {
  const today = new Date();
  const jalaaliDate = jalaali.toJalaali(today);
  const formattedDate = `${jalaaliDate.jy}/${String(jalaaliDate.jm).padStart(2, '0')}/${String(jalaaliDate.jd).padStart(2, '0')}`;
  
  const nextYear = new Date(today);
  nextYear.setFullYear(today.getFullYear() + 1);
  const jalaaliNextYear = jalaali.toJalaali(nextYear);
  const formattedNextYear = `${jalaaliNextYear.jy}/${String(jalaaliNextYear.jm).padStart(2, '0')}/${String(jalaaliNextYear.jd).padStart(2, '0')}`;


  return {
    contractId: `PC-${jalaaliDate.jy}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    contractStartDate: formattedDate,
    contractEndDate: formattedNextYear,
    contractDate: formattedDate,
    contractType: "خرید دائم",
    contractStatus: "در انتظار تایید",
    softwareVersion: "",
    customerId: null,
    economicCode: "",
    customerAddress: "",
    customerContact: "",
    customerRepresentative: "",
    vendorName: "شرکت شما",
    salespersonUsername: currentUser.username,
    softwareName: "",
    licenseCount: 1,
    softwareDescription: "",
    platform: "",
    networkSupport: "بله",
    webMobileSupport: "خیر",
    initialTraining: "",
    setupAndInstallation: "",
    technicalSupport: "",
    updates: "",
    customizations: "",
    totalAmount: 0,
    prepayment: 0,
    paymentStages: "",
    paymentMethods: [],
    paymentStatus: "در حال پیگیری",
    invoiceNumber: "",
    signedContractPdf: "",
    salesInvoice: "",
    deliverySchedule: "",
    moduleList: "",
    terminationConditions: "",
    warrantyConditions: "",
    ownershipRights: "",
    confidentialityClause: "",
    nonCompeteClause: "",
    disputeResolution: "",
    lastStatusChangeDate: formattedDate,
    crmResponsibleUsername: currentUser.username,
    notes: "",
    futureTasks: "",
  };
};

const inputClass = "block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const textareaClass = `${inputClass} min-h-[80px]`;

const statusStyles: { [key in ContractStatus]: string } = {
  'فعال': 'bg-green-100 text-green-700',
  'در انتظار تایید': 'bg-yellow-100 text-yellow-700',
  'منقضی شده': 'bg-slate-100 text-slate-600',
  'لغو شده': 'bg-red-100 text-red-700',
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className={labelClass}>{label}</label>
    {children}
  </div>
);

const FileInput: React.FC<{ label: string; fileName: string; onFileChange: (file: File) => void; onClear: () => void; disabled?: boolean }> = ({ label, fileName, onFileChange, onClear, disabled }) => (
    <div>
        <label className={labelClass}>{label}</label>
        <div className="mt-1 flex items-center w-full">
            <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg ${disabled ? 'bg-gray-200 cursor-not-allowed' : 'cursor-pointer bg-gray-50 hover:bg-gray-100'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6 px-2 text-center">
                    <FileUploadIcon />
                    {fileName ? (
                         <p className="text-sm text-green-600 font-semibold truncate" title={fileName}>{fileName.startsWith('http') ? 'فایل موجود' : fileName}</p>
                    ) : (
                        <p className="text-xs text-gray-500">
                            <span className="font-semibold text-cyan-600">برای آپلود کلیک کنید</span> (عکس یا PDF، حداکثر ۵۰۰KB)
                        </p>
                    )}
                </div>
                {!disabled && <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files && e.target.files[0] && onFileChange(e.target.files[0])} />}
            </label>
            {fileName && !disabled && (
                <button type="button" onClick={onClear} className="p-2 ml-2 text-red-500 hover:bg-red-100 rounded-full">
                    <TrashIcon />
                </button>
            )}
        </div>
    </div>
);


const PurchaseContractFormModal: React.FC<PurchaseContractFormModalProps> = ({ isOpen, onClose, onSave, contract, users, contracts, customers, currentUser }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<Omit<PurchaseContract, 'id'>>(() => getInitialState(currentUser));
  const [errors, setErrors] = useState<string[]>([]);
  const [formattedTotalAmount, setFormattedTotalAmount] = useState('');
  const [formattedPrepayment, setFormattedPrepayment] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [filesToUpload, setFilesToUpload] = useState<Record<string, File>>({});
  const [isUploading, setIsUploading] = useState(false);
  
  const salesUsers = users.filter(user => user.role.includes('فروش') || user.role.includes('مدیر'));
  
  const softwareNameOptions = [
    'رستورانی', 'فروشگاهی', 'بازرگانی', 'زیر سیستم حقوق دستمزد', 'زیر سیستم بیمه', 'زیر سیستم کسر از حقوق', 'هتل و تالار',
    'ثبت سفارش', 'پخش', 'اشتراک و بن کارت', 'مودیان', 'باشگاه مشتریان', 'پذیرش', 'زیرسیستم سفارش روزانه',
    'زیرسیستم عملیات ارزی', 'زیرسیستم عملیات بودجه', 'زیرسیستم اسنپ مارکت', 'زیرسیستم پیگیری فروش', 'زیرسیستم فراصدر',
    'زیرسیستم سفارشی', 'زیرسیستم کلوپ بازی', 'زیر سیستم مدیریت شعب', 'زیرسیستم حسابداری مدیریت', 'زیرسیستم ایزارهای مالیاتی',
  ];

  useEffect(() => {
    if (isOpen) {
        const initialState = contract ? { ...contract } : getInitialState(currentUser);
        setFormData(initialState);
        setFormattedTotalAmount(formatCurrency(initialState.totalAmount));
        setFormattedPrepayment(formatCurrency(initialState.prepayment));
        if (initialState.customerId) {
            const customer = customers.find(c => c.id === initialState.customerId);
            setCustomerName(customer ? customer.companyName : '');
        } else {
            setCustomerName('');
        }
    } else {
        setTimeout(() => {
            const initial = getInitialState(currentUser);
            setFormData(initial);
            setFormattedTotalAmount(formatCurrency(initial.totalAmount));
            setFormattedPrepayment(formatCurrency(initial.prepayment));
            setCustomerName('');
            setFilesToUpload({});
            setActiveTab(0);
            setErrors([]);
        }, 300);
    }
  }, [contract, isOpen, customers, currentUser]);
  
  const handleCustomerSelect = (customerId: number | string) => {
    const customer = customers.find(c => c.id === Number(customerId));
    if (customer) {
        setFormData(prev => ({
            ...prev,
            customerId: customer.id,
            economicCode: customer.taxCode,
            customerAddress: customer.address,
            customerContact: customer.mobileNumbers[0] || customer.phone[0] || '',
            customerRepresentative: `${customer.firstName} ${customer.lastName}`
        }));
        setCustomerName(customer.companyName);
    } else {
        setFormData(prev => ({ ...prev, customerId: null }));
        setCustomerName('');
    }
  };
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'totalAmount' | 'prepayment') => {
    const rawValue = e.target.value;
    const englishValue = convertPersianToEnglish(rawValue);
    const numericString = englishValue.replace(/[^0-9]/g, '');
    const numericValue = numericString ? parseInt(numericString, 10) : 0;
    
    setFormData(prev => ({ ...prev, [field]: numericValue }));
    
    const formatted = numericString ? formatCurrency(numericValue) : '';
    if (field === 'totalAmount') {
        setFormattedTotalAmount(formatted);
    } else {
        setFormattedPrepayment(formatted);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    setFormData(prev => ({ ...prev, [name]: isNumber ? Number(value) : value }));
  };
  
  const handleDateChange = (field: keyof Omit<PurchaseContract, 'id'>, date: string) => {
    setFormData(prev => ({ ...prev, [field]: date }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    const method = value as PaymentMethod;
    setFormData(prev => ({
        ...prev,
        paymentMethods: checked
            ? [...prev.paymentMethods, method]
            : prev.paymentMethods.filter(pm => pm !== method)
    }));
  };

  const handleFileChange = (field: keyof Omit<PurchaseContract, 'id'>, file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setErrors(prev => [...prev, `نوع فایل "${file.name}" مجاز نیست. فقط عکس و PDF پشتیبانی می‌شود.`]);
        return;
    }
    if (file.size > 500 * 1024) { // 500KB limit
        setErrors(prev => [...prev, `حجم فایل "${file.name}" بیشتر از ۵۰۰ کیلوبایت است.`]);
        return;
    }
    setFilesToUpload(prev => ({ ...prev, [field as string]: file }));
    setFormData(prev => ({ ...prev, [field]: file.name }));
  };

  const handleClearFile = (field: keyof Omit<PurchaseContract, 'id'>) => {
    setFilesToUpload(prev => {
        const newState = { ...prev };
        delete newState[field as string];
        return newState;
    });
    setFormData(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: string[] = [];
    
    if (!formData.contractId.trim()) validationErrors.push('شناسه قرارداد نمی‌تواند خالی باشد.');
    if (!formData.customerId) validationErrors.push('انتخاب مشتری الزامی است.');
    if (!formData.softwareName) validationErrors.push('انتخاب نام نرم افزار الزامی است.');
    
    const isContractIdTaken = contracts.some( c => c.contractId.toLowerCase() === formData.contractId.toLowerCase() && c.id !== contract?.id );
    if (isContractIdTaken) validationErrors.push('این شناسه قرارداد قبلا استفاده شده است.');

    if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
    }

    setIsUploading(true);
    setErrors([]);
    
    try {
        const dataToSave = { ...formData };
        
        for (const field in filesToUpload) {
            const file = filesToUpload[field];
            const filePath = `${dataToSave.contractId}/${field}-${Date.now()}-${file.name}`;
            
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw new Error(`خطا در آپلود فایل ${file.name}: ${uploadError.message}`);

            const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

            if (!data.publicUrl) throw new Error(`خطا در دریافت آدرس فایل ${file.name}`);
            
            (dataToSave as any)[field] = data.publicUrl;
        }

        const finalStatus = getPurchaseContractStatusByDate(dataToSave.contractStartDate, dataToSave.contractEndDate);
        
        onSave({ ...dataToSave, contractStatus: finalStatus, ...(contract && { id: contract.id }) });
        onClose();

    } catch (error: any) {
        setErrors([error.message || 'یک خطای ناشناخته در هنگام آپلود فایل رخ داد.']);
    } finally {
        setIsUploading(false);
    }
  };
  
  const tabs = ["مشخصات", "طرفین", "فنی", "خدمات", "مالی", "پیوست", "حقوقی", "CRM"];
  
  const displayStatus = getPurchaseContractStatusByDate(formData.contractStartDate, formData.contractEndDate);

  const renderTabContent = () => {
    switch(activeTab) {
        case 0: return (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                <FormField label="شناسه قرارداد"><input type="text" name="contractId" value={formData.contractId} onChange={handleChange} className={inputClass} /></FormField>
                <FormField label="نوع قرارداد"><select name="contractType" value={formData.contractType} onChange={handleChange} className={inputClass}>{(['خرید دائم', 'اشتراک دوره ای', 'اجاره ی نرم افزار', 'سفارشی سازی'] as ContractType[]).map(o => <option key={o} value={o}>{o}</option>)}</select></FormField>
                <FormField label="وضعیت قرارداد"><div className="flex items-center gap-4 mt-1"><span className={`px-3 py-1 text-sm font-bold rounded-full ${statusStyles[displayStatus]}`}>{displayStatus}</span><p className="text-sm text-gray-500">(محاسبه خودکار)</p></div></FormField>
                <FormField label="تاریخ انعقاد"><DatePicker value={formData.contractDate} onChange={d => handleDateChange('contractDate', d)} /></FormField>
                <FormField label="شروع مدت قرارداد"><DatePicker value={formData.contractStartDate} onChange={d => handleDateChange('contractStartDate', d)} /></FormField>
                <FormField label="پایان مدت قرارداد"><DatePicker value={formData.contractEndDate} onChange={d => handleDateChange('contractEndDate', d)} /></FormField>
                <FormField label="نسخه نرم افزار"><input type="text" name="softwareVersion" value={formData.softwareVersion} onChange={handleChange} className={inputClass} /></FormField>
            </div>
        );
        case 1: return (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                 <div className="lg:col-span-1"><FormField label="انتخاب مشتری"><SearchableSelect options={customers.map(c => ({ value: c.id, label: `${c.companyName} (${c.firstName} ${c.lastName})`}))} value={formData.customerId} onChange={handleCustomerSelect} placeholder="جستجوی مشتری..." /></FormField></div>
                 <div className="lg:col-span-2"><FormField label="نام مشتری (شرکت)"><input type="text" value={customerName} readOnly className={`${inputClass} bg-slate-200`} /></FormField></div>
                <FormField label="کد اقتصادی"><input type="text" name="economicCode" value={formData.economicCode} onChange={handleChange} className={inputClass} /></FormField>
                <FormField label="شماره تماس و ایمیل"><input type="text" name="customerContact" value={formData.customerContact} onChange={handleChange} className={inputClass} /></FormField>
                <FormField label="نماینده مشتری"><input type="text" name="customerRepresentative" value={formData.customerRepresentative} onChange={handleChange} className={inputClass} /></FormField>
                <div className="sm:col-span-2 lg:col-span-3"><FormField label="آدرس کامل مشتری"><input type="text" name="customerAddress" value={formData.customerAddress} onChange={handleChange} className={inputClass} /></FormField></div>
                <FormField label="فروشنده / تامین کننده"><input type="text" name="vendorName" value={formData.vendorName} onChange={handleChange} className={inputClass} /></FormField>
                <FormField label="مسئول فروش"><SearchableSelect options={salesUsers.map(u => ({ value: u.username, label: `${u.firstName} ${u.lastName}` }))} value={formData.salespersonUsername} onChange={value => setFormData(f => ({ ...f, salespersonUsername: String(value) }))} placeholder="جستجوی کاربر فروش..." /></FormField>
             </div>
        );
        case 2: return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <FormField label="نام نرم افزار"><SearchableSelect options={softwareNameOptions.map(name => ({ value: name, label: name }))} value={formData.softwareName} onChange={value => setFormData(f => ({ ...f, softwareName: String(value) }))} placeholder="جستجو یا انتخاب نرم افزار..." /></FormField>
                <FormField label="تعداد کاربر / لایسنس"><input type="number" name="licenseCount" value={formData.licenseCount} onChange={handleChange} className={inputClass} /></FormField>
                <div className="sm:col-span-2"><FormField label="توضیحات نرم افزار"><textarea name="softwareDescription" value={formData.softwareDescription} onChange={handleChange} className={textareaClass}></textarea></FormField></div>
                <FormField label="سیستم عامل و بستر اجرا"><input type="text" name="platform" value={formData.platform} onChange={handleChange} className={inputClass} /></FormField>
                <FormField label="پشتیبانی از شبکه"><select name="networkSupport" value={formData.networkSupport} onChange={handleChange} className={inputClass}>{(['بله', 'خیر'] as NetworkSupport[]).map(o => <option key={o} value={o}>{o}</option>)}</select></FormField>
                 <div className="sm:col-span-2"><FormField label="پشتیبانی از نسخه وب / موبایل"><select name="webMobileSupport" value={formData.webMobileSupport} onChange={handleChange} className={inputClass}><option value="بله">بله</option><option value="خیر">خیر</option></select></FormField></div>
            </div>
        );
        case 3: return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <FormField label="آموزش اولیه"><textarea name="initialTraining" value={formData.initialTraining} onChange={handleChange} className={textareaClass}></textarea></FormField>
                <FormField label="نصب و راه اندازی اولیه"><textarea name="setupAndInstallation" value={formData.setupAndInstallation} onChange={handleChange} className={textareaClass}></textarea></FormField>
                <FormField label="پشتیبانی فنی"><textarea name="technicalSupport" value={formData.technicalSupport} onChange={handleChange} className={textareaClass}></textarea></FormField>
                <FormField label="به روز رسانی ها"><textarea name="updates" value={formData.updates} onChange={handleChange} className={textareaClass}></textarea></FormField>
                <div className="sm:col-span-2"><FormField label="سفارشی سازی ها"><textarea name="customizations" value={formData.customizations} onChange={handleChange} className={textareaClass}></textarea></FormField></div>
            </div>
        );
        case 4: return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                <FormField label="مبلغ کل قرارداد (ریال)"><input type="text" name="totalAmount" value={formattedTotalAmount} onChange={e => handleAmountChange(e, 'totalAmount')} className={`${inputClass} font-mono`} inputMode="numeric" dir="ltr" /></FormField>
                <FormField label="پیش پرداخت (ریال)"><input type="text" name="prepayment" value={formattedPrepayment} onChange={e => handleAmountChange(e, 'prepayment')} className={`${inputClass} font-mono`} inputMode="numeric" dir="ltr" /></FormField>
                <FormField label="شماره فاکتور"><input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} className={inputClass} /></FormField>
                <div className="lg:col-span-3"><FormField label="مراحل پرداخت"><textarea name="paymentStages" value={formData.paymentStages} onChange={handleChange} className={textareaClass}></textarea></FormField></div>
                <FormField label="روش پرداخت"><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{(['نقد', 'کارت به کارت', 'چک', 'حواله بانکی'] as PaymentMethod[]).map(m => (<div key={m} className="flex items-center"><input id={m} type="checkbox" value={m} checked={formData.paymentMethods.includes(m)} onChange={handleCheckboxChange} className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" /><label htmlFor={m} className="mr-2 text-sm text-gray-900">{m}</label></div>))}</div></FormField>
                 <FormField label="وضعیت پرداخت"><select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className={inputClass}>{(['پرداخت شده', 'بدهی باقی مانده', 'در حال پیگیری'] as PaymentStatus[]).map(o => <option key={o} value={o}>{o}</option>)}</select></FormField>
            </div>
        );
        case 5: return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FileInput label="نسخه PDF قرارداد امضا شده" fileName={formData.signedContractPdf} onFileChange={file => handleFileChange('signedContractPdf', file)} onClear={() => handleClearFile('signedContractPdf')} disabled={isUploading} />
                <FileInput label="فاکتور فروش" fileName={formData.salesInvoice} onFileChange={file => handleFileChange('salesInvoice', file)} onClear={() => handleClearFile('salesInvoice')} disabled={isUploading} />
                <FileInput label="برنامه زمانبندی تحویل" fileName={formData.deliverySchedule} onFileChange={file => handleFileChange('deliverySchedule', file)} onClear={() => handleClearFile('deliverySchedule')} disabled={isUploading} />
                <FileInput label="لیست ماژول های خریداری شده" fileName={formData.moduleList} onFileChange={file => handleFileChange('moduleList', file)} onClear={() => handleClearFile('moduleList')} disabled={isUploading} />
            </div>
        );
        case 6: return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <FormField label="شرایط فسخ قرارداد"><textarea name="terminationConditions" value={formData.terminationConditions} onChange={handleChange} className={textareaClass}></textarea></FormField>
                <FormField label="شرایط گارانتی نرم افزار"><textarea name="warrantyConditions" value={formData.warrantyConditions} onChange={handleChange} className={textareaClass}></textarea></FormField>
                <FormField label="حقوق مالکیت نرم افزار"><textarea name="ownershipRights" value={formData.ownershipRights} onChange={handleChange} className={textareaClass}></textarea></FormField>
                <FormField label="بند محرمانگی اطلاعات"><textarea name="confidentialityClause" value={formData.confidentialityClause} onChange={handleChange} className={textareaClass}></textarea></FormField>
                <FormField label="بند عدم رقابت"><textarea name="nonCompeteClause" value={formData.nonCompeteClause} onChange={handleChange} className={textareaClass}></textarea></FormField>
                <FormField label="صلاحیت رسیدگی به اختلاف"><textarea name="disputeResolution" value={formData.disputeResolution} onChange={handleChange} className={textareaClass}></textarea></FormField>
            </div>
        );
        case 7: return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <FormField label="تاریخ آخرین تغییر وضعیت"><DatePicker value={formData.lastStatusChangeDate} onChange={d => handleDateChange('lastStatusChangeDate', d)} /></FormField>
                 <FormField label="مسئول پیگیری قرارداد"><SearchableSelect options={users.map(u => ({ value: u.username, label: `${u.firstName} ${u.lastName}` }))} value={formData.crmResponsibleUsername} onChange={value => setFormData(f => ({ ...f, crmResponsibleUsername: String(value) }))} placeholder="جستجوی کاربر..." /></FormField>
                <div className="sm:col-span-2"><FormField label="یادداشت و مکاتبات مرتبط"><textarea name="notes" value={formData.notes} onChange={handleChange} className={textareaClass}></textarea></FormField></div>
                <div className="sm:col-span-2"><FormField label="وظایف آتی و یادآورها"><textarea name="futureTasks" value={formData.futureTasks} onChange={handleChange} className={textareaClass}></textarea></FormField></div>
            </div>
        );
        default: return null;
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl">
      <div className="p-6">
        <h3 className="text-xl font-medium leading-6 text-cyan-600 mb-4">
          {contract ? 'ویرایش قرارداد فروش' : 'افزودن قرارداد فروش'}
        </h3>
        
        <div className="border-b border-gray-200 mb-4">
            <div className="overflow-x-auto no-scrollbar">
                <nav className="flex -mb-px space-x-4 space-x-reverse" aria-label="Tabs">
                    {tabs.map((tab, index) => (
                        <button key={tab} onClick={() => setActiveTab(index)} className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors ${ activeTab === index ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
        </div>

        <form onSubmit={handleSubmit}>
            <div className="py-4">
              <Alert messages={errors} onClose={() => setErrors([])} />
              {renderTabContent()}
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={onClose} disabled={isUploading} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 disabled:bg-gray-200">
                  انصراف
                </button>
                <button type="submit" disabled={isUploading} className="px-4 py-2 w-32 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 flex justify-center items-center transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white disabled:bg-gray-400">
                  {isUploading ? <LoadingSpinnerIcon /> : 'ذخیره قرارداد'}
                </button>
            </div>
        </form>
      </div>
    </Modal>
  );
};

export default PurchaseContractFormModal;