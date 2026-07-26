import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = 'https://ycffsnlrxalxcpfsrdjq.supabase.co';
const supabaseKey  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZmZzbmxyeGFseGNwZnNyZGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjUxMDMsImV4cCI6MjEwMDY0MTEwM30.hI1bZSn1RJCalO1nQtJKAMYljflo1_3JtEdh3Q9-GUA';

export const supabase = createClient(supabaseUrl, supabaseKey);


