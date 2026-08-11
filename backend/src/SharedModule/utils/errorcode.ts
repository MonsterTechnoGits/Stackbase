const Err = {
  // Auth errors
  InvalidCredentials: 1100,
  InvalidLoginEmail: 1110,
  InvalidLoginPassword: 1120,
  InactiveUser: 1130,
  TokenValidationFailed: 1200,
  LimitedAccess: 1300,
  MissingAuthToken: 1400,
  SessionExpired: 1410,
  SapAuthFailed: 1500,
  SapUnreachable: 1510,

  // Conflict errors
  EmailAlreadyExists: 2110,

  // Bad request errors
  ValidationFailed: 3400,
  EmptyRequestBody: 3500,
  RouteNotFound: 3700,
  DuplicateRequest: 3800,

  // Not found
  UserNotFound: 2000,
  ItemNotFound: 2001,
  PurchaseOrderNotFound: 2002,
  ProductNotFound: 2010,
  MaterialStockNotFound: 2020,
  PhysicalInventoryNotFound: 2030,
  ProductionOrderNotFound: 2031,
  CostCenterNotFound: 2040,

  // Business rule errors
  GoodsIssueRejected: 4220,
  GoodsReceiptRejected: 4221,

  // Server errors
  InternalServerError: 5000,
  ServiceNotImplemented: 5010,
  DatabaseError: 5200,

  // Undefined
  UndefinedCode: 9999,
} as const;

export type ErrCode = (typeof Err)[keyof typeof Err];
export default Err;
