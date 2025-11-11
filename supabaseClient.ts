import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cxnogjmixazoxadqdfhd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bm9nam1peGF6b3hhZHFkZmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4Mjc1MzYsImV4cCI6MjA3NzQwMzUzNn0.n9482DzZSJfOqF--h8jQbcecpXX_Q-9tM21oRlfSa64';

// نام باکت (bucket) برای ذخیره پیوست‌ها
// نکته: این باکت باید در داشبورد Supabase شما به صورت دستی ایجاد شده و روی حالت "Public" تنظیم شده باشد.
export const BUCKET_NAME = 'attachments';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);