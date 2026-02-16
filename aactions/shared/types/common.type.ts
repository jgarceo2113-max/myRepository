import { Models } from "node-appwrite";

export type User = Models.User<Models.Preferences> | null;
export type Document = Models.Document;
export type DefaultDocument = Models.DocumentList<Models.DefaultDocument>;
export type UsersList = Models.UserList<Models.Preferences>;

export interface EnvVars {
  baseUrl: string;
  cookie: string;
  databaseId: string;
  templates: string;
  certificates: string;
  logsDb: string;
  logs: string;
  certificatesBucket: string;
  templateBucket: string;
  coverBucket: string;
  avatarBucket: string;
  systemInfoFunc: string;
}

export interface SMTPEnvVars {
  hostname: string;
  port: string;
  username: string;
  password: string;
  encryption: string;
  sender: string;
}

export interface TemplateMeta {
  date_created: string;
  date_modified: string;
  isPortrait: boolean;
  size: {
    w: number;
    h: number;
    paper: string;
  };
}

export interface Template {
  id: string;
  name: string;
  preview: string;
  json: string;
  meta: TemplateMeta;
}

/** Certificate Types */
export type Ordering = "asc" | "desc";
export type Status = "-1" | "0" | "1" | "any";

export interface Certificate extends Document {
  issuer: string;
  recipientFullName: string;
  fileId: string;
  status: Status;
  recipientEmail: string;
  isDeleted: boolean;
}

/** System Logs */
export interface SystemLog extends Document {
  userId: string;
  userFullName: string;
  actionRaw: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: string; // Stringinfied JSON
  ipAddress: string;
  browser: string;
  os: string;
  device: string;
  timestamp: Date;
}

export type SystemLogs = Models.DocumentList<SystemLog>;

export interface CpuState {
  coreCount: string;
  cpuSpeedMhz: number;
  usagePercent: number;
  status: string;
}

export interface MemoryState {
  totalMem: number;
  freeMem: number;
  usedMem: number;
  memoryUsagePercent: number;
  status: string;
}

export interface SystemInfoState {
  hostname: string;
  platform: string;
  architecture: string;
  release: string;
  type: string;
  userInfo: {
    uuid: number | string;
    gid: number | string;
    username: string;
    homedir: string;
    shell: string;
  };
  cpuSpeedMhz: string;
  cpuModel: string;
  cpuCores: string;
}

export interface SystemState {
  cpu: CpuState;
  memory: MemoryState;
  system: SystemInfoState;
}

export interface Users {
  $id: string;
  name: string;
  email: string;
  avatarId: any;
  role: string;
  isEmailVerified: boolean;
  isBlocked: boolean;
  $createdAt: string;
  $updatedAt: string;
}
