import React, { useState } from 'react';
import { PurchaseContract, User, Customer } from '../types';
import PurchaseContractTable from '../components/PurchaseContractTable';
import PurchaseContractFormModal from '../components/PurchaseContractFormModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import Pagination from '../components/Pagination';
import { toPersianDigits } from '../utils/dateFormatter';
import { TrashIcon } from '../components/icons/TrashIcon';
import ConfirmationModal from '../components/ConfirmationModal';

interface PurchaseContractsProps {
  contracts: PurchaseContract[];
  users: User[];
  customers: Customer[];
  onSave: (contract: PurchaseContract | Omit<PurchaseContract, 'id'>) => void;
  onDelete: (contractId: number) => void;
  onDeleteMany: (contractIds: number[]) => void;
  currentUser: User;
}

const ITEMS_PER_PAGE = 10;

const PurchaseContracts: React.FC<PurchaseContractsProps> = ({ contracts, users, customers, onSave, onDelete, onDeleteMany, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<PurchaseContract | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // State for confirmation modal
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<number[] | null>(null);

  const handleOpenModal = (contract: PurchaseContract | null = null) => {
    setEditingContract(contract);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingContract(null), 300);
  };

  const handleSaveContract = (contractData: PurchaseContract | Omit<PurchaseContract, 'id'>) => {
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

  const filteredContracts = contracts.filter(contract => {
    const customer = customers.find(c => c.id === contract.customerId);
    const customerName = customer ? customer.companyName : '';
    return contract.contractId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           customerName.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
    <div className="flex flex-col flex-1">
      <div className="flex flex-col flex-1">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
               <input
                  type="text"
                  placeholder="جستجوی قرارداد (شناسه، نام مشتری)..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full sm:w-auto sm:max-w-xs bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
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
              <div className="flex-grow"></div>
              <button
                onClick={() => handleOpenModal()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-50"
              >
                <PlusIcon />
                <span>قرارداد فروش جدید</span>
              </button>
          </div>
          <div className="flex items-center lg:hidden mb-4">
              <input 
                  id="checkbox-all-mobile-purchase" 
                  type="checkbox"
                  onChange={handleToggleSelectAll}
                  checked={allOnPageSelected}
                  className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500" 
              />
              <label htmlFor="checkbox-all-mobile-purchase" className="mr-2 text-sm font-medium text-gray-700">انتخاب همه در این صفحه</label>
          </div>
          <div className="flex-1">
            <PurchaseContractTable 
              contracts={paginatedContracts} 
              customers={customers}
              onEdit={handleOpenModal} 
              onDelete={(contractId) => setItemToDelete(contractId)}
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
              totalItems={filteredContracts.length}
          />
      </div>

      <PurchaseContractFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveContract}
        contract={editingContract}
        users={users}
        contracts={contracts}
        customers={customers}
        currentUser={currentUser}
      />
       <ConfirmationModal
          isOpen={!!itemToDelete || !!itemsToDelete}
          onClose={handleCloseConfirmation}
          onConfirm={handleConfirmDelete}
          title="تایید حذف"
          message={itemToDelete ? `آیا از حذف این قرارداد اطمینان دارید؟` : `آیا از حذف ${toPersianDigits(itemsToDelete?.length || 0)} قرارداد انتخاب شده اطمینان دارید؟`}
        />
    </div>
  );
};

export default PurchaseContracts;