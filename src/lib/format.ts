export const APP_TZ = 'Asia/Kolkata';
export const inr = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const dateIn = (value: string | Date) => new Intl.DateTimeFormat('en-GB', { timeZone: APP_TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
export const timeIn = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: APP_TZ }).format(new Date(Date.UTC(2024, 0, 1, hours, minutes)));
};
