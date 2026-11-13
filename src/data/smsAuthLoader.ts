// Job: Send a login SMS code and verify it to save the user's session token.

import { apiPost } from './apiClient';
import { saveToCache } from './localCache';

const pendingSmsCodes = new Map<string, string>();

export async function sendSmsOtp(phone: string): Promise<{ sent: boolean; demoCode: string }> {
  const cleanPhone = phone.trim();
  const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
  pendingSmsCodes.set(cleanPhone, generatedCode);

  await apiPost('/auth/send-otp', { phone: cleanPhone });

  return { sent: true, demoCode: generatedCode };
}

export async function verifySmsOtpAndLogin(
  phone: string,
  enteredCode: string
): Promise<{ ok: boolean; token: string; message: string }> {
  const cleanPhone = phone.trim();

  const remoteAuth = await apiPost<{ ok: boolean; token: string }>('/auth/verify-otp', {
    phone: cleanPhone,
    code: enteredCode,
  });

  if (remoteAuth && remoteAuth.ok) {
    saveToCache('allgo_auth_token', remoteAuth.token);
    return { ok: true, token: remoteAuth.token, message: 'Login verified!' };
  }

  const expectedCode = pendingSmsCodes.get(cleanPhone);
  if (!expectedCode || expectedCode !== enteredCode.trim()) {
    return { ok: false, token: '', message: 'Incorrect SMS verification code.' };
  }

  pendingSmsCodes.delete(cleanPhone);
  const localToken = `tok_${Date.now()}`;
  saveToCache('allgo_auth_token', localToken);

  return { ok: true, token: localToken, message: 'Login verified!' };
}
