// types.ts

// User Management
// FIX: Added HR menu item IDs to integrate new pages.
export type MenuItemId = 'dashboard' | 'customers' | 'users' | 'contracts' | 'tickets' | 'reports' | 'referrals' | 'attendance' | 'leave' | 'missions';
// FIX: Standardized 'مسئول پشتیبان' to 'مسئول پشتیبانی' for consistency with specialist roles.
export type UserRole = 'مدیر' | 'مسئول فروش' | 'مسئول پشتیبانی' | 'مسئول برنامه نویس' | 'کارشناس فروش' | 'کارشناس پشتیبانی' | 'کارشناس برنامه نویس';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  password?: string; // Password is optional when reading user data
  otpHash?: string | null;
  otpExpiresAt?: string | null;
  accessibleMenus: MenuItemId[];
  role: UserRole;
}

// Customer Management
export type Gender = 'مرد' | 'زن';
export type MaritalStatus = 'مجرد' | 'متاهل';
export type PaymentMethod = 'نقد' | 'چک' | 'کارت' | 'حواله' | 'کارت به کارت' | 'حواله بانکی';
export type SoftwareType = 'رستورانی' | 'فروشگاهی' | 'شرکتی' | 'عمومی';
export type CustomerLevel = 'A' | 'B' | 'C' | 'D';
export type CustomerStatus = 'فعال' | 'غیرفعال';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate: string;
  gender: Gender;
  maritalStatus: MaritalStatus;
  mobileNumbers: string[];
  emails: string[];
  phone: string[];
  address: string;
  jobTitle: string;
  companyName: string;
  activityType: string;
  taxCode: string;
  bankAccountNumber: string;
  iban: string;
  paymentMethods: PaymentMethod[];
  remainingCredit: number;
  softwareType: SoftwareType;
  purchaseDate: string;
  supportStartDate: string;
  supportEndDate: string;
  level: CustomerLevel;
  status: CustomerStatus;
}


// Contract Management
export type ContractType = "خرید دائم" | "اشتراک دوره ای" | "اجاره ی نرم افزار" | "سفارشی سازی";
export type ContractStatus = 'فعال' | 'در انتظار تایید' | 'منقضی شده' | 'لغو شده';
export type NetworkSupport = "بله" | "خیر";
export type PaymentStatus = "پرداخت شده" | "بدهی باقی مانده" | "در حال پیگیری";
export type SupportContractDuration = 'شش ماهه' | 'یکساله' | 'موردی';
export type SupportContractType = 'تلفنی' | 'ریموت' | 'حضوری';
export type SupportContractLevel = 'طلایی' | 'نقره ای' | 'برنزه';
export type SupportContractStatus = ContractStatus;

export interface PurchaseContract {
    id: number;
    contractId: string;
    contractStartDate: string;
    contractEndDate: string;
    contractDate: string;
    contractType: ContractType;
    contractStatus: ContractStatus;
    softwareVersion: string;
    customerId: number | null;
    economicCode: string;
    customerAddress: string;
    customerContact: string;
    customerRepresentative: string;
    vendorName: string;
    salespersonUsername: string | null;
    softwareName: string;
    licenseCount: number;
    softwareDescription: string;
    platform: string;
    networkSupport: NetworkSupport;
    webMobileSupport: string;
    initialTraining: string;
    setupAndInstallation: string;
    technicalSupport: string;
    updates: string;
    customizations: string;
    totalAmount: number;
    prepayment: number;
    paymentStages: string;
    paymentMethods: PaymentMethod[];
    paymentStatus: PaymentStatus;
    invoiceNumber: string;
    attachments: string[];
    deliverySchedule: string;
    moduleList: string;
    terminationConditions: string;
    warrantyConditions: string;
    ownershipRights: string;
    confidentialityClause: string;
    nonCompeteClause: string;
    disputeResolution: string;
    lastStatusChangeDate: string;
    crmResponsibleUsername: string | null;
    notes: string;
    futureTasks: string;
}

