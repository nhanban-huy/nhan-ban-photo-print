
import React, { useState, useEffect } from 'react';
import AIAssistant from './AIAssistant';
import { uploadImage } from '../services/uploadImage';
import { OrderItem, CustomerInfo, PresetService, InventoryProduct, ProductType } from '../types';

interface OrderFormProps {
  onSave: (items: OrderItem[], hasVat: boolean, customer: CustomerInfo) => void;
  onCancel: () => void;
  inventory: InventoryProduct[];
}

const STORAGE_KEYS = {
  PRESETS: 'nb_data_presets'
};

const OrderForm: React.FC<OrderFormProps> = ({ onSave, onCancel, inventory }) => {
  const [items, setItems] = useState<Partial<OrderItem>[]>([
    { service: '', quantity: 1, unitPrice: 0, note: '' }
  ]);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '', phone: '', address: '', companyName: '', taxCode: '', companyAddress: '', buyerName: ''
  });
  const [hasVat, setHasVat] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [presets, setPresets] = useState<PresetService[]>([]);
  
  const [searchInv, setSearchInv] = useState('');
  const [showInvList, setShowInvList] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (saved) setPresets(JSON.parse(saved));
  }, []);

  const addItem = () => setItems([...items, { service: '', quantity: 1, unitPrice: 0, note: '' }]);
  const removeItem = (index: number) => items.length > 1 ? setItems(items.filter((_, i) => i !== index)) : setItems([{ service: '', quantity: 1, unitPrice: 0, note: '' }]);
  
  const updateItemManual = (index: number, field: keyof OrderItem, value: any) => {
    const handleUploadImage = async (index: number, file: File) => {
  try {
    const imageUrl = await uploadImage(file);
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], image: imageUrl };
      return newItems;
    });
  } catch (err) {
    alert('Upload ảnh thất bại');
  }
};

    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const addPresetItem = (preset: PresetService) => {
    // Nếu dòng cuối cùng trống, điền vào đó. Ngược lại thêm dòng mới.
    const lastItem = items[items.length - 1];
    if (!lastItem.service) {
      const newItems = [...items];
      newItems[items.length - 1] = { 
        service: preset.name, 
        quantity: 1, 
        unitPrice: preset.defaultPrice, 
        note: '',
        id: Math.random().toString()
      };
      setItems(newItems);
    } else {
      setItems([...items, { 
        service: preset.name, 
        quantity: 1, 
        unitPrice: preset.defaultPrice, 
        note: '',
        id: Math.random().toString() 
      }]);
    }
  };

  const addInventoryItem = (prod: InventoryProduct) => {
    if (prod.stock <= 0) return alert("Sản phẩm này đã hết hàng!");
    
    const newItem: Partial<OrderItem> = {
      service: `[${prod.type === ProductType.BOOK ? 'Sách' : 'VPP'}] ${prod.name}`,
      quantity: 1,
      unitPrice: prod.salePrice,
      note: 'Hàng bán lẻ',
      productId: prod.id,
      id: Math.random().toString()
    };

    const lastItem = items[items.length - 1];
    if (!lastItem.service) {
      setItems([...items.slice(0, -1), newItem]);
    } else {
      setItems([...items, newItem]);
    }
    setSearchInv('');
    setShowInvList(false);
  };

  const handleAIParsed = (newItems: OrderItem[]) => {
    setItems(prev => {
      const filtered = prev.filter(p => p.service !== '');
      return [...filtered, ...newItems];
    });
  };

  const filteredInventory = inventory.filter(p => 
    p.name.toLowerCase().includes(searchInv.toLowerCase())
  );

  const subTotal = items.reduce((sum, it) => sum + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
  const vat = hasVat ? Math.round(subTotal * 0.08) : 0;
  const total = subTotal + vat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(it => it.service?.trim());
    if (!validItems.length || !customer.name || !customer.phone) return alert("Vui lòng điền đủ Họ tên, SĐT và ít nhất 1 dịch vụ!");
    
    for (const item of validItems) {
      if (item.productId) {
        const prod = inventory.find(p => p.id === item.productId);
        if (prod && prod.stock < (item.quantity || 0)) {
          return alert(`Sản phẩm "${prod.name}" chỉ còn ${prod.stock} trong kho!`);
        }
      }
    }

    if (hasVat) {
      if (!customer.companyName || !customer.taxCode || !customer.companyAddress) {
        return alert("Khi xuất hóa đơn VAT, vui lòng nhập đầy đủ: Tên công ty, MST và Địa chỉ công ty!");
      }
    }

    onSave(validItems.map((it, idx) => ({ ...it, id: it.id || Math.random().toString(), stt: idx + 1 })) as OrderItem[], hasVat, customer);
  };

  return (
    <div className="bg-slate-900 p-4 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight">Thiết lập đơn hàng</h2>
          <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Chọn từ kho hoặc dùng trợ lý AI.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative group flex-1 sm:w-64">
             <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-xs transition-colors group-focus-within:text-indigo-500"></i>
             <input 
              className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-200 outline-none focus:border-indigo-600 transition-all text-sm" 
              placeholder="Tìm hàng trong kho..." 
              value={searchInv}
              onFocus={() => setShowInvList(true)}
              onChange={e => { setSearchInv(e.target.value); setShowInvList(true); }}
             />
             {showInvList && searchInv && (
               <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto no-scrollbar animate-in fade-in zoom-in duration-200">
                 {filteredInventory.length > 0 ? filteredInventory.map(prod => (
                   <button key={prod.id} type="button" onClick={() => addInventoryItem(prod)} className="w-full flex items-center gap-4 p-4 hover:bg-slate-800 border-b border-slate-800/50 last:border-none transition-colors group">
                     <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 border border-slate-800">
                        {prod.image ? <img src={prod.image} className="w-full h-full object-cover" /> : <i className="fas fa-tag text-slate-700"></i>}
                     </div>
                     <div className="text-left flex-1">
                        <p className="text-xs font-black text-slate-200 group-hover:text-indigo-400 transition-colors">{prod.name}</p>
                        <p className={`text-[9px] font-bold uppercase ${prod.stock <= 1 ? 'text-rose-500' : 'text-slate-500'}`}>Tồn: {prod.stock}</p>
                     </div>
                     <p className="font-black text-xs text-indigo-400">{prod.salePrice.toLocaleString()}đ</p>
                   </button>
                 )) : <p className="p-6 text-[10px] font-black text-slate-600 text-center uppercase">Không tìm thấy hàng</p>}
               </div>
             )}
          </div>
          <button type="button" onClick={() => setShowAIAssistant(true)} className="flex items-center justify-center gap-4 px-8 py-4 rounded-2xl transition-all active:scale-95 font-black text-xs uppercase bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-900/40">
            ✨ AI Lên Đơn
          </button>
        </div>
      </div>

      {showAIAssistant && <AIAssistant onParsed={handleAIParsed} onClose={() => setShowAIAssistant(false)} />}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Section */}
        <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative shadow-inner">
          <div className="absolute -top-3 left-8 bg-rose-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Khách hàng</div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Họ tên *</label><input required className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-slate-200" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Tên khách hàng" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Số điện thoại *</label><input required className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-slate-200" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="SĐT khách" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Địa chỉ</label><input className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-slate-200" value={customer.address || ''} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Địa chỉ giao hàng" /></div>
        </div>

        {/* Preset Services - Danh mục dịch vụ cho phép chọn nhanh */}
        {presets.length > 0 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-left-4">
             <div className="flex items-center gap-3 ml-4">
                <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Danh mục dịch vụ (Chọn nhanh)</h4>
             </div>
             <div className="flex flex-wrap gap-2.5">
                {presets.map(p => (
                  <button key={p.id} type="button" onClick={() => addPresetItem(p)} className="group bg-slate-950 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-400 px-6 py-3.5 rounded-2xl transition-all active:scale-95 flex flex-col items-start gap-1">
                    <span className="text-[11px] font-black text-slate-200 group-hover:text-white uppercase tracking-tighter">{p.name}</span>
                    <span className="text-[9px] font-bold text-indigo-400 group-hover:text-indigo-100 italic">{p.defaultPrice.toLocaleString()}đ</span>
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* VAT Section */}
        {hasVat && (
          <div className="bg-indigo-900/10 p-6 md:p-8 rounded-[2rem] border border-indigo-500/30 grid grid-cols-1 md:grid-cols-2 gap-6 relative animate-in slide-in-from-top-4 duration-300">
            <div className="absolute -top-3 left-8 bg-indigo-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Thông tin VAT</div>
            <div className="space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase ml-2">Tên công ty *</label><input required={hasVat} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-200" value={customer.companyName || ''} onChange={e => setCustomer({...customer, companyName: e.target.value})} placeholder="Công ty TNHH..." /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase ml-2">Mã số thuế *</label><input required={hasVat} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-200" value={customer.taxCode || ''} onChange={e => setCustomer({...customer, taxCode: e.target.value})} placeholder="MST" /></div>
            <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase ml-2">Địa chỉ công ty *</label><input required={hasVat} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-200" value={customer.companyAddress || ''} onChange={e => setCustomer({...customer, companyAddress: e.target.value})} placeholder="Địa chỉ đăng ký kinh doanh" /></div>
          </div>
        )}

        {/* Order Items Table */}
        <div className="overflow-x-auto no-scrollbar rounded-[2rem] border border-slate-800 bg-slate-950 shadow-inner">
          <table className="w-full min-w-[950px]">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="px-6 py-4 w-12 text-center">#</th>
                <th className="px-6 py-4 text-left">Sản phẩm / Dịch vụ</th>
                <th className="px-6 py-4 w-20 text-center">SL</th>
                <th className="px-6 py-4 w-36 text-right">Đơn giá</th>
                <th className="px-6 py-4 text-left">Ghi chú</th>
                <th className="px-6 py-4 w-36 text-right">Thành tiền</th>
                <th className="px-6 py-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-bold text-slate-300">
              {items.map((item, index) => (
                <tr key={index} className="group hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4 text-center text-slate-600 font-black">{index + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <input className="w-full bg-transparent border-none focus:ring-0 p-0 font-black text-slate-200 outline-none" value={item.service} onChange={e => updateItemManual(index, 'service', e.target.value)} required placeholder="Sản phẩm..." />
                      {/* Upload ảnh sản phẩm */}
<div className="mt-2 flex items-center gap-3">
  <label className="cursor-pointer text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300">
    📷 Tải ảnh
    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={async (e) => {
        if (!e.target.files || !e.target.files[0]) return;

        try {
          const file = e.target.files[0];
          const imageUrl = await uploadImage(file);

          updateItemManual(index, 'image', imageUrl);
        } catch (err) {
          alert('Upload ảnh thất bại');
        }
      }}
    />
  </label>

  {item.image && (
    <img
      src={item.image}
      alt="preview"
      className="w-10 h-10 rounded-lg object-cover border border-slate-700"
    />
  )}
</div>

                      {item.productId && <span className="text-[8px] font-black text-indigo-400 uppercase mt-1 tracking-widest">Hàng từ kho</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4"><input type="number" className="w-full bg-transparent border-none focus:ring-0 p-0 text-center font-black text-slate-200 outline-none" value={item.quantity || ''} onChange={e => updateItemManual(index, 'quantity', parseInt(e.target.value) || 0)} /></td>
                  <td className="px-6 py-4"><input type="number" className="w-full bg-transparent border-none focus:ring-0 p-0 text-right font-black text-slate-200 outline-none" value={item.unitPrice || ''} onChange={e => updateItemManual(index, 'unitPrice', parseInt(e.target.value) || 0)} /></td>
                  <td className="px-6 py-4"><input className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-slate-400 italic outline-none" value={item.note || ''} onChange={e => updateItemManual(index, 'note', e.target.value)} placeholder="Yêu cầu riêng" /></td>
                  <td className="px-6 py-4 text-right text-indigo-400 font-black tracking-tight">{((item.quantity||0)*(item.unitPrice||0)).toLocaleString()}đ</td>
                  <td className="px-6 py-4 text-center"><button type="button" onClick={() => removeItem(index)} className="text-slate-600 hover:text-rose-500 transition-all hover:scale-125"><i className="fas fa-trash-can text-xs"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4">
           <button type="button" onClick={addItem} className="px-6 py-3 bg-slate-800 text-slate-300 font-black text-[10px] uppercase rounded-xl border border-slate-700 shadow-lg active:scale-95 transition-all flex items-center gap-2">
             <i className="fas fa-plus-circle text-rose-500"></i> Thêm hàng tự do
           </button>
        </div>

        {/* Totals & Submit */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner">
            <div className="flex justify-between items-center mb-6">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tổng kết đơn</h4>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={hasVat} onChange={() => setHasVat(!hasVat)} />
                  <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full border border-slate-700"></div>
                  <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-slate-400">VAT (8%)</span>
               </label>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-400"><span>Tiền hàng:</span><span>{subTotal.toLocaleString()}đ</span></div>
              {hasVat && <div className="flex justify-between text-xs font-bold text-indigo-400"><span>VAT (8%):</span><span>{vat.toLocaleString()}đ</span></div>}
              <div className="flex justify-between font-black text-2xl text-rose-500 pt-4 border-t border-slate-800 mt-2"><span>Tổng:</span><span>{total.toLocaleString()}đ</span></div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end justify-center sm:justify-end gap-4">
            <button type="button" onClick={onCancel} className="w-full sm:w-auto px-10 py-5 bg-slate-900 border border-slate-800 font-black text-xs uppercase rounded-3xl text-slate-500 hover:text-slate-300">Hủy</button>
            <button type="submit" className="w-full sm:w-auto px-14 py-5 bg-indigo-600 text-white font-black text-xs uppercase rounded-3xl shadow-2xl shadow-indigo-900/40 hover:bg-indigo-500 transition-all active:scale-95">Lưu đơn & Xuất hóa đơn</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
