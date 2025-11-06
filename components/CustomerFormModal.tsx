import React, { useState, useEffect, useRef } from 'react';
import { Customer, Gender, MaritalStatus, PaymentMethod, CustomerLevel, SoftwareType, CustomerStatus } from '../types';
import Modal from './Modal';
import DatePicker from './DatePicker';
import Alert from './Alert';
import jalaali from 'jalaali-js';
import { formatCurrency, convertPersianToEnglish } from '../utils/dateFormatter';

// Declare globals loaded from CDN
// declare const jalaali: any;

const inputClass = "mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer | Omit<Customer, 'id'>) => void;
  customer: Customer | null;
  customers: Customer[]; // All customers for validation
}

const FormField: React.FC<{ label: string; id: string; children: React.ReactNode }> = ({ label, id, children }) => (
  <div>
    <label htmlFor={id} className={labelClass}>{label}</label>
    {children}
  </div>
);

const getInitialState = (): Omit<Customer, 'id'> => ({
    firstName: '',
    lastName: '',
    nationalId: '',
    birthDate: '',
    gender: 'مرد',
    maritalStatus: 'مجرد',
    mobileNumbers: [''],
    emails: [''],
    phone: [''],
    address: '',
    jobTitle: '',
    companyName: '',
    activityType: '',
    taxCode: '',
    bankAccountNumber: '',
    iban: '',
    paymentMethods: [],
    remainingCredit: 0,
    softwareType: 'رستورانی',
    purchaseDate: '',
    supportStartDate: '',
    supportEndDate: '',
    level: 'C',
    status: 'فعال',
});

