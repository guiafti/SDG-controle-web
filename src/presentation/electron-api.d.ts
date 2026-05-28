export interface ElectronAPI {
  getProductByBarcode: (barcode: string, storeId: string) => Promise<any>;
  getAllProducts: (includeArchived?: boolean) => Promise<any[]>;
  saveManualProduct: (product: any) => Promise<boolean>;
  saveSale: (sale: any) => Promise<any>;
  importXmlProducts: (xmlData: string, storeId: string) => Promise<any>;
  getSyncStatus: () => Promise<{ pending: number, total: number }>;
  getRepairs: () => Promise<any[]>;
  saveRepair: (repair: any) => Promise<any>;
  updateRepairStatus: (data: {id: string, status: string, current_store_id: string}) => Promise<any>;
  updateRepairNotes: (data: {id: string, technical_notes: string}) => Promise<any>;
  updateRepairPayment: (data: {id: string, payment_status: string}) => Promise<any>;
  uploadRepairImage: (data: {id: string, base64Data: string}) => Promise<any>;
  downloadProtocolTemplate: () => Promise<string>;
  getStores: (includeArchived?: boolean) => Promise<any[]>;
  saveStore: (store: {id?: string, name: string}) => Promise<{success: boolean, error?: string}>;
  archiveStore: (data: {id: string, archived: boolean}) => Promise<{success: boolean, error?: string}>;
  getUsers: () => Promise<any[]>;
  login: (credentials: any) => Promise<any>;
  saveUser: (user: any) => Promise<any>;
  getCommissions: () => Promise<any[]>;
  getExpenses: () => Promise<any[]>;
  saveExpense: (expense: any) => Promise<any>;
  deleteExpense: (id: string) => Promise<any>;
  getExpenseCategories: () => Promise<any[]>;
  saveExpenseCategory: (category: any) => Promise<any>;
  getBudgets: () => Promise<any[]>;
  saveBudget: (budget: any) => Promise<any>;
  getFinancialSummary: () => Promise<{totalInflow: number, totalOutflow: number, netProfit: number, estimatedCost: number, trends: any[]}>;
  getDashboardStats: () => Promise<{ totalRevenue: number, monthlyRevenue: number }>;
  getLowStockItems: () => Promise<any[]>;
  getStaleStockItems: () => Promise<any[]>;
  getSettings: () => Promise<{key: string, value: string}[]>;
  saveSettings: (settings: {key: string, value: string}[]) => Promise<any>;
  archiveProduct: (data: {id: string, archived: boolean}) => Promise<any>;
  updateInventoryQuantity: (data: {productId: string, store_id: string, quantity: number}) => Promise<any>;
  getPrinters: () => Promise<any[]>;
  getCurrentRegister: (data: { storeId: string }) => Promise<any>;
  openRegister: (data: { storeId: string, userName: string, openingBalance: number }) => Promise<{ success: boolean, id: string }>;
  getRegisterData: (data: { storeId: string, openedAt: string }) => Promise<any>;
  closeRegister: (data: { id: string, closingBalance: number, reportedBalance: number, totals: any, notes: string }) => Promise<{ success: boolean }>;
  getRegisterHistory: () => Promise<any[]>;
  testPrinter: (data: {deviceName: string}) => Promise<{success: boolean, error?: string}>;
  printUSB: (vid: number, pid: number, content: string) => Promise<{success: boolean, error?: string}>;
  printReceipt: (data: {sale: any, storeName: string, logo?: string, deviceName?: string}) => Promise<any>;
  printRepairReceipt: (data: {repair: any, storeName: string, logo?: string, deviceName?: string}) => Promise<any>;
  printRaw: (data: any, interfaceName?: string) => Promise<any>;
  printSilent: (html: string, deviceName?: string) => Promise<any>;
  uploadProductImage: (data: {barcode: string, base64Data: string}) => Promise<any>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  setZoom: (factor: number) => void;
  checkForUpdates: () => Promise<any>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}