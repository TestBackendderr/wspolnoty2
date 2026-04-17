import { AppDataProvider } from '@/app/providers/AppDataProvider';
import { AuthProvider } from '@/app/providers/AuthProvider';
import AppRoutes from '@/app/routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <AppRoutes />
      </AppDataProvider>
    </AuthProvider>
  );
}
