/** Shared test constants — imported by both global-setup.ts and spec files. */

export const TEST_USER_EMAIL = "e2e@example.com";
export const TEST_USER_LOGIN_PW = "TestLogin123!";
export const TEST_VAULT_SALT = "AAAAAAAAAAAAAAAAAAAAAA==";
export const TEST_VAULT_NAME = "E2E Vault";

export const TEST_TOTP_EMAIL = "e2e-totp@example.com";
export const TEST_TOTP_LOGIN_PW = "TestTotp123!";
export const TEST_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"; // 32 chars = 20 bytes (≥16-byte minimum)
export const TEST_BACKUP_CODE_1 = "23456-789AB";
export const TEST_BACKUP_CODE_2 = "BCDEF-GHJKM";
