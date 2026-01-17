
import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import Login from './components/Login';
import { Order, OrderItem, PaymentStatus, WorkStatus, CustomerInfo, PaymentMethod, Expense, InventoryProduct } from './types';

const BANK_CONFIG = {
  bankId: 'vietinbank',
  accountNo: '100000713992',
  accountName: 'NGUYEN DINH HUY',
  template: 'compact'
};

const STORAGE_KEYS = {
  USER: 'nb_data_user',
  ORDERS: 'nb_data_orders',
  EXPENSES: 'nb_data_expenses',
  INVENTORY: 'nb_data_inventory',
  PRESETS: 'nb_data_presets'
};

// Utility to convert number to Vietnamese words
function numberToVietnameseWords(number: number): string {
  if (number === 0) return "Không đồng";
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const levels = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  
  const readGroup = (group: number): string => {
    let s = "";
    const h = Math.floor(group / 100);
    const t = Math.floor((group % 100) / 10);
    const d = group % 10;
    if (h > 0) s += units[h] + " trăm ";
    if (t > 1) s += units[t] + " mươi ";
    else if (t === 1) s += "mười ";
    else if (h > 0 && d > 0) s += "lẻ ";
    
    if (t !== 1 && d === 1) s += "mốt";
    else if (d === 5 && (t > 0 || h > 0)) s += "lăm";
    else if (d > 0) s += units[d];
    return s;
  };

  let res = "";
  let i = 0;
  let temp = Math.abs(number);
  do {
    const group = temp % 1000;
    if (group > 0) {
      const gStr = readGroup(group);
      res = gStr + " " + levels[i] + " " + res;
    }
    temp = Math.floor(temp / 1000);
    i++;
  } while (temp > 0);

  const final = res.trim().charAt(0).toUpperCase() + res.trim().slice(1) + " đồng";
  return final.replace(/\s+/g, ' ');
}

