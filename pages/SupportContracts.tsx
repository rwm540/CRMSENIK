import React, { useState } from 'react';
import { SupportContract, Customer, User } from '../types';
import SupportContractTable from '../components/SupportContractTable';
import SupportContractFormModal from '../components/SupportContractFormModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import Pagination from '../components/Pagination';
import { toPersianDigits } from '../utils/dateFormatter';
import { TrashIcon } from '../components/icons/TrashIcon';
import ConfirmationModal from '../components/ConfirmationModal';

interface SupportContractsProps {
  contracts: SupportContract[];
  customers: Customer[];
  onSave: (contract: SupportContract | Omit<SupportContract, 'id'>) => void;
  onDelete: (contractId: number) => void;
  onDeleteMany: (contractIds: number[]) => void;
  currentUser: User;
}

const ITEMS_PER_PAGE = 10;

const SupportContracts: React.FC<SupportContractsProps> = ({ contracts, customers, onSave, onDelete, onDeleteMany, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<SupportContract | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // State for confirmation modal
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<number[] | null>(null);

  const handleOpenModal = (contract: SupportContract | null = null) => {
    setEditingContract(contract);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingContract(null), 300);
  };

  const handleSaveContract = (contractData: SupportContract | Omit<SupportContract, 'id'>) => {
    onSave(contractData);
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

  const getCustomerName = (customerId: number | null) => {
    if (!customerId) return 'نامشخص';
    return customers.find(c => c.id === customerId)?.companyName || 'یافت نشد';
  };

  const filteredContracts = contracts.filter(contract =>
    getCustomerName(contract.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.organizationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const paginatedIds = paginatedContracts.map(c => c.id);
    const allOnPageSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedIds.includes(id));

    if (allOnPageSelected) {
      setSelectedIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...paginatedIds])]);
    }
  };

  const allOnPageSelected = paginatedContracts.length > 0 && paginatedContracts.every(c => selectedIds.includes(c.id));

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">قرارداد های پشتیبانی</h1>
          <p className="text-gray-500 mt-1">قراردادهای پشتیبانی مشتریان را مدیریت کنید.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-50"
        >
          <PlusIcon />
          <span>قرارداد جدید</span>
        </button>
      </div>

      <div className="mt-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
               <input
                  type="text"
                  placeholder="جستجوی قرارداد..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full max-w-sm bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
              />
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
                  id="checkbox-all-mobile-support" 
                  type="checkbox"
                  onChange={handleToggleSelectAll}
                  checked={allOnPageSelected}
                  className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500" 
              />
              <label htmlFor="checkbox-all-mobile-support" className="mr-2 text-sm font-medium text-gray-700">انتخاب همه در این صفحه</label>
          </div>
          <SupportContractTable 
              contracts={paginatedContracts} 
              customers={customers}
              onEdit={handleOpenModal} 
              onDelete={(contractId) => setItemToDelete(contractId)}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              currentUser={currentUser}
          />
          <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={filteredContracts.length}
          />
      </div>

      <SupportContractFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveContract}
        contract={editingContract}
        customers={customers}
      />
      <ConfirmationModal
          isOpen={!!itemToDelete || !!itemsToDelete}
          onClose={handleCloseConfirmation}
          onConfirm={handleConfirmDelete}
          title="تایید حذف"
          message={itemToDelete ? `آیا از حذف این قرارداد اطمینان دارید؟` : `آیا از حذف ${toPersianDigits(itemsToDelete?.length || 0)} قرارداد انتخاب شده اطمینان دارید؟`}
        />
    </>
  );
};

export default SupportContracts;