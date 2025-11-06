import React, { useState } from 'react';
import { CustomerIntroduction, Customer } from '../types';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { LinkIcon } from './icons/LinkIcon';

interface ConvertIntroductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  introduction: CustomerIntroduction | null;
  customers: Customer[];
  onLinkCustomer: (intro: CustomerIntroduction, customerId: number) => void;
  onCreateCustomer: (intro: CustomerIntroduction) => void;
}

const ConvertIntroductionModal: React.FC<ConvertIntroductionModalProps> = ({ isOpen, onClose, introduction, customers, onLinkCustomer, onCreateCustomer }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  if (!introduction) return null;

  const handleLink = () => {
    if (selectedCustomerId) {
      onLinkCustomer(introduction, selectedCustomerId);
    }
  };
  
  const handleCreate = () => {
    onCreateCustomer(introduction);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <h3 className="text-lg font-medium leading-6 text-cyan-600 mb-2">تکمیل فرآیند معرفی موفق</h3>
        <p className="text-sm text-gray-500 mb-6">
          معرفی <span className="font-bold">"{introduction.customerName}"</span> به عنوان <span className="font-bold text-green-600">موفق</span> علامت‌گذاری شد. لطفاً اقدام بعدی را انتخاب کنید.
        </p>

        <div className="space-y-6">
          {/* Option 1: Link to Existing Customer */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2"><LinkIcon /> اتصال به مشتری موجود</h4>
            <p className="text-xs text-gray-500 mt-1 mb-3">اگر این معرفی مربوط به یک مشتری است که از قبل در سیستم وجود دارد، آن را انتخاب کنید.</p>
            <SearchableSelect
              options={customers.map(c => ({ value: c.id, label: `${c.companyName} (${c.firstName} ${c.lastName})` }))}
              value={selectedCustomerId}
              onChange={(val) => setSelectedCustomerId(Number(val))}
              placeholder="جستجو و انتخاب مشتری..."
            />
            <div className="text-right mt-3">
                <button
                onClick={handleLink}
                disabled={!selectedCustomerId}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                اتصال
                </button>
            </div>
          </div>

          {/* Option 2: Create New Customer */}
          <div className="p-4 border rounded-lg">
             <h4 className="font-semibold text-slate-800 flex items-center gap-2"><UserPlusIcon /> ایجاد مشتری جدید</h4>
             <p className="text-xs text-gray-500 mt-1 mb-3">یک پروفایل مشتری جدید بر اساس اطلاعات این معرفی ایجاد کنید.</p>
             <div className="text-right mt-3">
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700"
                >
                    ایجاد مشتری جدید
                </button>
            </div>
          </div>
        </div>
      </div>
       <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3 rounded-b-lg border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100">انصراف</button>
        </div>
    </Modal>
  );
};

export default ConvertIntroductionModal;
