import React, { useState } from 'react';
import Alert from '../components/Alert';

interface LoginPageProps {
  onLogin: (payload: { identifier: string; password: string; }) => Promise<{ success: boolean; message?: string; }>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    const response = await onLogin({ identifier, password });
    if (!response.success) {
      setErrors([response.message || 'خطای نامشخص']);
    }
    
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50" dir="rtl">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-200/80">
        <div className="text-center">
            <img 
              src="/senik_2.png" 
              alt="لوگو" 
              className="mx-auto h-24 w-auto" 
            />
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Alert messages={errors} onClose={() => setErrors([])} />
          <div className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
                نام کاربری
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                placeholder="نام کاربری خود را وارد کنید"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                رمز عبور
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'در حال بررسی...' : 'ورود'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;