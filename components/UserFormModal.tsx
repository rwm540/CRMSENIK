import React, { useState, useEffect } from 'react';
import { User, MenuItemId, UserRole } from '../types';
import Modal from './Modal';
import Alert from './Alert';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User | Omit<User, 'id'>) => Promise<void>;
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

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, user, users }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessibleMenus, setAccessibleMenus] = useState<MenuItemId[]>([]);
  // FIX: Corrected a typo in the default user role to match the UserRole type.
  const [role, setRole] = useState<UserRole>('کارشناس پشتیبانی');
  const [errors, setErrors] = useState<string[]>([]);
  // CHG: Added internal saving state for localized loading indicator.
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setUsername('');
    setPassword('');
    setAccessibleMenus([]);
    setRole('کارشناس پشتیبانی');
    setErrors([]);
  };

  useEffect(() => {
    if (isOpen) {
      if (user) { // Editing existing user
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setUsername(user.username);
        setPassword(''); // Password is not edited here for security
        setAccessibleMenus(user.accessibleMenus || []);
        setRole(user.role || 'کارشناس پشتیبانی');
      } else { // Adding a new user
        resetForm();
      }
    } else {
      setTimeout(() => {
        resetForm();
      }, 300); // Reset after closing animation
    }
  }, [user, isOpen]);


  const handleMenuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    const menuId = value as MenuItemId;
    setAccessibleMenus(prev =>
      checked ? [...prev, menuId] : prev.filter(id => id !== menuId)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors: string[] = [];

    if (!firstName.trim()) validationErrors.push('نام نمی‌تواند خالی باشد.');
    if (!lastName.trim()) validationErrors.push('نام خانوادگی نمی‌تواند خالی باشد.');
    if (!username.trim()) validationErrors.push('نام کاربری نمی‌تواند خالی باشد.');
    
    const isEditing = !!user;

    if (!isEditing && !password) {
        validationErrors.push('رمز عبور برای کاربر جدید الزامی است.');
    }
    
    const otherUsers = users.filter(u => u.id !== user?.id);
    if (otherUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        validationErrors.push('این نام کاربری قبلا استفاده شده است.');
    }
    
    if (accessibleMenus.length === 0) {
        validationErrors.push('کاربر باید حداقل به یک منو دسترسی داشته باشد.');
    }

    if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
    }

    const savedUser: Partial<User> = {
        ...(user && { id: user.id }),
        firstName,
        lastName,
        username,
        accessibleMenus,
        role,
    };
    
    if (!isEditing) {
        savedUser.password = password;
    }
    
    setIsSaving(true);
    try {
      await onSave(savedUser as User | Omit<User, 'id'>);
      onClose();
    } catch (error) {
      // Error is handled in App.tsx, the modal stays open for correction.
    } finally {
      setIsSaving(false);
    }
  };

  const isEditing = !!user;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="p-6">
        <h3 className="text-lg font-medium leading-6 text-cyan-600 mb-4">
          {user ? 'ویرایش کاربر' : 'ایجاد کاربر جدید'}
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
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">نام کاربری</label>
              <input 
                type="text" 
                name="username" 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
              />
            </div>
             <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">رمز عبور</label>
              <input 
                type="password" 
                name="password" 
                id="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                disabled={isEditing} 
                className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm ${isEditing ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-gray-50'}`} 
              />
              {isEditing && <p className="mt-1 text-xs text-gray-500">رمز عبور را نمی‌توان از این بخش ویرایش کرد.</p>}
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
              disabled={isSaving}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-200"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 w-28 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors flex justify-center items-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white disabled:bg-gray-400"
            >
              {isSaving ? <LoadingSpinnerIcon /> : 'ذخیره کاربر'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default UserFormModal;