const formatDate = (date: { jy: number; jm: number; jd: number }) => {
    return `${date.jy}/${String(date.jm).padStart(2, '0')}/${String(date.jd).padStart(2, '0')}`;
};

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, customer, customers }) => {
    const [formData, setFormData] = useState(getInitialState());
    const [formattedRemainingCredit, setFormattedRemainingCredit] = useState('');
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (customer) { // Editing an existing customer
                setFormData({
                    ...getInitialState(),
                    ...customer,
                    mobileNumbers: [...(customer.mobileNumbers || []), ''],
                    emails: [...(customer.emails || []), ''],
                    phone: [...(customer.phone || []), ''],
                });
                setFormattedRemainingCredit(formatCurrency(customer.remainingCredit));
            } else { // Adding a new customer, set defaults
                const todayObj = jalaali.toJalaali(new Date());
                const oneYearFromNowObj = jalaali.toJalaali(new Date(new Date().setFullYear(new Date().getFullYear() + 1)));
                
                const initialState = {
                    ...getInitialState(),
                    purchaseDate: formatDate(todayObj),
                    supportStartDate: formatDate(todayObj),
                    supportEndDate: formatDate(oneYearFromNowObj),
                };
                setFormData(initialState);
                setFormattedRemainingCredit(formatCurrency(initialState.remainingCredit));
            }
        } else {
            // Reset form state when modal closes
            setTimeout(() => {
                setFormData(getInitialState());
                setFormattedRemainingCredit('');
                setErrors([]);
            }, 300); // Wait for animation
        }
    }, [customer, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const englishValue = convertPersianToEnglish(rawValue);
        const numericString = englishValue.replace(/[^0-9]/g, '');
        const numericValue = numericString ? parseInt(numericString, 10) : 0;
        
        setFormData(prev => ({ ...prev, remainingCredit: numericValue }));
        
        const formatted = numericString ? formatCurrency(numericValue) : '';
        setFormattedRemainingCredit(formatted);
    };

    const handleDateChange = (field: keyof Omit<Customer, 'id'>, date: string) => {
        setFormData(prev => ({ ...prev, [field]: date }));
    };

    const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>, index: number, field: 'mobileNumbers' | 'emails' | 'phone') => {
        const newValues = [...formData[field]];
        newValues[index] = e.target.value;

        if (index === newValues.length - 1 && e.target.value.trim() !== '') {
            newValues.push('');
        }
        
        setFormData(prev => ({...prev, [field]: newValues}));
    };
    
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const method = value as PaymentMethod;
        setFormData(prev => {
            const newMethods = checked
                ? [...prev.paymentMethods, method]
                : prev.paymentMethods.filter(pm => pm !== method);
            return { ...prev, paymentMethods: newMethods };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationErrors: string[] = [];
        
        if (!formData.firstName.trim()) validationErrors.push('نام نمی‌تواند خالی باشد.');
        if (!formData.lastName.trim()) validationErrors.push('نام خانوادگی نمی‌تواند خالی باشد.');
        if (!formData.companyName.trim()) validationErrors.push('نام شرکت نمی‌تواند خالی باشد.');
        if (!formData.nationalId.trim()) validationErrors.push('کد ملی نمی‌تواند خالی باشد.');

        const cleanedMobiles = formData.mobileNumbers.filter(m => m.trim() !== '');
        const cleanedEmails = formData.emails.filter(email => email.trim() !== '');
        const cleanedPhones = formData.phone.filter(p => p.trim() !== '');

        if (cleanedMobiles.length === 0) {
            validationErrors.push('وارد کردن حداقل یک شماره موبایل اجباری است.');
        }

        // Check for duplicates within the same customer entry
        if (new Set(cleanedMobiles).size !== cleanedMobiles.length) {
            validationErrors.push('شماره موبایل تکراری در فرم وارد شده است.');
        }
        if (new Set(cleanedEmails).size !== cleanedEmails.length) {
            validationErrors.push('ایمیل تکراری در فرم وارد شده است.');
        }
        if (new Set(cleanedPhones).size !== cleanedPhones.length) {
            validationErrors.push('تلفن ثابت تکراری در فرم وارد شده است.');
        }
        
        // Check for duplicates across ALL customers
        const otherCustomers = customers.filter(c => c.id !== customer?.id);
        if (formData.nationalId && otherCustomers.some(c => c.nationalId === formData.nationalId)) {
            validationErrors.push('این کد ملی قبلا برای مشتری دیگری ثبت شده است.');
        }
        cleanedMobiles.forEach(num => {
            if (otherCustomers.some(c => c.mobileNumbers.includes(num))) {
                validationErrors.push(`شماره موبایل ${num} تکراری است.`);
            }
        });
        cleanedEmails.forEach(email => {
            if (otherCustomers.some(c => c.emails.includes(email))) {
                validationErrors.push(`ایمیل ${email} تکراری است.`);
            }
        });
        cleanedPhones.forEach(p => {
            if (otherCustomers.some(c => c.phone.includes(p))) {
                validationErrors.push(`تلفن ثابت ${p} تکراری است.`);
            }
        });

        if (validationErrors.length > 0) {
            // Use a Set to remove duplicate error messages
            setErrors([...new Set(validationErrors)]);
            return;
        }

        const savedCustomer = {
            ...formData,
            ...(customer && { id: customer.id }),
            mobileNumbers: cleanedMobiles,
            emails: cleanedEmails,
            phone: cleanedPhones,
            remainingCredit: Number(formData.remainingCredit) || 0,
        };
        
        onSave(savedCustomer as Customer | Omit<Customer, 'id'>);
    };

    const paymentMethodOptions: PaymentMethod[] = ['نقد', 'چک', 'کارت', 'حواله'];
    const softwareTypeOptions: SoftwareType[] = ['رستورانی', 'فروشگاهی', 'شرکتی', 'عمومی'];
    const levelOptions: CustomerLevel[] = ['A', 'B', 'C', 'D'];

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl">
            <div className="p-6">
                <h3 className="text-lg font-medium leading-6 text-cyan-600 mb-4">
                    {customer ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Alert messages={errors} onClose={() => setErrors([])} />
                    {/* Section 1: General & Contact */}
                    <div>
                        <h4 className="text-md font-semibold text-slate-700 border-b pb-2 mb-4">اطلاعات عمومی و تماس</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                            <FormField label="نام" id="firstName">
                                <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className={inputClass} />
                            </FormField>
                             <FormField label="نام خانوادگی" id="lastName">
                                <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className={inputClass} />
                            </FormField>
                            <FormField label="کد ملی" id="nationalId">
                                <input type="text" name="nationalId" id="nationalId" value={formData.nationalId} onChange={handleChange} className={inputClass} />
                            </FormField>
                            <FormField label="تاریخ تولد" id="birthDate">
                               <DatePicker name="birthDate" placeholder="تاریخ تولد" value={formData.birthDate} onChange={(date) => handleDateChange('birthDate', date)} />
                            </FormField>
                            <FormField label="جنسیت" id="gender">
                                <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                                    <option value="مرد">مرد</option>
                                    <option value="زن">زن</option>
                                </select>
                            </FormField>
                            <FormField label="وضعیت تاهل" id="maritalStatus">
                                <select name="maritalStatus" id="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className={inputClass}>
                                    <option value="مجرد">مجرد</option>
                                    <option value="متاهل">متاهل</option>
                                </select>
                            </FormField>
                             <div className="lg:col-span-3">
                                <FormField label="آدرس" id="address">
                                    <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className={inputClass} />
                                </FormField>
                             </div>
                             <div>
                                <label className={labelClass}>تلفن ثابت</label>
                                {formData.phone.map((p, index) => (
                                    <input
                                        key={index}
                                        type="text"
                                        value={p}
                                        onChange={(e) => handleArrayChange(e, index, 'phone')}
                                        className={`${inputClass} mb-2`}
                                        placeholder={index === 0 ? "تلفن اصلی..." : "تلفن دیگر..."}
                                    />
                                ))}
                            </div>
                             <div>
                                <label className={labelClass}>شماره موبایل</label>
                                {formData.mobileNumbers.map((mobile, index) => (
                                    <input
                                        key={index}
                                        type="text"
                                        value={mobile}
                                        onChange={(e) => handleArrayChange(e, index, 'mobileNumbers')}
                                        className={`${inputClass} mb-2`}
                                        placeholder={index === 0 ? "شماره اصلی..." : "شماره دیگر..."}
                                    />
                                ))}
                            </div>
                             <div>
                                <label className={labelClass}>ایمیل</label>
                                {formData.emails.map((email, index) => (
                                    <input
                                        key={index}
                                        type="email"
                                        value={email}
                                        onChange={(e) => handleArrayChange(e, index, 'emails')}
                                        className={`${inputClass} mb-2`}
                                        placeholder={index === 0 ? "ایمیل اصلی..." : "ایمیل دیگر..."}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                     {/* Section 2: Job & Financial */}
                    <div>
                        <h4 className="text-md font-semibold text-slate-700 border-b pb-2 mb-4">اطلاعات شغلی و مالی</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                           <FormField label="نام شرکت" id="companyName">
                                <input type="text" name="companyName" id="companyName" value={formData.companyName} onChange={handleChange} className={inputClass} />
                            </FormField>
                             <FormField label="عنوان شغلی" id="jobTitle">
                                <input type="text" name="jobTitle" id="jobTitle" value={formData.jobTitle} onChange={handleChange} className={inputClass} />
                            </FormField>
                             <FormField label="نوع فعالیت" id="activityType">
                                <input type="text" name="activityType" id="activityType" value={formData.activityType} onChange={handleChange} className={inputClass} />
                            </FormField>
                            <FormField label="کد اقتصادی" id="taxCode">
                                <input type="text" name="taxCode" id="taxCode" value={formData.taxCode} onChange={handleChange} className={inputClass} />
                            </FormField>
                             <FormField label="شماره حساب" id="bankAccountNumber">
                                <input type="text" name="bankAccountNumber" id="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className={inputClass} />
                            </FormField>
                             <FormField label="شماره شبا" id="iban">
                                <input type="text" name="iban" id="iban" value={formData.iban} onChange={handleChange} className={inputClass} />
                            </FormField>
                             <FormField label="مانده اعتبار (ریال)" id="remainingCredit">
                                <input
                                    type="text"
                                    name="remainingCredit"
                                    id="remainingCredit"
                                    value={formattedRemainingCredit}
                                    onChange={handleAmountChange}
                                    className={`${inputClass} font-mono`}
                                    inputMode="numeric"
                                    dir="ltr"
                                />
                            </FormField>
                            <div className="lg:col-span-2">
                                <label className={labelClass}>روش‌های پرداخت</label>
                                <div className="mt-2 flex flex-wrap gap-4">
                                {paymentMethodOptions.map(method => (
                                    <div key={method} className="flex items-center">
                                    <input
                                        id={`payment-${method}`}
                                        name="paymentMethods"
                                        type="checkbox"
                                        value={method}
                                        checked={formData.paymentMethods.includes(method)}
                                        onChange={handleCheckboxChange}
                                        className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                                    />
                                    <label htmlFor={`payment-${method}`} className="mr-2 block text-sm text-gray-900">{method}</label>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Purchase & Support */}
                    <div>
                        <h4 className="text-md font-semibold text-slate-700 border-b pb-2 mb-4">اطلاعات خرید و پشتیبانی</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                             <FormField label="نوع نرم‌افزار" id="softwareType">
                                <select name="softwareType" id="softwareType" value={formData.softwareType} onChange={handleChange} className={inputClass}>
                                    {softwareTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </FormField>
                             <FormField label="تاریخ خرید" id="purchaseDate">
                               <DatePicker name="purchaseDate" placeholder="تاریخ خرید" value={formData.purchaseDate} onChange={(date) => handleDateChange('purchaseDate', date)} />
                            </FormField>
                            <FormField label="شروع پشتیبانی" id="supportStartDate">
                               <DatePicker name="supportStartDate" placeholder="شروع پشتیبانی" value={formData.supportStartDate} onChange={(date) => handleDateChange('supportStartDate', date)} />
                            </FormField>
                            <FormField label="پایان پشتیبانی" id="supportEndDate">
                                <DatePicker name="supportEndDate" placeholder="پایان پشتیبانی" value={formData.supportEndDate} onChange={(date) => handleDateChange('supportEndDate', date)} />
                            </FormField>
                             <FormField label="سطح مشتری" id="level">
                                <select name="level" id="level" value={formData.level} onChange={handleChange} className={inputClass}>
                                    {levelOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </FormField>
                             <FormField label="وضعیت" id="status">
                                <select name="status" id="status" value={formData.status} onChange={handleChange} className={inputClass}>
                                    <option value="فعال">فعال</option>
                                    <option value="غیرفعال">غیرفعال</option>
                                </select>
                            </FormField>
                        </div>
                    </div>
                    
                    {/* Buttons */}
                    <div className="pt-4 flex justify-end gap-3 border-t">
                        <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                        >
                        انصراف
                        </button>
                        <button
                        type="submit"
                        className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white"
                        >
                        ذخیره
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default CustomerFormModal;