

import React, { useState, useEffect } from 'react';
import { User, MenuItemId, UserRole } from '../types';
import Modal from './Modal';
import Alert from './Alert';
import { SparklesIcon } from './icons/SparklesIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeSlashIcon } from './icons/EyeSlashIcon';

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
  // FIX: Added HR menu items to match updated MenuItemId type.
  { id: 'attendance', label: 'حضور و غیاب' },
  { id: 'leave', label: 'مرخصی ها' },
  { id: 'missions', label: 'ماموریت ها' },
];

const allRoles: UserRole[] = [
  'مدیر',
  'مسئول فروش',
  'مسئول پشتیبانی',
  'مسئول برنامه نویس',
  'کارشناس فروش',
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

const PERSIAN_REGEX = /^[\u0600-\u06FF\s]+$/;

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, user, users }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessibleMenus, setAccessibleMenus] = useState<MenuItemId[]>([]);
  const [role, setRole] = useState<UserRole>('کارشناس پشتیبانی');
  const [errors, setErrors] = useState<string[]>([]);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0: none, 1: weak, 2: medium, 3: strong
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);


  useEffect(() => {
    if (isOpen) {
      if (user) { // Editing existing user
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setUsername(user.username);
        setAccessibleMenus(user.accessibleMenus || []);
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
        setRole('کارشناس پشتیبانی');
        setErrors([]);
        setPasswordStrength(0);
        setIsPasswordVisible(false);
        setIsConfirmPasswordVisible(false);
      }, 300); // Reset after closing animation
    }
  }, [user, isOpen, users]);

  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    
    if (score === 4) return 3; // Strong
    if (score >= 2) return 2; // Medium
    if (score >= 1) return 1; // Weak
    return 0;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };
  
  const handleGeneratePassword = () => {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const all = lower + upper + numbers;
    
    let generatedPassword = '';
    generatedPassword += lower[Math.floor(Math.random() * lower.length)];
    generatedPassword += upper[Math.floor(Math.random() * upper.length)];
    generatedPassword += numbers[Math.floor(Math.random() * numbers.length)];

    for (let i = 3; i < 12; i++) {
        generatedPassword += all[Math.floor(Math.random() * all.length)];
    }
    
    // Shuffle the password
    generatedPassword = generatedPassword.split('').sort(() => 0.5 - Math.random()).join('');

    setPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
    setPasswordStrength(checkPasswordStrength(generatedPassword));
  };

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

    if (!firstName.trim()) {
      validationErrors.push('نام نمی‌تواند خالی باشد.');
    } else if (!PERSIAN_REGEX.test(firstName)) {
      validationErrors.push('نام باید فقط شامل حروف فارسی باشد.');
    }

    if (!lastName.trim()) {
      validationErrors.push('نام خانوادگی نمی‌تواند خالی باشد.');
    } else if (!PERSIAN_REGEX.test(lastName)) {
      validationErrors.push('نام خانوادگی باید فقط شامل حروف فارسی باشد.');
    }

    if (!user && !password) {
        validationErrors.push('رمز عبور برای کاربر جدید الزامی است.');
    }
    if (password) {
        if (password.length < 8) {
            validationErrors.push('رمز عبور باید حداقل ۸ کاراکتر باشد.');
        } else {
            const hasLower = /[a-z]/.test(password);
            const hasUpper = /[A-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            if (!hasLower || !hasUpper || !hasNumber) {
                validationErrors.push('رمز عبور باید شامل حروف بزرگ، حروف کوچک و اعداد باشد.');
            }
        }
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
  
  const strengthConfig = {
    0: { width: 'w-0', color: '' },
    1: { width: 'w-1/3', color: 'bg-red-500' },
    2: { width: 'w-2/3', color: 'bg-yellow-500' },
    3: { width: 'w-full', color: 'bg-green-500' },
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
              <input type="text" name="firstName" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value.replace(/[^\u0600-\u06FF\s]/g, ''))} className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی</label>
              <input type="text" name="lastName" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value.replace(/[^\u0600-\u06FF\s]/g, ''))} className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
            </div>
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">نقش</label>
            <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm">
                {allRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">دسترسی به منوها</label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 border p-3 rounded-md bg-gray-50">
                {allMenus.map(menu => (
                <div key={menu.id} className="flex items-center">
                    <input id={`menu-${menu.id}`} type="checkbox" value={menu.id} checked={accessibleMenus.includes(menu.id)} onChange={handleMenuChange} className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" />
                    <label htmlFor={`menu-${menu.id}`} className="mr-2 block text-sm text-gray-900">{menu.label}</label>
                </div>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">رمز عبور {user ? '(در صورت تغییر وارد کنید)' : ''}</label>
              <div className="relative">
                <input 
                  type={isPasswordVisible ? 'text' : 'password'} 
                  name="password" 
                  id="password" 
                  value={password} 
                  onChange={handlePasswordChange} 
                  className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 pl-20 pr-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" 
                />
                <div className="absolute inset-y-0 left-0 flex items-center">
                    <button 
                        type="button" 
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)} 
                        title={isPasswordVisible ? 'مخفی کردن رمز' : 'نمایش رمز'} 
                        className="flex items-center justify-center h-full w-10 text-gray-400 hover:text-cyan-600"
                    >
                        {isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                    <div className="h-2/3 border-l border-gray-300"></div>
                    <button 
                        type="button" 
                        onClick={handleGeneratePassword} 
                        title="تولید رمز عبور قوی" 
                        className="flex items-center justify-center h-full w-10 text-gray-400 hover:text-cyan-600"
                    >
                        <SparklesIcon />
                    </button>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div className={`h-1.5 rounded-full ${strengthConfig[passwordStrength].color} ${strengthConfig[passwordStrength].width} transition-all duration-300`}></div>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">تکرار رمز عبور</label>
              <div className="relative">
                <input 
                  type={isConfirmPasswordVisible ? 'text' : 'password'} 
                  name="confirmPassword" 
                  id="confirmPassword" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 pl-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
                <button 
                  type="button" 
                  onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} 
                  title={isConfirmPasswordVisible ? 'مخفی کردن رمز' : 'نمایش رمز'} 
                  className="absolute inset-y-0 left-0 flex items-center justify-center w-10 text-gray-400 hover:text-cyan-600"
                >
                  {isConfirmPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400">انصراف</button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white">ذخیره</button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default UserFormModal;