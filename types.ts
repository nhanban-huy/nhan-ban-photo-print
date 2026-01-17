
export enum PaymentStatus {
  PENDING = 'CHỜ THANH TOÁN',
  PAID = 'ĐÃ THANH TOÁN',
  CANCELLED = 'HỦY ĐƠN'
}

export enum WorkStatus {
  NOT_STARTED = 'CHƯA HOÀN THÀNH',
  COMPLETED = 'ĐÃ HOÀN THÀNH',
  CANCELLED = 'HỦY'
}

export enum PaymentMethod {
  CASH = 'TIỀN MẶT',
  TRANSFER = 'CHUYỂN KHOẢN'
}

export enum ProductType {
  BOOK = 'SÁCH',
  STATIONERY = 'VĂN PHÒNG PHẨM'
}

export interface InventoryProduct {
  id: string;
  type: ProductType;
  name: string;
  image?: string;
  stock: number;
  importPrice: number;
  salePrice: number;
}

export interface PresetService {
  id: string;
  name: string;
  defaultPrice: number;
  category: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address?: string;
  buyerName?: string; 
  companyName?: string; 
  taxCode?: string; 
  companyAddress?: string; 
  socialLink?: string; 
}

export interface OrderItem {
  id: string;
  stt: number;
  service: string;
  quantity: number;
  unitPrice: number;
  note: string;
  productId?: string; // Để trừ kho khi bán
  image?: string; // Ảnh sản phẩm (URL Cloudinary)
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  itemName?: string; // Specific item purchased
  amount: number;
  note: string;
  employeeId: string;
  // Enhanced procurement fields
  supplierName?: string;
  quantity?: number;
  paymentMethod?: PaymentMethod;
}

export interface Order {
  id: string;
  createdAt: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subTotal: number;
  vat: number;
  total: number;
  hasVat: boolean;
  paymentStatus: PaymentStatus;
  workStatus: WorkStatus;
  paymentMethod: PaymentMethod;
  employeeId: string;
}

export interface DailyStats {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
  count: number;
}
