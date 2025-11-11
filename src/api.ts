import axios from 'axios';

// اطلاعات اتصال به پروژه Supabase شما
const supabaseUrl = 'https://cxnogjmixazoxadqdfhd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bm9nam1peGF6b3hhZHFkZmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4Mjc1MzYsImV4cCI6MjA3NzQwMzUzNn0.n9482DzZSJfOqF--h8jQbcecpXX_Q-9tM21oRlfSa64';

// ایجاد یک نمونه axios با تنظیمات پایه برای Supabase REST API
const api = axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`, // Use anon key for all requests
    'Content-Type': 'application/json',
  }
});

export default api;