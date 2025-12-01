
import axios from 'axios';

// اطلاعات اتصال به پروژه Supabase شما
const supabaseUrl = 'https://uefwscdoewfvqbdsrrqd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZndzY2RvZXdmdnFiZHNycnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTY4MTcsImV4cCI6MjA4MDE3MjgxN30.3VJNMox1ecSSIYHtL-ugsj-qdj2fGIZrGnAnMasyHpQ';

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
