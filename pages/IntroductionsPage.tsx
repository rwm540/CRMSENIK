import React, { useState, useMemo, useCallback } from 'react';
import { CustomerIntroduction, User, IntroductionReferral, Customer } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import IntroductionCard from '../components/IntroductionCard';
import IntroductionFormModal from '../components/IntroductionFormModal';
import ReferIntroductionModal from '../components/ReferIntroductionModal';
import Pagination from '../components/Pagination';
import ConvertIntroductionModal from '../components/ConvertIntroductionModal';
import CustomerFormModal from '../components/CustomerFormModal';
import { formatJalaali } from '../utils/dateFormatter';

interface IntroductionsPageProps {
  introductions: CustomerIntroduction[];
  users: User[];
  customers: Customer[];
  onSaveIntroduction: (introduction: CustomerIntroduction | Omit<CustomerIntroduction, 'id'>) => Promise<CustomerIntroduction>;
  onDeleteIntroduction: (id: number) => void;
  currentUser: User;
  onReferIntroduction: (introduction: CustomerIntroduction, newAssigneeUsername: string) => void;
  introductionReferrals: IntroductionReferral[];
  onSaveCustomer: (customer: Customer | Omit<Customer, 'id'>) => Promise<Customer>;
}

const ITEMS_PER_PAGE = 9;

