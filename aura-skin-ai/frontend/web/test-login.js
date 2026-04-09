const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wipwjchfmttscteqtcmq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcHdqY2hmbXR0c2N0ZXF0Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTQxODYsImV4cCI6MjA4ODQzMDE4Nn0.lqx7HedbVS9F7Q3eycovKwQcVrixI1w1GSTsbB9EquE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testLogin = async () => {
  console.log('Attempting test login for test@email.com...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@email.com',
      password: 'password'
    });

    if (error) {
      console.log('Login failed:', error.message);
    } else if (data.session) {
      console.log('LOGIN_OK');
    } else {
      console.log('Login succeeded but no session returned.');
    }
  } catch (e) {
    console.error('An unexpected error occurred:', e.message);
  }
};

testLogin();