export interface SupportContract {
    id: number;
    customerId: number | null;
    startDate: string;
    endDate: string;
    duration: SupportContractDuration;
    supportType: SupportContractType[];
    level: SupportContractLevel;
    status: SupportContractStatus;
    organizationName: string;
    contactPerson: string;
    contactNumber: string;
    contactEmail: string;
    economicCode: string;
    fullAddress: string;
    softwareName: string;
    softwareVersion: string;
    initialInstallDate: string;
    installType: string;
    userCount: string;
    softwareType: SoftwareType;
}

// Ticket & Referral Management
export type TicketStatus = 'انجام نشده' | 'در حال پیگیری' | 'اتمام یافته' | 'ارجاع شده';
export type TicketPriority = 'کم' | 'متوسط' | 'اضطراری';
export type TicketType = 'نصب' | 'اپدیت' | 'اموزش' | 'طراحی و چاپ' | 'تبدیل اطلاعات' | 'رفع اشکال' | 'راه اندازی' | 'مشکل برنامه نویسی' | 'سایر' | 'فراصدر' | 'گزارشات' | 'تنظیمات نرم افزاری' | 'مجوزدهی' | 'صندوق' | 'پوز' | 'ترازو' | 'انبار' | 'چک' | 'تعریف' | 'سیستم' | 'مودیان' | 'بیمه' | 'حقوق دستمزد' | 'بکاپ' | 'اوند' | 'کیوسک' | 'افتتاحیه' | 'اختتامیه' | 'تغییر مسیر' | 'پرینتر' | 'کارتخوان' | 'sql' | 'پنل پیامکی' | 'کلاینت' | 'صورتحساب' | 'مغایرت گیری' | 'ویندوزی' | 'چاپ' | 'پایان سال' | 'دمو' | 'خطا' | 'درخواست' | 'مشکل';
export type TicketChannel = 'تلفن' | 'ایمیل' | 'پورتال' | 'حضوری';

export interface Ticket {
    id: number;
    ticketNumber: string;
    title: string;
    description: string;
    customerId: number;
    creationDateTime: string;
    lastUpdateDate: string;
    status: TicketStatus;
    priority: TicketPriority;
    type: TicketType;
    channel: TicketChannel;
    assignedToUsername: string;
    attachments: string[];
    editableUntil: string;
    workSessionStartedAt?: string;
    totalWorkDuration: number;
}

export interface Referral {
    id: number;
    ticketId: number;
    referredByUsername: string;
    referredToUsername: string;
    referralDate: string;
    ticket: Ticket; // Hydrated in App.tsx
}

// FIX: Added missing HR Management types to resolve multiple import errors.
// HR Management
export type AttendanceType = 'ورود' | 'خروج';

export interface AttendanceRecord {
    id: number;
    userId: number;
    timestamp: string; // ISO string
    type: AttendanceType;
}

export type LeaveType = 'روزانه' | 'ساعتی';
export type LeaveRequestStatus = 'در انتظار تایید' | 'تایید شده' | 'رد شده';

export interface LeaveRequest {
    id: number;
    userId: number;
    leaveType: LeaveType;
    startDate: string; // Jalaali date string 'YYYY/MM/DD'
    endDate: string;   // Jalaali date string 'YYYY/MM/DD'
    startTime?: string; // 'HH:MM'
    endTime?: string;   // 'HH:MM'
    reason: string;
    status: LeaveRequestStatus;
    requestedAt: string; // ISO string
}

export interface MissionTask {
    id: number;
    description: string;
    completed: boolean;
}

export interface Mission {
    id: number;
    title: string;
    description: string;
    assignedTo: number; // userId
    createdBy: number;  // userId
    tasks: MissionTask[];
    startTimestamp: string; // ISO string
    endTimestamp: string;   // ISO string
    completed: boolean;
}
