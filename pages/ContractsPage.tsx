import React, { useState } from 'react';
import { PurchaseContract, SupportContract, User, Customer } from '../types';
import PurchaseContracts from './PurchaseContracts';
import SupportContracts from './SupportContracts';

// Define the props interface
interface ContractsPageProps {
  purchaseContracts: PurchaseContract[];
  supportContracts: SupportContract[];
  users: User[];
  customers: Customer[];
  onSavePurchaseContract: (contract: PurchaseContract | Omit<PurchaseContract, 'id'>) => void;
  onDeletePurchaseContract: (contractId: number) => void;
  onDeleteManyPurchaseContracts: (contractIds: number[]) => void;
  onSaveSupportContract: (contract: SupportContract | Omit<SupportContract, 'id'>) => void;
  onDeleteSupportContract: (contractId: number) => void;
  onDeleteManySupportContracts: (contractIds: number[]) => void;
  currentUser: User;
}

const ContractsPage: React.FC<ContractsPageProps> = ({
  purchaseContracts,
  supportContracts,
  users,
  customers,
  onSavePurchaseContract,
  onDeletePurchaseContract,
  onDeleteManyPurchaseContracts,
  onSaveSupportContract,
  onDeleteSupportContract,
  onDeleteManySupportContracts,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'purchase' | 'support'>('purchase');

  const tabBaseStyle = "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors";
  const activeTabStyle = "border-cyan-500 text-cyan-600";
  const inactiveTabStyle = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

  return (
    <div className="flex-1 bg-gray-50 text-slate-800 p-4 sm:p-6 lg:p-8 flex flex-col">
      <main className="max-w-7xl mx-auto w-full flex flex-col flex-1">
        {/* Unified Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">مدیریت قراردادها</h1>
            <p className="text-gray-500 mt-1">قراردادهای فروش و پشتیبانی مشتریان را مدیریت کنید.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 space-x-reverse" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('purchase')}
              className={`${tabBaseStyle} ${activeTab === 'purchase' ? activeTabStyle : inactiveTabStyle}`}
            >
              قراردادهای فروش
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`${tabBaseStyle} ${activeTab === 'support' ? activeTabStyle : inactiveTabStyle}`}
            >
              قراردادهای پشتیبانی
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6 flex flex-col flex-1">
          {activeTab === 'purchase' ? (
            <PurchaseContracts
              contracts={purchaseContracts}
              users={users}
              customers={customers}
              onSave={onSavePurchaseContract}
              onDelete={onDeletePurchaseContract}
              onDeleteMany={onDeleteManyPurchaseContracts}
              currentUser={currentUser}
            />
          ) : (
            <SupportContracts
              contracts={supportContracts}
              customers={customers}
              onSave={onSaveSupportContract}
              onDelete={onDeleteSupportContract}
              onDeleteMany={onDeleteManySupportContracts}
              currentUser={currentUser}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default ContractsPage;
