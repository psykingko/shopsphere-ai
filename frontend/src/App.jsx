import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';

function AuthenticatedShell() {
  const { principal, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans text-slate-900">
      <main className="max-w-2xl w-full p-8 bg-white shadow-sm rounded-lg border border-slate-200 text-center">
        <h1 className="text-3xl font-bold text-indigo-600 mb-4">ShopSphere AI</h1>
        <p className="text-lg text-slate-600 mb-6">AI-powered business workflow platform</p>
        
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 mb-6">
          <p className="font-medium">Welcome! You are authenticated as {principal?.role}.</p>
          <p className="text-sm mt-1">Principal ID: {principal?.principal_id}</p>
        </div>

        <button 
          onClick={logout}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 underline"
        >
          Sign out
        </button>
      </main>
    </div>
  );
}

function MainContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Loading session...</p>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedShell /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
