import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://reefordgdyclhstnqxhe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZWZvcmRnZHljbGhzdG5xeGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDgxOTAsImV4cCI6MjA4NDYyNDE5MH0.jOHR4NonItIc8vHpR0BdizfIrlg2grsjuOfRvUVYvVY'
export const supabase = createClient(supabaseUrl, supabaseKey)
