import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rhckhfknvslaipnotbck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoY2toZmtudnNsYWlwbm90YmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE1MTQsImV4cCI6MjA3ODAwNzUxNH0.ICBI10u656xTUnay_64XqIA6XCBUkR4LR-SXKoM_mlg';

// نام باکت (bucket) برای ذخیره پیوست‌ها
// نکته: این باکت باید در داشبورد Supabase شما به صورت دستی ایجاد شده و روی حالت "Public" تنظیم شده باشد.
export const BUCKET_NAME = 'attachments';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);