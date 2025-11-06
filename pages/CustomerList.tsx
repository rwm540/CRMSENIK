import React, { useState, useMemo } from 'react';
import { Customer, User, CustomerIntroduction } from '../types';
import CustomerTable from '../components/CustomerTable';
import CustomerFormModal from '../components/CustomerFormModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import Pagination from '../components/Pagination';
import { toPersianDigits } from '../utils/dateFormatter';
import { TrashIcon } from '../components/icons/TrashIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import { SparklesIcon } from '../components/icons/SparklesIcon';

interface CustomerListProps {
  customers: Customer[];
  introductions: CustomerIntroduction[];
  onSave: (customer: Customer | Omit<Customer, 'id'>) => Promise<Customer>;
  onDelete: (customerId: number) => void;
  onDeleteMany: (customerIds: number[]) => void;
  currentUser: User;
}

const ITEMS_PER_PAGE = 10;

const CustomerList: React.FC<CustomerListProps> = ({ customers, introductions, onSave, onDelete, onDeleteMany, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showIntroducedOnly, setShowIntroducedOnly] = useState(false);
  
  // State for confirmation modal
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<number[] | null>(null);

  const handleOpenModal = (customer: Customer | null = null) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingCustomer(null), 300);
  };

  const handleSaveCustomer = async (customerData: Customer | Omit<Customer, 'id'>) => {
    await onSave(customerData);
    handleCloseModal();
  };
  
  const handleCloseConfirmation = () => {
    setItemToDelete(null);
    setItemsToDelete(null);
  };
  
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete);
    } else if (itemsToDelete) {
      onDeleteMany(itemsToDelete);
      setSelectedIds([]);
    }
    handleCloseConfirmation();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const filteredCustomers = useMemo(() => {
    let results = [...customers];
    
    if (showIntroducedOnly) {
        const introducedCustomerIds = new Set(
            introductions
                .filter(intro => intro.status === 'موفق' && intro.linkedCustomerId)
                .map(intro => intro.linkedCustomerId)
        );
        results = results.filter(c => introducedCustomerIds.has(c.id));
    }

    if (searchTerm) {
        const search = searchTerm.toLowerCase();
        results = results.filter(customer => 
            `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(search) ||
            customer.companyName.toLowerCase().includes(search) ||
            customer.nationalId.toLowerCase().includes(search) ||
            customer.emails.some(e => e.toLowerCase().includes(search)) ||
            customer.mobileNumbers.some(m => m.toLowerCase().includes(search))
        );
    }
    
    return results.sort((a,b) => b.id - a.id);

  }, [customers, searchTerm, showIntroducedOnly, introductions]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const paginatedIds = paginatedCustomers.map(c => c.id);
    const allOnPageSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedIds.includes(id));

    if (allOnPageSelected) {
      setSelectedIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...paginatedIds])]);
    }
  };

  const allOnPageSelected = paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedIds.includes(c.id));

  return (
    <div className="flex-1 bg-gray-50 text-slate-800 p-4 sm:p-6 lg:p-8 flex flex-col">
      <main className="max-w-7xl mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">مدیریت مشتریان</h1>
            <p className="text-gray-500 mt-1">مشتریان خود را در این بخش مدیریت کنید.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-50"
          >
            <PlusIcon />
            <span>مشتری جدید</span>
          </button>
        </div>

        {/* Customer Table Section */}
        <div className="mt-8 flex flex-col flex-1">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                 <input
                    type="text"
                    placeholder="جستجوی مشتری..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full max-w-sm bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                />
                 <button 
                    onClick={() => setShowIntroducedOnly(!showIntroducedOnly)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${showIntroducedOnly ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                 >
                    <SparklesIcon />
                    <span>نمایش مشتریان معرفی شده</span>
                 </button>
                 {currentUser.role === 'مدیر' && selectedIds.length > 0 && (
                  <button
                    onClick={() => setItemsToDelete(selectedIds)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm whitespace-nowrap"
                  >
                    <TrashIcon />
                    <span>حذف ({toPersianDigits(selectedIds.length)}) مورد</span>
                  </button>
                )}
            </div>
            <div className="flex items-center lg:hidden mb-4">
                <input 
                    id="checkbox-all-mobile-customers" 
                    type="checkbox"
                    onChange={handleToggleSelectAll}
                    checked={allOnPageSelected}
                    className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500" 
                />
                <label htmlFor="checkbox-all-mobile-customers" className="mr-2 text-sm font-medium text-gray-700">انتخاب همه در این صفحه</label>
            </div>
            <div className="flex-1">
                <CustomerTable 
                  customers={paginatedCustomers} 
                  onEdit={handleOpenModal} 
                  onDelete={(customerId) => setItemToDelete(customerId)}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  currentUser={currentUser}
                />
            </div>
            <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={filteredCustomers.length}
            />
        </div>

        {/* Modal */}
        <CustomerFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveCustomer}
          customer={editingCustomer}
          customers={customers}
        />

        <ConfirmationModal
          isOpen={!!itemToDelete || !!itemsToDelete}
          onClose={handleCloseConfirmation}
          onConfirm={handleConfirmDelete}
          title="تایید حذف"
          message={itemToDelete ? `آیا از حذف این مشتری اطمینان دارید؟` : `آیا از حذف ${toPersianDigits(itemsToDelete?.length || 0)} مشتری انتخاب شده اطمینان دارید؟`}
        />
      </main>
    </div>
  );
};

export default CustomerList;
