
import React from 'react';
import { User, MenuItemId, UserRole } from '../types';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';
import Avatar from './Avatar';

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  currentUser: User;
}

// FIX: Added the new 'introductions' menu item to resolve TypeScript errors and display correctly.
const menuConfig: Record<MenuItemId, { label: string; color: string }> = {
  dashboard: { label: 'داشبورد', color: 'bg-gray-100 text-gray-700' },
  customers: { label: 'مشتریان', color: 'bg-cyan-100 text-cyan-700' },
  users: { label: 'کاربران', color: 'bg-indigo-100 text-indigo-700' },
  contracts: { label: 'قرارداد ها', color: 'bg-emerald-100 text-emerald-700' },
  tickets: { label: 'تیکت ها', color: 'bg-rose-100 text-rose-700' },
  reports: { label: 'گزارشات', color: 'bg-blue-100 text-blue-700' },
  referrals: { label: 'ارجاعات', color: 'bg-amber-100 text-amber-700' },
  attendance: { label: 'حضور و غیاب', color: 'bg-teal-100 text-teal-700' },
  leave: { label: 'مرخصی ها', color: 'bg-orange-100 text-orange-700' },
  missions: { label: 'ماموریت ها', color: 'bg-purple-100 text-purple-700' },
  introductions: { label: 'معرفی مشتریان', color: 'bg-pink-100 text-pink-700' },
};

const UserTable: React.FC<UserTableProps> = ({ users, onEdit, onDelete, selectedIds, onToggleSelect, onToggleSelectAll, currentUser }) => {
  const allOnPageSelected = users.length > 0 && users.every(u => selectedIds.includes(u.id));

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200/80 p-16 text-center">
        <h3 className="text-xl font-semibold text-slate-700">هیچ کاربری یافت نشد</h3>
        <p className="text-gray-500 mt-2">برای شروع، یک کاربر جدید از طریق دکمه "کاربر جدید" اضافه کنید.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200/80 overflow-hidden">
      {/* Mobile & Tablet Card View (for screens smaller than lg) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-px bg-gray-200">
        {users.map(user => (
          <div key={user.id} className="bg-white p-4 space-y-4 relative">
             <div className="absolute top-4 left-4 z-10">
              <input 
                type="checkbox"
                className="h-5 w-5 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                checked={selectedIds.includes(user.id)}
                onChange={() => onToggleSelect(user.id)}
                onClick={e => e.stopPropagation()}
                disabled={user.id === currentUser.id}
              />
            </div>
            <div className="flex items-center gap-4">
              <Avatar name={`${user.firstName} ${user.lastName}`} />
              <div>
                <p className="font-bold text-slate-800">{user.firstName} {user.lastName}</p>
                <p className="mt-1"><code className="text-sm text-cyan-700 bg-cyan-50 px-2 py-1 rounded">@{user.username}</code></p>
              </div>
            </div>
            <div className="text-sm space-y-2 pt-2 border-t border-gray-100">
                <div>
                    <span className="font-semibold text-gray-600">نقش: </span>
                    <span className="text-gray-500">{user.role}</span>
                </div>
                <div>
                    <span className="font-semibold text-gray-600">رمز عبور: </span>
                    <span className="text-gray-500 font-mono">{user.password || 'نامشخص'}</span>
                </div>
                <div>
                    <span className="font-semibold text-gray-600">دسترسی‌ها: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {user.accessibleMenus.map(menuId => (
                            <span key={menuId} className={`px-2 py-0.5 text-xs font-bold rounded-full ${menuConfig[menuId]?.color || ''}`}>
                                {menuConfig[menuId]?.label || menuId}
                            </span>
                        ))}
                         {user.accessibleMenus.length === 0 && <span className="text-xs text-gray-400">بدون دسترسی</span>}
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-end pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(user)}
                  className="p-2 text-yellow-500 hover:text-yellow-600 rounded-full hover:bg-yellow-100 transition-colors"
                  aria-label={`ویرایش ${user.firstName} ${user.lastName}`}
                >
                  <EditIcon />
                </button>
                {currentUser.role === 'مدیر' && (
                  <button
                    onClick={() => onDelete(user.id)}
                    disabled={user.id === currentUser.id}
                    className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    aria-label={`حذف ${user.firstName} ${user.lastName}`}
                    title={user.id === currentUser.id ? "شما نمی‌توانید خودتان را حذف کنید" : `حذف ${user.firstName} ${user.lastName}`}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View (for lg screens and up) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm text-right text-gray-600">
          <thead className="text-xs text-cyan-700 font-semibold uppercase bg-slate-50 tracking-wider">
            <tr>
              <th scope="col" className="p-4">
                <div className="flex items-center">
                  <input id="checkbox-all-users" type="checkbox"
                    onChange={onToggleSelectAll}
                    checked={allOnPageSelected}
                    className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500" />
                  <label htmlFor="checkbox-all-users" className="sr-only">checkbox</label>
                </div>
              </th>
              <th scope="col" className="px-6 py-4">کاربر</th>
              <th scope="col" className="px-6 py-4">نقش</th>
              <th scope="col" className="px-6 py-4">رمز عبور</th>
              <th scope="col" className="px-6 py-4">دسترسی‌ها</th>
              <th scope="col" className="px-6 py-4 text-left">اقدامات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-200 hover:bg-slate-50/50 transition-colors duration-200">
                <td className="w-4 p-4">
                  <div className="flex items-center">
                    <input id={`checkbox-user-${user.id}`} type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => onToggleSelect(user.id)}
                      disabled={user.id === currentUser.id}
                      className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <label htmlFor={`checkbox-user-${user.id}`} className="sr-only">checkbox</label>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-4">
                     <Avatar name={`${user.firstName} ${user.lastName}`} />
                     <div>
                       <div className="font-medium text-slate-800">{user.firstName} {user.lastName}</div>
                       <code className="text-sm text-cyan-700 bg-cyan-50 px-2 py-1 rounded mt-1 inline-block">@{user.username}</code>
                     </div>
                   </div>
                </td>
                 <td className="px-6 py-4">
                  <span className="text-gray-500">{user.role}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-gray-500">{user.password || 'نامشخص'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.accessibleMenus.map(menuId => (
                      <span key={menuId} className={`px-2 py-0.5 text-xs font-bold rounded-full ${menuConfig[menuId]?.color || ''}`}>
                        {menuConfig[menuId]?.label || menuId}
                      </span>
                    ))}
                    {user.accessibleMenus.length === 0 && <span className="text-xs text-gray-400">بدون دسترسی</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-left">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(user)}
                      className="p-2 text-yellow-500 hover:text-yellow-600 rounded-full hover:bg-yellow-100 transition-colors"
                      aria-label={`ویرایش ${user.firstName} ${user.lastName}`}
                    >
                      <EditIcon />
                    </button>
                    {currentUser.role === 'مدیر' && (
                      <button
                        onClick={() => onDelete(user.id)}
                        disabled={user.id === currentUser.id}
                        className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        aria-label={`حذف ${user.firstName} ${user.lastName}`}
                        title={user.id === currentUser.id ? "شما نمی‌توانید خودتان را حذف کنید" : `حذف ${user.firstName} ${user.lastName}`}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable;