const App: React.FC = () => {
  const [user, setUser] = useState<{id: string, name: string, role: 'admin' | 'staff'} | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [view, setView] = useState<'dashboard' | 'orders' | 'create'>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingImg, setIsSavingImg] = useState(false);
  
  const [newExpense, setNewExpense] = useState({ 
    category: 'Nhập hàng', 
    itemName: '',
    amount: 0, 
    note: '',
    supplierName: '',
    quantity: 1,
    paymentMethod: PaymentMethod.CASH
  });
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (savedUser) setUser(JSON.parse(savedUser));
    const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    const savedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    const savedInventory = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (savedInventory) setInventory(JSON.parse(savedInventory));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
  }, [inventory]);

  const handleLogin = (userData: {id: string, name: string, role: 'admin' | 'staff'}) => {
    setUser(userData);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const handleSaveOrder = (items: OrderItem[], hasVat: boolean, customer: CustomerInfo) => {
    if (!user) return;
    
    const updatedInventory = [...inventory];
    items.forEach(item => {
      if (item.productId) {
        const idx = updatedInventory.findIndex(p => p.id === item.productId);
        if (idx !== -1) updatedInventory[idx].stock = Math.max(0, updatedInventory[idx].stock - item.quantity);
      }
    });
    setInventory(updatedInventory);

    const subTotal = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
    const vat = hasVat ? Math.round(subTotal * 0.08) : 0;
    const newOrder: Order = {
      id: `NB-${Math.floor(1000 + Math.random() * 8999)}`,
      createdAt: new Date().toISOString(),
      customer,
      items,
      subTotal,
      vat,
      total: subTotal + vat,
      hasVat,
      paymentStatus: PaymentStatus.PENDING,
      workStatus: WorkStatus.NOT_STARTED,
      paymentMethod: PaymentMethod.TRANSFER,
      employeeId: user.id
    };
    
    setOrders([newOrder, ...orders]);
    setView('orders');
    setSelectedOrder(newOrder);
  };

  const updatePaymentStatus = (id: string, status: PaymentStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, paymentStatus: status } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, paymentStatus: status } : null);
  };

  const updatePaymentMethod = (id: string, method: PaymentMethod) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, paymentMethod: method } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, paymentMethod: method } : null);
  };

  const handleAddExpense = () => {
    if (!user) return;
    if (!newExpense.amount) return alert("Vui lòng nhập số tiền!");
    if (!newExpense.itemName) return alert("Vui lòng nhập tên mặt hàng/vật tư!");
    
    const exp: Expense = {
      id: Math.random().toString(),
      date: new Date().toISOString(),
      category: newExpense.category,
      itemName: newExpense.itemName,
      amount: newExpense.amount,
      note: newExpense.note,
      employeeId: user.id,
      supplierName: newExpense.supplierName,
      quantity: newExpense.quantity,
      paymentMethod: newExpense.paymentMethod
    };
    setExpenses([exp, ...expenses]);
    setShowExpenseModal(false);
    setNewExpense({ category: 'Nhập hàng', itemName: '', amount: 0, note: '', supplierName: '', quantity: 1, paymentMethod: PaymentMethod.CASH });
  };

  const generateQrUrl = (amount: number, description: string) => {
    return `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-${BANK_CONFIG.template}.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;
  };

  const exportPDF = async () => {
    if (!printRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await (window as any).html2canvas(printRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('p', 'mm', 'a5');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight);
      pdf.save(`HoaDon-${selectedOrder?.id}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const saveAsImage = async () => {
    if (!printRef.current || isSavingImg) return;
    setIsSavingImg(true);
    try {
      const canvas = await (window as any).html2canvas(printRef.current, { scale: 3, useCORS: true });
      const link = document.createElement('a');
      link.download = `Invoice-${selectedOrder?.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } finally {
      setIsSavingImg(false);
    }
  };

  const filteredOrders = user?.role === 'admin' ? orders : orders.filter(o => o.employeeId === user?.id);

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <nav className="bg-slate-900 w-full md:w-64 border-b md:border-r border-slate-800 p-4 md:flex-shrink-0 no-print flex md:flex-col items-center md:items-stretch justify-between md:justify-start gap-4">
        <div className="flex items-center gap-3 md:mb-10 px-2">
          <div className="bg-rose-600 text-white p-2.5 rounded-xl shadow-lg"><i className="fas fa-print text-xl"></i></div>
          <div className="leading-tight hidden sm:block">
            <h1 className="font-black text-slate-100 text-lg uppercase tracking-tighter">NHÂN BẢN</h1>
            <p className="text-[10px] font-bold text-rose-500 tracking-tighter uppercase">Professional Hub</p>
          </div>
        </div>
        <ul className="flex md:flex-col gap-2 font-bold overflow-x-auto no-scrollbar py-2 md:py-0">
          <li className="flex-shrink-0"><button onClick={() => setView('dashboard')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><i className="fas fa-chart-pie"></i> <span className="hidden md:inline">Dashboard</span></button></li>
          <li className="flex-shrink-0"><button onClick={() => setView('orders')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'orders' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><i className="fas fa-receipt"></i> <span className="hidden md:inline">Đơn hàng</span></button></li>
          <li className="flex-shrink-0"><button onClick={() => setView('create')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><i className="fas fa-plus-circle"></i> <span className="hidden md:inline">Tạo mới</span></button></li>
        </ul>
        <div className="hidden md:block mt-auto pt-10 px-2">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-900/20 transition-all font-bold"><i className="fas fa-sign-out-alt"></i> <span>Đăng xuất</span></button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen no-print">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">{view === 'dashboard' ? 'Thống kê tổng quan' : view === 'orders' ? 'Quản lý đơn hàng' : 'Thiết lập đơn hàng mới'}</h2>
          <div className="bg-slate-900 p-2 pr-4 rounded-2xl border border-slate-800 flex items-center gap-3 shadow-xl">
             <img src={`https://ui-avatars.com/api/?name=${user.name}&background=4f46e5&color=fff`} className="w-8 h-8 rounded-full" />
             <div className="text-left"><p className="text-[9px] font-black text-rose-500 uppercase">{user.role}</p><p className="text-xs font-bold text-slate-200">{user.name}</p></div>
          </div>
        </header>

        {view === 'dashboard' && <Dashboard orders={orders} expenses={expenses} inventory={inventory} setInventory={setInventory} isAdmin={user.role === 'admin'} onAddExpense={() => setShowExpenseModal(true)} />}
        {view === 'create' && <OrderForm onSave={handleSaveOrder} onCancel={() => setView('orders')} inventory={inventory} />}
        {view === 'orders' && (
          <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-5">Đơn hàng / NV</th>
                    <th className="px-6 py-5">Khách hàng</th>
                    <th className="px-6 py-5">Thu nhập</th>
                    <th className="px-6 py-5">Trạng thái</th>
                    <th className="px-6 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs font-medium">
                  {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-200">{order.id}</p>
                        <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">NV: {order.employeeId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-200 font-bold uppercase">{order.customer.name}</p>
                        <p className="text-[10px] text-slate-500">{order.customer.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-200">{order.total.toLocaleString()}đ</p>
                        <p className={`text-[9px] font-black uppercase ${order.paymentMethod === PaymentMethod.CASH ? 'text-emerald-500' : 'text-blue-500'}`}>{order.paymentMethod}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black ${
                          order.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-900/30 text-emerald-400' : 
                          order.paymentStatus === PaymentStatus.CANCELLED ? 'bg-rose-900/30 text-rose-400' :
                          'bg-amber-900/30 text-amber-400'
                        }`}>{order.paymentStatus}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedOrder(order)} className="w-10 h-10 flex items-center justify-center text-indigo-400 hover:bg-slate-800 rounded-xl transition-all"><i className="fas fa-file-invoice"></i></button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="py-20 text-center text-slate-600 font-black uppercase italic tracking-widest text-[10px]">Chưa có dữ liệu đơn hàng</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
           <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl">
              <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2"><i className="fas fa-wallet text-rose-500"></i> Ghi nhận chi phí</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Loại chi</label>
                    <select className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 text-xs outline-none" value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}>
                      <option value="Nhập hàng">Nhập hàng</option>
                      <option value="Mực in">Mực in</option>
                      <option value="Giấy in">Giấy in</option>
                      <option value="Bảo trì">Bảo trì</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Hình thức</label>
                    <select className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 text-xs outline-none" value={newExpense.paymentMethod} onChange={(e) => setNewExpense({...newExpense, paymentMethod: e.target.value as PaymentMethod})}>
                      {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tên mặt hàng/vật tư *</label>
                  <input className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none focus:border-indigo-500" value={newExpense.itemName} onChange={(e) => setNewExpense({...newExpense, itemName: e.target.value})} placeholder="VD: Mực Canon, Giấy A4..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Đối tác / Nhà cung cấp</label>
                  <input className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none focus:border-indigo-500" value={newExpense.supplierName} onChange={(e) => setNewExpense({...newExpense, supplierName: e.target.value})} placeholder="Tên đơn vị..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Số lượng</label>
                    <input type="number" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none" value={newExpense.quantity || ''} onChange={(e) => setNewExpense({...newExpense, quantity: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Số tiền (VNĐ)</label>
                    <input type="number" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none" value={newExpense.amount || ''} onChange={(e) => setNewExpense({...newExpense, amount: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Nội dung chi tiết</label>
                  <input className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none" value={newExpense.note} onChange={(e) => setNewExpense({...newExpense, note: e.target.value})} placeholder="Ghi chú thêm..." />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowExpenseModal(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 font-black uppercase text-[10px] rounded-2xl tracking-widest active:scale-95 transition-all">Hủy</button>
                <button onClick={handleAddExpense} className="flex-1 py-4 bg-rose-600 text-white font-black uppercase text-[10px] rounded-2xl shadow-xl shadow-rose-900/20 active:scale-95 transition-all">Lưu chi phí</button>
              </div>
           </div>
        </div>
      )}

      {/* Invoice Viewer */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col my-auto border border-slate-800 animate-in zoom-in duration-300">
            <div className="p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center px-10 rounded-t-[3rem]">
              <div className="flex flex-col">
                 <h3 className="font-black uppercase tracking-widest text-sm text-slate-100">Chi tiết hóa đơn {selectedOrder.id}</h3>
                 <p className="text-[10px] font-bold text-slate-500 uppercase">Nhân viên: {selectedOrder.employeeId}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full hover:bg-rose-500 transition-all text-slate-400 hover:text-white"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-5 rounded-[2rem] border border-slate-800 shadow-inner">
                   <label className="text-[9px] font-black text-slate-500 uppercase mb-3 block tracking-widest">Trạng thái xử lý</label>
                   <select value={selectedOrder.paymentStatus} onChange={(e) => updatePaymentStatus(selectedOrder.id, e.target.value as PaymentStatus)} className="w-full bg-slate-900 rounded-xl text-xs font-black p-3 text-slate-200 border-none outline-none focus:ring-1 focus:ring-indigo-500">
                     {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div className="bg-slate-950 p-5 rounded-[2rem] border border-slate-800 shadow-inner">
                  <label className="text-[9px] font-black text-slate-500 uppercase mb-3 block tracking-widest">Phương thức thu</label>
                  <select value={selectedOrder.paymentMethod} onChange={(e) => updatePaymentMethod(selectedOrder.id, e.target.value as PaymentMethod)} className="w-full bg-slate-900 rounded-xl text-xs font-black p-3 text-slate-200 border-none outline-none focus:ring-1 focus:ring-indigo-500">
                    {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Professional Invoice Preview */}
              <div className="bg-white rounded-3xl p-0 border border-slate-300 overflow-hidden flex justify-center shadow-2xl relative">
                <div ref={printRef} className="bg-white p-12 mx-auto text-black" style={{ width: '148mm', minHeight: '210mm', fontFamily: 'Inter, sans-serif' }}>
                  {/* Header */}
                  <div style={{ borderBottom: '3px solid black', paddingBottom: '20px', marginBottom: '25px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0', letterSpacing: '4px', textAlign: 'center', textTransform: 'uppercase', color: '#000' }}>NHÂN BẢN</h1>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#dc2626', letterSpacing: '2px', textTransform: 'uppercase', margin: '4px 0 10px 0', textAlign: 'center' }}>Professional Printing</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: '#000' }}>
                      <p style={{ fontSize: '9px', fontWeight: '500', margin: 0 }}>45 Phù Đổng Thiên Vương, P. Chợ Lớn, TP.HCM<br/>Hotline: 0912.117.191</p>
                      <div style={{ textAlign: 'right' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: '900', margin: '0', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>PHIẾU THANH TOÁN</h2>
                        <div style={{ backgroundColor: '#000', color: '#fff', padding: '4px 10px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '900', margin: '0' }}>#{selectedOrder.id}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div style={{ marginBottom: '25px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', fontSize: '10px', gap: '20px', color: '#000' }}>
                     <div>
                        <p style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '8px', color: '#666', marginBottom: '4px' }}>Khách hàng:</p>
                        <p style={{ fontWeight: '800', fontSize: '12px', margin: '0' }}>{selectedOrder.customer.name}</p>
                        <p style={{ margin: '2px 0', fontWeight: '600' }}>SĐT: {selectedOrder.customer.phone}</p>
                        {selectedOrder.customer.address && (
                          <p style={{ margin: '2px 0', fontWeight: '500', fontSize: '9px' }}>Đ/C: {selectedOrder.customer.address}</p>
                        )}
                     </div>
                     <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '8px', color: '#666', marginBottom: '4px' }}>Thông tin đơn:</p>
                        <p style={{ fontWeight: '800', fontSize: '10px', margin: '0' }}>{selectedOrder.paymentMethod}</p>
                        <p style={{ 
                          margin: '2px 0', 
                          color: selectedOrder.paymentStatus === PaymentStatus.PENDING ? '#dc2626' : '#000', 
                          fontWeight: '800',
                          fontStyle: selectedOrder.paymentStatus === PaymentStatus.PENDING ? 'italic' : 'normal'
                        }}>{selectedOrder.paymentStatus}</p>
                        <p style={{ fontSize: '9px', color: '#333', fontWeight: '500' }}>{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
                     </div>
                  </div>

                  {/* Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', color: '#000' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', fontSize: '9px', fontWeight: '900', textAlign: 'left' }}>
                        <th style={{ padding: '12px 10px', borderBottom: '2px solid black' }}>NỘI DUNG DỊCH VỤ</th>
                        <th style={{ padding: '12px 10px', borderBottom: '2px solid black', textAlign: 'center' }}>SL</th>
                        <th style={{ padding: '12px 10px', borderBottom: '2px solid black', textAlign: 'right' }}>THÀNH TIỀN</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '11px' }}>
                      {selectedOrder.items.map((it, idx) => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '12px 10px', fontWeight: '700' }}>{idx + 1}. {it.service}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700' }}>{it.quantity}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800' }}>{(it.quantity * it.unitPrice).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals & QR */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: '#000' }}>
                     <div style={{ textAlign: 'center', padding: '10px', border: '1px solid #ddd', borderRadius: '15px' }}>
                        <img src={generateQrUrl(selectedOrder.total, selectedOrder.id)} style={{ width: '100px', height: '100px' }} alt="Payment QR" />
                        <p style={{ fontSize: '8px', fontWeight: '900', marginTop: '5px', color: '#000' }}>QUÉT ĐỂ THANH TOÁN</p>
                     </div>
                     <div style={{ width: '240px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '6px' }}>
                           <span style={{ fontWeight: '600' }}>Tiền hàng:</span>
                           <span style={{ fontWeight: '800' }}>{selectedOrder.subTotal.toLocaleString()}đ</span>
                        </div>
                        {selectedOrder.hasVat && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '6px' }}>
                             <span style={{ fontWeight: '600' }}>Thuế VAT (8%):</span>
                             <span style={{ fontWeight: '800' }}>{selectedOrder.vat.toLocaleString()}đ</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', borderTop: '2.5px solid black', paddingTop: '10px', marginTop: '5px', color: '#dc2626' }}>
                           <span style={{ whiteSpace: 'nowrap' }}>TỔNG CỘNG:</span>
                           <span>{selectedOrder.total.toLocaleString()}đ</span>
                        </div>
                        <p style={{ fontSize: '9px', fontWeight: '700', marginTop: '10px', fontStyle: 'italic', textAlign: 'right' }}>
                          Bằng chữ: {numberToVietnameseWords(selectedOrder.total)}
                        </p>
                     </div>
                  </div>

                  <div style={{ marginTop: '35px', textAlign: 'center', borderTop: '1px dashed #000', paddingTop: '15px', color: '#000' }}>
                     <p style={{ fontSize: '9px', fontWeight: '800', fontStyle: 'italic' }}>Cảm ơn Quý khách! Chúc bạn một ngày tốt lành.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pb-4">
                <button onClick={exportPDF} disabled={isExporting} className="flex-1 bg-indigo-600 text-white py-5 rounded-3xl font-black text-xs uppercase shadow-xl hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50"><i className="fas fa-file-pdf mr-2"></i> Xuất PDF</button>
                <button onClick={saveAsImage} disabled={isSavingImg} className="flex-1 bg-emerald-600 text-white py-5 rounded-3xl font-black text-xs uppercase shadow-xl hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50"><i className="fas fa-image mr-2"></i> Lưu Hình</button>
                <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-slate-800 text-slate-400 py-5 rounded-3xl font-black text-xs uppercase hover:bg-slate-700 transition-all active:scale-95">Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
