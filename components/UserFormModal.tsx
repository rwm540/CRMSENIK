import React, { useState, useEffect } from 'react';
import { User, MenuItemId, UserRole } from '../types';
import Modal from './Modal';
import Alert from './Alert';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User | Omit<User, 'id'>) => void;
  user: User | null;
  users: User[]; // All users for uniqueness validation
}

const allMenus: { id: MenuItemId; label: string }[] = [
  { id: 'dashboard', label: 'داشبورد' },
  { id: 'customers', label: 'مشتریان' },
  { id: 'users', label: 'کاربران' },
  { id: 'contracts', label: 'قرارداد ها' },
  { id: 'tickets', label: 'تیکت ها' },
  { id: 'reports', label: 'گزارشات' },
  { id: 'referrals', label: 'ارجاعات' },
  { id: 'introductions', label: 'معرفی مشتریان' },
];

// FIX: Changed 'مسئول پشتیبانی' to 'مسئول پشتیبان' to match the database schema.
const allRoles: UserRole[] = [
  'مدیر',
  'مسئول فروش',
  'مسئول پشتیبان',
  'مسئول برنامه نویس',
  // FIX: Corrected a typo in the user role 'کارشناس فروش' to match the UserRole type.
  'کارشناس فروش',
  // FIX: Corrected a typo in the user role 'کارشناس پشتیبانی' to match the UserRole type.
  'کارشناس پشتیبانی',
  'کارشناس برنامه نویس',
];

const generateUniqueUsername = (existingUsers: User[]): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const existingUsernames = new Set(existingUsers.map(u => u.username));

    while (true) {
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (!existingUsernames.has(result)) {
            return result;
        }
    }
};

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, user, users }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessibleMenus, setAccessibleMenus] = useState<MenuItemId[]>([]);
  // FIX: Corrected a typo in the default user role to match the UserRole type.
  const [role, setRole] = useState<UserRole>('کارشناس پشتیبانی');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (user) { // Editing existing user
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setUsername(user.username);
        setAccessibleMenus(user.accessibleMenus || []);
        // FIX: Corrected a typo in the default user role to match the UserRole type.
        setRole(user.role || 'کارشناس پشتیبانی');
        setPassword('');
        setConfirmPassword('');
      } else { // Adding a new user
        const newUsername = generateUniqueUsername(users);
        setUsername(newUsername);
        // reset other fields for a clean form
        setFirstName('');
        setLastName('');
        setPassword('');
        setConfirmPassword('');
        setAccessibleMenus([]);
        // FIX: Corrected a typo in the default user role to match the UserRole type.
        setRole('کارشناس پشتیبانی');
      }
    }

    if (!isOpen) {
      setTimeout(() => {
        setFirstName('');
        setLastName('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setAccessibleMenus([]);
        // FIX: Corrected a typo in the default user role to match the UserRole type.
        setRole('کارشناس پشتیبانی');
        setErrors([]);
      }, 300); // Reset after closing animation
    }
  }, [user, isOpen, users]);


  const handleMenuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    const menuId = value as MenuItemId;
    setAccessibleMenus(prev =>
      checked ? [...prev, menuId] : prev.filter(id => id !== menuId)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors: string[] = [];

    if (!firstName.trim()) validationErrors.push('نام نمی‌تواند خالی باشد.');
    if (!lastName.trim()) validationErrors.push('نام خانوادگی نمی‌تواند خالی باشد.');
    
    if (!user && !password) {
        validationErrors.push('رمز عبور برای کاربر جدید الزامی است.');
    }
    if (password) {
        if (password.length < 6) validationErrors.push('رمز عبور باید حداقل ۶ کاراکتر باشد.');
        if (password !== confirmPassword) {
            validationErrors.push('رمز عبور و تکرار آن مطابقت ندارند.');
        }
    }
    
    if (accessibleMenus.length === 0) {
        validationErrors.push('کاربر باید حداقل به یک منو دسترسی داشته باشد.');
    }

    if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
    }

    const savedUser = {
        ...(user && { id: user.id }),
        firstName,
        lastName,
        username,
        accessibleMenus,
        role,
        ...(password && { password }),
    };
    
    onSave(savedUser as User | Omit<User, 'id'>);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-medium leading-6 text-cyan-600 mb-4">
          {user ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert messages={errors} onClose={() => setErrors([])} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">نام</label>
              <input type="text" name="firstName" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی</label>
              <input type="text" name="lastName" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
            </div>
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">نام کاربری</label>
            <input type="text" name="username" id="username" value={username} readOnly className="mt-1 block w-full bg-slate-200 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm cursor-not-allowed" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">{user ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}</label>
              <input type="password" name="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">تکرار رمز عبور</label>
              <input type="password" name="confirmPassword" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نقش کاربر</label>
            <select name="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm">
                {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">دسترسی به منوها</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allMenus.map(menu => (
                <div key={menu.id} className="flex items-center">
                  <input
                    id={menu.id}
                    name="accessibleMenus"
                    type="checkbox"
                    value={menu.id}
                    checked={accessibleMenus.includes(menu.id)}
                    onChange={handleMenuChange}
                    className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                  />
                  <label htmlFor={menu.id} className="mr-2 block text-sm text-gray-900">
                    {menu.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
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
              ذخیره کاربر
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default UserFormModal;