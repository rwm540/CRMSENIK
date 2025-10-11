import React from 'react';
import { UsersIcon } from './icons/UsersIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { HomeIcon } from './icons/HomeIcon';
import { User, MenuItemId } from '../types';
import Avatar from './Avatar';
import { LogoutIcon } from './icons/LogoutIcon';
import { HashtagIcon } from './icons/HashtagIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { TicketIcon } from './icons/TicketIcon';
import { PurchaseIcon } from './icons/PurchaseIcon';
import { toPersianDigits } from '../utils/dateFormatter';
import { XIcon } from './icons/XIcon';
interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  isSidebarOpen: boolean;
  user: User;
  onLogout: () => void;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, isSidebarOpen, user, onLogout, onClose }) => {

  const allNavItems = [
    { id: 'dashboard', label: 'داشبورد', icon: <HomeIcon /> },
    { id: 'customers', label: 'مشتریان', icon: <UserGroupIcon /> },
    { id: 'users', label: 'کاربران', icon: <UsersIcon /> },
    { id: 'contracts', label: 'قرارداد ها', icon: <PurchaseIcon /> },
    { id: 'tickets', label: 'تیکت ها', icon: <TicketIcon /> },
    { id: 'reports', label: 'گزارشات', icon: <DocumentTextIcon /> },
    { id: 'referrals', label: 'ارجاعات', icon: <HashtagIcon /> }
  ];
  
  const accessibleNavItems = allNavItems.filter(item => user.accessibleMenus.includes(item.id as MenuItemId));

  return (
    <aside className={`fixed inset-y-0 right-0 z-40 h-full w-64 bg-white text-slate-600 flex flex-col border-l border-gray-200 transform transition-all duration-300 ease-in-out lg:relative lg:flex-shrink-0 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 lg:w-64' : 'translate-x-full lg:w-20'}`}>
      <div className="flex items-center border-b border-gray-200 h-20 px-4 flex-shrink-0">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex-shrink-0`}></div>
        {isSidebarOpen && <h1 className="font-bold text-xl text-slate-800 mr-3 flex-grow">داشبورد CRM</h1>}
        <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="بستن منو">
            <XIcon />
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
        {accessibleNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
              activePage === item.id
                ? 'bg-cyan-500/10 text-cyan-600 font-semibold'
                : 'hover:bg-slate-100 hover:text-slate-900'
            } ${!isSidebarOpen && 'justify-center'}`}
            title={item.label}
          >
            <span className="text-cyan-600">{item.icon}</span>
            {isSidebarOpen && <span className="mr-4 flex-1 text-right">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-4 flex-shrink-0">
        <div className={`flex items-center ${!isSidebarOpen && 'justify-center'}`}>
          <Avatar name={`${user.firstName} ${user.lastName}`} />
          {isSidebarOpen && (
            <div className="mr-3 flex-1 overflow-hidden">
              <p className="font-semibold text-slate-800 text-sm truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500 truncate">
                 دسترسی به {toPersianDigits(user.accessibleMenus.length)} منو
              </p>
            </div>
          )}
          {isSidebarOpen && (
            <button onClick={onLogout} title="خروج" className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-100 flex-shrink-0">
                <LogoutIcon />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;