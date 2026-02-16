import { EnvVars, SMTPEnvVars } from "../types/common.type";

export function getEnv(): EnvVars {
  const requiredVars: Record<keyof EnvVars, string> = {
    baseUrl: "NEXT_PUBLIC_APP_BASE_URL",
    cookie: "APPWRITE_COOKIE_NAME",
    databaseId: "APPWRITE_DATABASE_ID",
    templates: "APPWRITE_TEMPLATE",
    certificates: "APPWRITE_CERTIFICATES",
    logsDb: "APPWRITE_LOGSDB_ID",
    logs: "APPWRITE_LOGS",
    certificatesBucket: "APPWRITE_STORAGE_CERTIFICATES",
    templateBucket: "APPWRITE_STORAGE_JSON",
    coverBucket: "APPWRITE_STORAGE_COVER",
    avatarBucket: "APPWRITE_STORAGE_AVATAR",
    systemInfoFunc: "APPWRITE_FUNC_SYSINFO",
  };

  const result = {} as EnvVars;

  for (const [key, envVar] of Object.entries(requiredVars)) {
    const value = process.env[envVar];
    if (!value) throw new Error(`${envVar} is not defined`);
    result[key as keyof EnvVars] = value;
  }

  return result;
}

export function getSMTPEnv(): SMTPEnvVars {
  const requiredVars: Record<keyof SMTPEnvVars, string> = {
    hostname: "SMTP_HOST",
    port: "SMTP_PORT",
    username: "SMTP_USERNAME",
    password: "SMTP_PASSWORD",
    encryption: "SMTP_ENCRYPTION",
    sender: "SMTP_SENDER_EMAIL",
  };

  const result = {} as SMTPEnvVars;

  for (const [key, envVar] of Object.entries(requiredVars)) {
    const value = process.env[envVar];
    if (!value) throw new Error(`${envVar} is not defined`);
    result[key as keyof SMTPEnvVars] = value;
  }

  return result;
}
