export interface DeviceInfo {
  deviceType: 'mobile' | 'desktop' | 'tablet';
  deviceOS: 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Unknown';
  deviceBrowser: 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Samsung' | 'Unknown';
  userAgent: string;
}

export const detectDevice = (): DeviceInfo => {
  const ua = navigator.userAgent;
  
  // Detectar tipo de dispositivo
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
  
  // Detectar sistema operacional
  let deviceOS: DeviceInfo['deviceOS'] = 'Unknown';
  if (/iPhone|iPad|iPod/i.test(ua)) deviceOS = 'iOS';
  else if (/Android/i.test(ua)) deviceOS = 'Android';
  else if (/Windows/i.test(ua)) deviceOS = 'Windows';
  else if (/Macintosh/i.test(ua)) deviceOS = 'macOS';
  else if (/Linux/i.test(ua)) deviceOS = 'Linux';
  
  // Detectar navegador
  let deviceBrowser: DeviceInfo['deviceBrowser'] = 'Unknown';
  if (/SamsungBrowser/i.test(ua)) deviceBrowser = 'Samsung';
  else if (/Edg/i.test(ua)) deviceBrowser = 'Edge';
  else if (/Firefox/i.test(ua)) deviceBrowser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) deviceBrowser = 'Safari';
  else if (/Chrome/i.test(ua)) deviceBrowser = 'Chrome';
  
  return { deviceType, deviceOS, deviceBrowser, userAgent: ua };
};
