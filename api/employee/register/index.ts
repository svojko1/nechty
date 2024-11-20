// /api/employee/register.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    const { email, password, firstName, lastName, phone, facilityId,tableNumber,isAdminCreated = false } = req.body;

    // Create user account in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });

    if (authError) throw authError;

    // Insert additional user information into public.users table
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        role: 'employee'
      });

    if (userError) throw userError;

    // Create employee record with pending status
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .insert({
        user_id: authData.user.id,
        facility_id: facilityId,
        table_number: tableNumber, 
        status: isAdminCreated ? 'approved' : 'pending' // Set status based on creator
      })
      .select()
      .single();

    if (employeeError) throw employeeError;

    return res.status(200).json({ 
      data: employeeData,
      error: null 
    });

  } catch (error) {
    console.error('Error registering employee:', error);
    return res.status(500).json({ 
      error: 'Failed to register employee',
      details: error 
    });
  }
}