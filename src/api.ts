import axios from 'axios';

// اطلاعات اتصال به پروژه Supabase شما
const supabaseUrl = 'https://rhckhfknvslaipnotbck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoY2toZmtudnNsYWlwbm90YmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE1MTQsImV4cCI6MjA3ODAwNzUxNH0.ICBI10u656xTUnay_64XqIA6XCBUkR4LR-SXKoM_mlg';

// ایجاد یک نمونه axios با تنظیمات پایه برای Supabase REST API
const api = axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  }
});

export default api;