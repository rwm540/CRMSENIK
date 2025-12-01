
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uefwscdoewfvqbdsrrqd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZndzY2RvZXdmdnFiZHNycnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTY4MTcsImV4cCI6MjA4MDE3MjgxN30.3VJNMox1ecSSIYHtL-ugsj-qdj2fGIZrGnAnMasyHpQ';

// نام باکت (bucket) برای ذخیره پیوست‌ها
// نکته: این باکت باید در داشبورد Supabase شما به صورت دستی ایجاد شده و روی حالت "Public" تنظیم شده باشد.
export const BUCKET_NAME = 'attachments';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