const IntroductionsPage: React.FC<IntroductionsPageProps> = ({ introductions, users, customers, onSaveIntroduction, onDeleteIntroduction, currentUser, onReferIntroduction, introductionReferrals, onSaveCustomer }) => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isReferModalOpen, setIsReferModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  const [editingIntroduction, setEditingIntroduction] = useState<CustomerIntroduction | null>(null);
  const [referringIntroduction, setReferringIntroduction] = useState<CustomerIntroduction | null>(null);
  const [convertingIntroduction, setConvertingIntroduction] = useState<CustomerIntroduction | null>(null);
  const [prefilledCustomer, setPrefilledCustomer] = useState<Customer | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);


  // Users who can be assigned introductions are those with the correct permission.
  const assignableUsers = useMemo(() => 
    users.filter(u => u.accessibleMenus.includes('introductions')), 
  [users]);
  
  const handleOpenFormModal = (intro: CustomerIntroduction | null = null) => {
    setEditingIntroduction(intro);
    setIsFormModalOpen(true);
  };
  
  const handleOpenReferModal = (intro: CustomerIntroduction) => {
    setReferringIntroduction(intro);
    setIsReferModalOpen(true);
  };

  const handleStatusChange = (intro: CustomerIntroduction, newStatus: CustomerIntroduction['status']) => {
    if (newStatus === 'موفق' && !intro.linkedCustomerId) {
        setConvertingIntroduction(intro);
        setIsConvertModalOpen(true);
    } else {
        onSaveIntroduction({ ...intro, status: newStatus });
    }
  };

  const handleLinkCustomer = (intro: CustomerIntroduction, customerId: number) => {
    onSaveIntroduction({ ...intro, status: 'موفق', linkedCustomerId: customerId });
    setIsConvertModalOpen(false);
  };
  
  const handleOpenCreateCustomerFlow = (intro: CustomerIntroduction) => {
    setConvertingIntroduction(intro); // Keep track of which intro is being converted
    const prefilled: Omit<Customer, 'id'> = {
        firstName: intro.keyPersonName.split(' ')[0] || '',
        lastName: intro.keyPersonName.split(' ').slice(1).join(' ') || intro.customerName,
        companyName: intro.customerName,
        mobileNumbers: [intro.contactNumber, ''],
        activityType: intro.businessType,
        address: intro.location,
        emails: [''],
        phone: [''],
        jobTitle: intro.position,
        nationalId: '',
        birthDate: '',
        gender: 'مرد',
        maritalStatus: 'مجرد',
        taxCode: '',
        bankAccountNumber: '',
        iban: '',
        paymentMethods: [],
        remainingCredit: 0,
        softwareType: 'عمومی',
        purchaseDate: formatJalaali(new Date()),
        supportStartDate: formatJalaali(new Date()),
        supportEndDate: formatJalaali(new Date(new Date().setFullYear(new Date().getFullYear() + 1))),
        level: 'C',
        status: 'فعال'
    };
    setPrefilledCustomer(prefilled as Customer);
    setIsConvertModalOpen(false);
    setIsCustomerModalOpen(true);
  };

  const handleSaveAndLinkCustomer = async (customerData: Customer | Omit<Customer, 'id'>) => {
    if (convertingIntroduction) {
        try {
            const newCustomer = await onSaveCustomer(customerData);
            await onSaveIntroduction({ ...convertingIntroduction, status: 'موفق', linkedCustomerId: newCustomer.id });
        } catch(e) {
            // Error is handled by generic handler
        } finally {
            setIsCustomerModalOpen(false);
            setConvertingIntroduction(null);
            setPrefilledCustomer(null);
        }
    }
  };

  const filteredIntroductions = useMemo(() => {
    if (!searchTerm) return introductions;
    const search = searchTerm.toLowerCase();
    return introductions.filter(intro => 
        intro.customerName.toLowerCase().includes(search) ||
        intro.keyPersonName.toLowerCase().includes(search) ||
        intro.mainNeed.toLowerCase().includes(search)
    );
  }, [introductions, searchTerm]);

  const totalPages = Math.ceil(filteredIntroductions.length / ITEMS_PER_PAGE);
  const paginatedIntroductions = filteredIntroductions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );


  const handleSave = async (intro: CustomerIntroduction | Omit<CustomerIntroduction, 'id'>) => {
    await onSaveIntroduction(intro);
    setIsFormModalOpen(false);
  };
  
  const handleRefer = (newAssigneeUsername: string) => {
    if (referringIntroduction) {
        onReferIntroduction(referringIntroduction, newAssigneeUsername);
    }
    setIsReferModalOpen(false);
  };

  return (
    <>
      <div className="flex-1 bg-gray-50 text-slate-800 p-4 sm:p-6 lg:p-8 flex flex-col">
        <main className="max-w-7xl mx-auto w-full flex flex-col flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">معرفی مشتریان</h1>
              <p className="text-gray-500 mt-1">فرصت‌های جدید فروش را در این بخش ثبت و پیگیری کنید.</p>
            </div>
            <button
              onClick={() => handleOpenFormModal()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <PlusIcon />
              <span>معرفی جدید</span>
            </button>
          </div>

          <div className="mb-6">
              <input
                type="text"
                placeholder="جستجو در معرفی‌ها (نام مشتری، فرد کلیدی، نیاز اصلی)..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full max-w-lg bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
            {paginatedIntroductions.map(intro => (
              <IntroductionCard
                key={intro.id}
                introduction={intro}
                users={users}
                currentUser={currentUser}
                onEdit={handleOpenFormModal}
                onRefer={handleOpenReferModal}
                onStatusChange={(newStatus) => handleStatusChange(intro, newStatus)}
                onDelete={onDeleteIntroduction}
              />
            ))}
          </div>

            {introductions.length === 0 && (
                <div className="col-span-full bg-white rounded-lg shadow-sm border border-gray-200/80 p-16 text-center flex-1 flex items-center justify-center">
                    <div>
                        <h3 className="text-xl font-semibold text-slate-700">هیچ معرفی ثبت نشده است</h3>
                        <p className="text-gray-500 mt-2">برای شروع، یک مشتری جدید از طریق دکمه "معرفی جدید" ثبت کنید.</p>
                    </div>
                </div>
            )}
          
          {totalPages > 1 && (
             <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={filteredIntroductions.length}
            />
          )}

        </main>
      </div>

      <IntroductionFormModal 
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSave}
        introduction={editingIntroduction}
        currentUser={currentUser}
        assignableUsers={assignableUsers}
        introductionHistory={editingIntroduction ? introductionReferrals.filter(h => h.introductionId === editingIntroduction.id) : []}
      />
      
       <ReferIntroductionModal 
        isOpen={isReferModalOpen}
        onClose={() => setIsReferModalOpen(false)}
        onRefer={handleRefer}
        introduction={referringIntroduction}
        users={users}
        currentUser={currentUser}
      />
      
      <ConvertIntroductionModal 
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        introduction={convertingIntroduction}
        customers={customers}
        onLinkCustomer={handleLinkCustomer}
        onCreateCustomer={handleOpenCreateCustomerFlow}
      />
      
       <CustomerFormModal
          isOpen={isCustomerModalOpen}
          onClose={() => { setIsCustomerModalOpen(false); setPrefilledCustomer(null); }}
          onSave={handleSaveAndLinkCustomer}
          customer={prefilledCustomer}
          customers={customers}
        />

    </>
  );
};

export default IntroductionsPage;
