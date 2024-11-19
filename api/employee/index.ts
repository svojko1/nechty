// /api/employee/checkout/checkout.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Inicializácia Supabase klienta
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { queueEntryId, facilityId } = req.body;
    const now = new Date();

    // Update employee queue entry
    const { data, error } = await supabase
      .from('employee_queue')
      .update({
        check_out_time: now.toISOString(),
        is_active: false,
        current_customer_id: null,
      })
      .eq('id', queueEntryId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ data, error: null });
  } catch (error) {
    console.error('Error checking out employee:', error);
    return res.status(500).json({ 
      error: 'Failed to check out employee',
      details: error 
    });
  }
}