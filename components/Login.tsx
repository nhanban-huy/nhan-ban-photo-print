
import React, { useState } from 'react';

const USERS = [
  { id: 'Admincp', name: 'Quản trị viên', pin: 'Bonham45', role: 'admin' },
  { id: 'NB1-Huy', name: 'Huy', pin: 'NB123456', role: 'staff' },
  { id: 'NB2-Gam', name: 'Gấm', pin: 'NB1234567', role: 'staff' },
  { id: 'NB3-Vinh', name: 'Vinh', pin: 'NB12345678', role: 'staff' },
  { id: 'NB4-Nhan', name: 'Nhân', pin: 'NB123456789', role: 'staff' },
];

interface LoginProps {
  onLogin: (user: {id: string, name: string, role: 'admin' | 'staff'}) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = USERS.find(u => u.id === username && u.pin === password);
    if (found) {
      onLogin({ id: found.id, name: found.name, role: found.role as 'admin' | 'staff' });
    } else {
      setError('Sai tên đăng nhập hoặc mật khẩu!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1e1b4b,transparent_70%)] opacity-30"></div>
      
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl rounded-[3rem] shadow-2xl overflow-hidden p-8 md:p-12 text-center border border-slate-800 relative z-10">
        <div className="bg-rose-600 text-white w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-rose-900/50">
          <i className="fas fa-print text-3xl"></i>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tighter uppercase mb-1">Nhân Bản Pro</h1>
        <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] mb-10">Hệ thống quản lý thông minh</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-left">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-4 mb-2 block">Tên đăng nhập</label>
            <input 
              className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 focus:border-rose-500 focus:ring-0 font-bold text-slate-100 transition-all outline-none"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="VD: NB1-Huy"
            />
          </div>
          <div className="text-left">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-4 mb-2 block">Mật khẩu</label>
            <input 
              type="password"
              className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 focus:border-rose-500 focus:ring-0 font-bold text-slate-100 transition-all outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="bg-rose-900/20 text-rose-500 py-3 rounded-xl text-[10px] font-black uppercase border border-rose-900/30">
              {error}
            </div>
          )}
          <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 mt-4 text-sm">
            Đăng nhập ngay
          </button>
        </form>
        
        <div className="mt-10 p-5 bg-slate-950/50 rounded-2xl border border-slate-800">
          <p className="text-[8px] font-black text-slate-600 uppercase leading-relaxed tracking-wider">
            Dành riêng cho nhân viên Nhân Bản Photo-Print Pro.<br/>Liên hệ Admin nếu quên mật khẩu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
