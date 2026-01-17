
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';
import { Order, PaymentStatus, Expense, PresetService, InventoryProduct, ProductType, PaymentMethod } from '../types';

interface DashboardProps {
  orders: Order[];
  expenses: Expense[];
  inventory: InventoryProduct[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryProduct[]>>;
  isAdmin: boolean;
  onAddExpense?: () => void;
}

const STORAGE_KEYS = {
  PRESETS: 'nb_data_presets',
  INVENTORY: 'nb_data_inventory'
};

const Dashboard: React.FC<DashboardProps> = ({ orders, expenses, inventory, setInventory, isAdmin, onAddExpense }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'services' | 'inventory' | 'staff'>('stats');
  const [presetServices, setPresetServices] = useState<PresetService[]>([]);
  const [showInvModal, setShowInvModal] = useState(false);
  const [newInventory, setNewInventory] = useState<Partial<InventoryProduct>>({
    name: '',
    type: ProductType.BOOK,
    stock: 0,
    importPrice: 0,
    salePrice: 0,
    image: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (saved) setPresetServices(JSON.parse(saved));
  }, []);

  const financialSummary = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const getStatsForRange = (startDate: Date) => {
      const filtered = orders.filter(o => o.paymentStatus === PaymentStatus.PAID && new Date(o.createdAt) >= startDate);
      const cash = filtered.filter(o => o.paymentMethod === PaymentMethod.CASH).reduce((s, o) => s + o.total, 0);
      const transfer = filtered.filter(o => o.paymentMethod === PaymentMethod.TRANSFER).reduce((s, o) => s + o.total, 0);
      return { cash, transfer, total: cash + transfer };
    };

    const getExpenseForRange = (startDate: Date) => {
      return expenses.filter(e => new Date(e.date) >= startDate).reduce((s, e) => s + e.amount, 0);
    };

    return {
      today: getStatsForRange(startOfToday),
      last7Days: getStatsForRange(sevenDaysAgo),
      thisMonth: getStatsForRange(startOfMonth),
      last6Months: getStatsForRange(sixMonthsAgo),
      last1Year: getStatsForRange(oneYearAgo),
      expensesTotal: getExpenseForRange(oneYearAgo) 
    };
  }, [orders, expenses]);

  const staffStats = useMemo(() => {
    const staffIds = Array.from(new Set(orders.map(o => o.employeeId)));
    return staffIds.map(empId => {
      const empOrders = orders.filter(o => o.employeeId === empId);
      const empPaid = empOrders.filter(o => o.paymentStatus === PaymentStatus.PAID);
      const empPending = empOrders.filter(o => o.paymentStatus === PaymentStatus.PENDING);
      const empCancelled = empOrders.filter(o => o.paymentStatus === PaymentStatus.CANCELLED);
      
      const cash = empPaid.filter(o => o.paymentMethod === PaymentMethod.CASH).reduce((s, o) => s + o.total, 0);
      const transfer = empPaid.filter(o => o.paymentMethod === PaymentMethod.TRANSFER).reduce((s, o) => s + o.total, 0);
      
      const empExp = expenses.filter(e => e.employeeId === empId).reduce((s, e) => s + e.amount, 0);

      return { 
        empId, 
        revenue: cash + transfer, 
        cash, 
        transfer, 
        expense: empExp,
        paid: empPaid.length, 
        pending: empPending.length, 
        cancelled: empCancelled.length 
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [orders, expenses]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewInventory(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddInventory = () => {
    if (!newInventory.name || !newInventory.salePrice) return alert("Vui lòng nhập tên và giá bán!");
    const prod: InventoryProduct = {
      id: Math.random().toString(),
      name: newInventory.name!,
      type: newInventory.type || ProductType.BOOK,
      stock: newInventory.stock || 0,
      importPrice: newInventory.importPrice || 0,
      salePrice: newInventory.salePrice!,
      image: newInventory.image
    };
    const updated = [...inventory, prod];
    setInventory(updated);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updated));
    setShowInvModal(false);
    setNewInventory({ name: '', type: ProductType.BOOK, stock: 0, importPrice: 0, salePrice: 0, image: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-900 p-1.5 rounded-2xl w-fit border border-slate-800 overflow-x-auto no-scrollbar gap-2">
        <button onClick={() => setActiveTab('stats')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Doanh thu</button>
        <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Kho hàng</button>
        {isAdmin && (
          <>
            <button onClick={() => setActiveTab('staff')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'staff' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Hiệu quả NV</button>
            <button onClick={() => setActiveTab('services')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'services' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Dịch vụ</button>
          </>
        )}
      </div>

      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Hôm nay', data: financialSummary.today, color: 'text-emerald-400' },
              { label: '7 ngày qua', data: financialSummary.last7Days, color: 'text-blue-400' },
              { label: 'Tháng này', data: financialSummary.thisMonth, color: 'text-indigo-400' },
              { label: '6 tháng qua', data: financialSummary.last6Months, color: 'text-amber-400' },
              { label: '1 năm qua', data: financialSummary.last1Year, color: 'text-rose-400' },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">{item.label}</p>
                  <h3 className={`text-lg font-black ${item.color} mb-1`}>{item.data.total.toLocaleString()}đ</h3>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                    <span>Tiền mặt:</span>
                    <span className="text-slate-300">{item.data.cash.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                    <span>C.Khoản:</span>
                    <span className="text-slate-300">{item.data.transfer.toLocaleString()}đ</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
            <h4 className="text-xs font-black uppercase text-slate-100 mb-6 tracking-widest flex items-center gap-2">
              <i className="fas fa-clipboard-list text-indigo-500"></i> Sổ chi phí & Nhập hàng
            </h4>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="text-[9px] font-black text-slate-500 uppercase border-b border-slate-800">
                  <tr>
                    <th className="pb-4 px-2">Ngày / NV</th>
                    <th className="pb-4 px-2">Mặt hàng / Vật tư</th>
                    <th className="pb-4 px-2">Nhà cung cấp</th>
                    <th className="pb-4 px-2 text-center">SL</th>
                    <th className="pb-4 px-2">Hình thức</th>
                    <th className="pb-4 px-2 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold divide-y divide-slate-800">
                  {expenses.length > 0 ? expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-950/50 transition-colors">
                      <td className="py-4 px-2">
                        <p className="text-slate-200">{new Date(exp.date).toLocaleDateString('vi-VN')}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-black">{exp.employeeId}</p>
                      </td>
                      <td className="py-4 px-2">
                        <p className="text-slate-200 font-black">{exp.itemName || 'Chưa đặt tên'}</p>
                        <p className={`text-[9px] uppercase font-black ${exp.category === 'Nhập hàng' ? 'text-indigo-400' : 'text-amber-500'}`}>{exp.category}</p>
                      </td>
                      <td className="py-4 px-2">
                        <p className="text-slate-400 italic">{exp.supplierName || 'N/A'}</p>
                        <p className="text-[9px] text-slate-600 truncate max-w-[150px]">{exp.note}</p>
                      </td>
                      <td className="py-4 px-2 text-center text-slate-500">{exp.quantity || 1}</td>
                      <td className="py-4 px-2">
                        <span className={`px-2 py-1 rounded text-[8px] font-black ${exp.paymentMethod === PaymentMethod.TRANSFER ? 'bg-blue-900/20 text-blue-400' : 'bg-emerald-900/20 text-emerald-400'}`}>
                          {exp.paymentMethod || 'TIỀN MẶT'}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right text-rose-400 font-black">-{exp.amount.toLocaleString()}đ</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[10px] font-black uppercase text-slate-600 tracking-widest italic">Chưa có dữ liệu chi phí</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button onClick={onAddExpense} className="mt-6 w-full py-4 bg-slate-800 hover:bg-slate-700 transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-700">+ Ghi nhận chi phí mới</button>
          </div>
        </div>
      )}

      {activeTab === 'staff' && isAdmin && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl animate-in fade-in">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
            <h4 className="text-sm font-black uppercase text-slate-100 tracking-widest">Hiệu quả nhân sự & Đối soát</h4>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {staffStats.map(staff => (
              <div key={staff.empId} className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 flex flex-col shadow-inner">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <img src={`https://ui-avatars.com/api/?name=${staff.empId}&background=4f46e5&color=fff`} className="w-12 h-12 rounded-2xl shadow-lg" />
                    <div>
                      <h5 className="font-black text-slate-100 text-base">{staff.empId}</h5>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Doanh thu: {staff.revenue.toLocaleString()}đ</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-rose-500 italic">Chi: -{staff.expense.toLocaleString()}đ</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <p className="text-[8px] font-black text-emerald-400 uppercase">Hoàn tất</p>
                    <p className="text-xs font-black text-slate-200">{staff.paid}</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <p className="text-[8px] font-black text-amber-400 uppercase">Đang chờ</p>
                    <p className="text-xs font-black text-slate-200">{staff.pending}</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <p className="text-[8px] font-black text-rose-500 uppercase">Đã hủy</p>
                    <p className="text-xs font-black text-slate-200">{staff.cancelled}</p>
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="text-slate-500">Thu Tiền mặt (Phải nộp):</span>
                    <span className="text-emerald-400 text-xs">{staff.cash.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="text-slate-500">Chuyển khoản:</span>
                    <span className="text-blue-400 text-xs">{staff.transfer.toLocaleString()}đ</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-sm font-black uppercase text-slate-100 tracking-widest">Kho hàng bán lẻ</h4>
            <button onClick={() => setShowInvModal(true)} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl">+ Nhập hàng</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {inventory.map(prod => (
              <div key={prod.id} className="bg-slate-950 p-4 rounded-3xl border border-slate-800 group transition-all hover:border-indigo-500/50">
                <div className="aspect-square bg-slate-900 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border border-slate-800">
                  {prod.image ? <img src={prod.image} className="w-full h-full object-cover" /> : <i className="fas fa-box text-3xl text-slate-800"></i>}
                </div>
                <h5 className="font-black text-xs text-slate-100 mb-1 truncate">{prod.name}</h5>
                <p className="text-[10px] font-black text-indigo-400">{prod.salePrice.toLocaleString()}đ</p>
                <div className="flex justify-between items-center mt-3">
                   <p className={`text-[9px] font-bold ${prod.stock <= 5 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`}>Tồn: {prod.stock}</p>
                   <p className="text-[8px] font-black text-slate-700 italic">ID: {prod.id.slice(0,4)}</p>
                </div>
              </div>
            ))}
          </div>

          {showInvModal && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[70] flex items-center justify-center p-4">
              <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-8 text-slate-100 flex items-center gap-3">
                  <i className="fas fa-truck-loading text-indigo-500"></i> Nhập hàng vào kho
                </h3>
                
                <div className="flex flex-col items-center mb-8">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 bg-slate-950 rounded-3xl border-2 border-dashed border-slate-800 hover:border-indigo-500 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden group relative"
                  >
                    {newInventory.image ? (
                      <>
                        <img src={newInventory.image} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <i className="fas fa-camera text-white text-xl"></i>
                        </div>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus text-slate-700 text-xl mb-2"></i>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center px-4">Tải ảnh sản phẩm</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                  {newInventory.image && (
                    <button 
                      onClick={() => setNewInventory(prev => ({ ...prev, image: '' }))} 
                      className="mt-3 text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tên sản phẩm</label>
                    <input className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none focus:border-indigo-500" value={newInventory.name} onChange={(e) => setNewInventory({...newInventory, name: e.target.value})} placeholder="VD: Bút bi Thiên Long" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Loại</label>
                      <select className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 text-xs outline-none" value={newInventory.type} onChange={(e) => setNewInventory({...newInventory, type: e.target.value as ProductType})}>
                        <option value={ProductType.BOOK}>Sách</option>
                        <option value={ProductType.STATIONERY}>VPP</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Số lượng tồn</label>
                      <input type="number" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none" value={newInventory.stock || ''} onChange={(e) => setNewInventory({...newInventory, stock: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Giá nhập</label>
                      <input type="number" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none" value={newInventory.importPrice || ''} onChange={(e) => setNewInventory({...newInventory, importPrice: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Giá bán</label>
                      <input type="number" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none" value={newInventory.salePrice || ''} onChange={(e) => setNewInventory({...newInventory, salePrice: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-10">
                  <button onClick={() => setShowInvModal(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 font-black uppercase text-[10px] rounded-2xl tracking-widest">Hủy</button>
                  <button onClick={handleAddInventory} className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase text-[10px] rounded-2xl shadow-xl">Thêm vào kho</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'services' && isAdmin && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl animate-in slide-in-from-right-4">
           <h4 className="text-sm font-black uppercase text-slate-100 mb-6 tracking-widest">Quản lý Preset Dịch vụ</h4>
           <p className="text-slate-500 text-xs mb-8">Danh mục này sẽ hiển thị ở form lên đơn để chọn nhanh và cung cấp ngữ cảnh cho trợ lý AI.</p>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {presetServices.map(ps => (
               <div key={ps.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                 <span className="text-[11px] font-black text-slate-200">{ps.name}</span>
                 <span className="text-[10px] font-bold text-indigo-400">{ps.defaultPrice.toLocaleString()}đ</span>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
