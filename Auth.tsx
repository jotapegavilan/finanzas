import React, { useState } from 'react';
import { registerUser, loginUser } from './database';
import { User } from './types';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
        setError('Por favor, completa todos los campos.');
        return;
    }
    setError('');
    setIsLoading(true);
    try {
      const user = isLogin 
        ? await loginUser(username, password)
        : await registerUser(username, password);
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-sm w-full mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-indigo-600">Finanzas Personales</h1>
            <p className="text-slate-500 mt-2">Tu panel financiero inteligente</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {isLogin ? 'Bienvenido de Nuevo' : 'Crea tu Cuenta'}
            </h2>
            <p className="text-center text-slate-500 mb-6">
            {isLogin ? 'Ingresa para ver tu panel.' : 'Gestiona tus finanzas hoy.'}
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-600 mb-1">Usuario</label>
                <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="tu_usuario" required />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" required />
            </div>

            {error && <p className="text-sm text-red-600 text-center bg-red-100 p-2 rounded-lg">{error}</p>}
            
            <button type="submit" disabled={isLoading} className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md disabled:bg-indigo-400 disabled:cursor-not-allowed">
                {isLoading ? (isLogin ? 'Iniciando...' : 'Registrando...') : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </button>
            </form>

            <p className="text-center text-sm text-slate-600 mt-6">
            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-semibold text-indigo-600 hover:text-indigo-500 ml-1">
                {isLogin ? 'Regístrate' : 'Inicia Sesión'}
            </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
