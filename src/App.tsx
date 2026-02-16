import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { MedicationForm } from './components/MedicationForm';
import { MedicationList } from './components/MedicationList';
import type { User } from './types/database.types';

// Main App component
function App() {
  // State for user and loading
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show auth if not logged in
  if (!user) {
    return <Auth />;
  }

  // Show main app if logged in
  return (
    <Layout user={user}>
      <div className="space-y-8">
        {/* Section for caretaker - add medications */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Add Medication (Caretaker)
          </h2>
          <MedicationForm userId={user.id} />
        </section>

        {/* Section for patient - view and take medications */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Today's Medications (Patient)
          </h2>
          <MedicationList userId={user.id} />
        </section>
      </div>
    </Layout>
  );
}

export default App;