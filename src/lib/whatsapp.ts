export type WhatsAppTemplateKey = 'booking_confirmation' | 'reminder' | 'thank_you' | 'revisit' | 'offer';
export const defaultTemplates: Record<WhatsAppTemplateKey, string> = {
  booking_confirmation: 'Hi [Customer Name], your appointment at [Salon Name] is confirmed for [Date] at [Time] for [Service]. Thank you!',
  reminder: 'Hi [Customer Name], just a reminder that you have an appointment at [Salon Name] today at [Time] for [Service].',
  thank_you: 'Thank you for visiting [Salon Name], [Customer Name]! We hope you enjoyed your service.',
  revisit: "Hi [Customer Name], it's been a while since your last visit to [Salon Name]. We'd love to see you again!",
  offer: 'Hi [Customer Name], [Salon Name] has a special offer for you: [Offer].'
};
export const renderTemplate = (template: string, data: Record<string, string>) => Object.entries(data).reduce((text, [key, value]) => text.replaceAll(`[${key}]`, value), template);
export const clickToChatUrl = (phone: string, message: string) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
// Future WhatsApp Business API integration should replace only this adapter boundary, not UI calls.
