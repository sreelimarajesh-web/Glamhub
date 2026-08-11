const root = document.getElementById('root');
const today = '2026-08-11';
const salons = [
  { id: 'salon-1', name: 'SalonMate Demo Studio', owner: 'Anjali Nair', location: 'GB Road, Palakkad', whatsapp: '919876543210', slug: 'salonmate-palakkad', active: true, offer: '15% off facial and cleanup' },
  { id: 'salon-2', name: 'Lotus Glow Studio', owner: 'Demo Owner', location: 'Koduvayur', whatsapp: '919876543201', slug: 'lotus-glow-koduvayur', active: true, offer: 'Bridal consultation free' },
  { id: 'salon-3', name: 'Kollengode Style House', owner: 'Demo Owner', location: 'Kollengode', whatsapp: '919876543202', slug: 'kollengode-style-house', active: true, offer: '₹100 off haircut combos' },
  { id: 'salon-4', name: 'Kinassery Hair Lounge', owner: 'Demo Owner', location: 'Kinassery', whatsapp: '919876543203', slug: 'kinassery-hair-lounge', active: true, offer: 'Weekend pedicure offer' },
];
let selectedSalonId = salons[0].id;
const selectedSalon = () => salons.find((salon) => salon.id === selectedSalonId) || salons[0];

const services = ['Haircut|Hair|350|30', 'Hair wash|Hair|250|20', 'Hair coloring|Hair|1800|120', 'Facial|Facial|1200|60', 'Cleanup|Skin|650|40', 'Threading|Threading|120|15', 'Waxing|Waxing|700|45', 'Manicure|Nails|600|45', 'Pedicure|Nails|750|50', 'Bridal makeup|Makeup|12000|240'].map((row, index) => {
  const [name, category, price, duration] = row.split('|');
  return { id: `svc-${index + 1}`, name, category, price: Number(price), duration: Number(duration), active: true };
});
const staff = [
  { id: 'st-1', name: 'Meera', role: 'Hair stylist', start: '09:00', end: '18:00', active: true },
  { id: 'st-2', name: 'Fathima', role: 'Beautician', start: '10:00', end: '19:00', active: true },
  { id: 'st-3', name: 'Latha', role: 'Makeup artist', start: '08:00', end: '17:00', active: true },
];
const customers = Array.from({ length: 12 }, (_, index) => ({
  id: `cus-${index + 1}`,
  name: ['Priya', 'Devika', 'Asha', 'Nisha', 'Anu', 'Riya', 'Sneha', 'Lakshmi', 'Femi', 'Archa', 'Maya', 'Jisha'][index],
  mobile: `98765${40000 + index}`,
  whatsapp: `9198765${40000 + index}`,
  visits: (index % 5) + 1,
  spend: (index + 1) * 650,
  membership: index % 3 ? '' : 'Gold Membership',
}));
let appointments = [
  { id: 'ap-1', customerId: 'cus-1', serviceId: 'svc-1', staffId: 'st-1', date: today, time: '10:00', status: 'Confirmed' },
  { id: 'ap-2', customerId: 'cus-2', serviceId: 'svc-4', staffId: 'st-2', date: today, time: '11:30', status: 'Pending' },
  { id: 'ap-3', customerId: 'cus-3', serviceId: 'svc-6', staffId: 'st-2', date: today, time: '15:00', status: 'Completed', sale: 120 },
];

let role = 'customer';
let route = location.pathname.startsWith('/salon/') ? 'public' : 'home';
const roleRoutes = {
  customer: ['home', 'salons', 'public'],
  owner: ['dashboard', 'appointments', 'customers', 'services', 'staff', 'offers', 'sales', 'membership', 'settings', 'public'],
  staff: ['staff-schedule', 'appointments', 'customers'],
  super_admin: ['admin', 'salons', 'home'],
};
const labels = { home: 'Home', salons: 'Salons', public: 'Book', dashboard: 'Dashboard', appointments: 'Bookings', customers: 'Customers', services: 'Services', staff: 'Staff', offers: 'Offers', sales: 'Sales', membership: 'Membership', settings: 'Settings', admin: 'Admin', 'staff-schedule': 'My Schedule' };
const inr = (number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(number);
const time = (value) => new Date(`2024-01-01T${value}:00+05:30`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
const whatsappUrl = (phone, message) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
const card = (content, className = '') => `<section class="card ${className}">${content}</section>`;

function setRoute(nextRoute) {
  route = nextRoute;
  render();
}
function setRole(nextRole) {
  role = nextRole;
  route = roleRoutes[role][0];
  render();
}
function chooseSalon(salonId) {
  selectedSalonId = salonId;
  route = 'public';
  render();
}
window.setRoute = setRoute;
window.setRole = setRole;
window.chooseSalon = chooseSalon;

function nav() {
  return `<header class="top"><b class="brand">✂ SalonMate</b><nav>${roleRoutes[role].map((item) => `<button class="${item === route ? 'active' : ''}" onclick="setRoute('${item}')">${labels[item]}</button>`).join('')}</nav><label class="role-picker">View as <select onchange="setRole(this.value)"><option value="customer" ${role === 'customer' ? 'selected' : ''}>Customer</option><option value="owner" ${role === 'owner' ? 'selected' : ''}>Salon Owner</option><option value="staff" ${role === 'staff' ? 'selected' : ''}>Staff</option><option value="super_admin" ${role === 'super_admin' ? 'selected' : ''}>Super Admin</option></select></label></header>`;
}

function marketing() {
  return `<div class="hero"><div><p class="pill">Built for Palakkad, Koduvayur, Kollengode & Kinassery salons</p><h1>Run Your Salon. Grow Your Customers.</h1><p>Simple salon booking, customer management and WhatsApp marketing for salons in Kerala.</p><button onclick="setRole('owner')">Start Free</button> <button class="ghost" onclick="setRoute('salons')">Find a Salon</button></div>${card('<h2>How it works</h2><ol><li>Customer chooses a nearby salon</li><li>Selects service, date and available slot</li><li>Salon confirms and sends WhatsApp reminder</li><li>Visit completes and customer history updates</li></ol>')} ${pricing()} ${card('<h2>FAQ</h2><p>Customers book from a normal mobile browser. No customer app is required in V1.</p>')}</div>`;
}

function salonListing() {
  return `<h1>Book a salon near Palakkad</h1><p class="section-text">Customers can browse active salons and book directly from the public salon page or WhatsApp.</p><div class="grid three">${salons.filter((salon) => salon.active).map((salon) => card(`<p class="pill">${salon.location}</p><h3>${salon.name}</h3><p>${salon.offer}</p><button onclick="chooseSalon('${salon.id}')">Book Appointment</button> <a class="ghost" href="${whatsappUrl(salon.whatsapp, `Hi ${salon.name}, I want to book an appointment.`)}" target="_blank">WhatsApp</a>`)).join('')}</div>`;
}

function dashboard() {
  const done = appointments.filter((appointment) => appointment.status === 'Completed');
  const sales = done.reduce((sum, appointment) => sum + (appointment.sale || services.find((service) => service.id === appointment.serviceId).price), 0);
  return `<h1>Good morning, ${selectedSalon().owner}</h1><p>11/08/2026 • ${selectedSalon().location}</p><div class="grid stats">${[['Today’s appointments', appointments.length], ['Completed', done.length], ['Today’s sales', inr(sales)], ['New customers', 4], ['Available staff', staff.filter((person) => person.active).length]].map((stat) => card(`<span>${stat[0]}</span><b>${stat[1]}</b>`)).join('')}</div>${appointmentsPage()}`;
}

function bookingForm() {
  return `<h3>+ New Booking</h3><select id="c">${customers.map((customer) => `<option value="${customer.id}">${customer.name}</option>`)}</select><select id="s">${services.map((service) => `<option value="${service.id}">${service.name} - ${inr(service.price)} • ${service.duration} min</option>`)}</select><select id="st"><option value="st-1">Any available staff</option>${staff.map((person) => `<option value="${person.id}">${person.name}</option>`)}</select><input id="d" type="date" value="${today}"><select id="tm">${['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '15:00', '15:30', '16:00'].map((slot) => `<option>${slot}</option>`)}</select><button onclick="addBooking()">Confirm Booking</button><p id="err" class="error"></p>`;
}

function appointmentsPage() {
  const canCreate = role !== 'staff';
  const rows = role === 'staff' ? appointments.filter((appointment) => appointment.staffId === 'st-1') : appointments;
  return `<h2>${role === 'staff' ? 'My Assigned Appointments' : 'Today’s Appointments'}</h2><div class="grid two">${canCreate ? card(bookingForm()) : card('<h3>Staff permissions</h3><p>Staff can view assigned appointments and update status, but cannot change billing or salon settings.</p>')}${card(rows.map(appointmentRow).join('') || '<p>No appointments yet.</p>')}</div>`;
}

window.addBooking = () => {
  const customerId = document.getElementById('c').value;
  const serviceId = document.getElementById('s').value;
  const staffId = document.getElementById('st').value;
  const date = document.getElementById('d').value;
  const appointmentTime = document.getElementById('tm').value;
  const hasConflict = appointments.some((appointment) => appointment.staffId === staffId && appointment.date === date && appointment.time === appointmentTime && !['Cancelled', 'No-show'].includes(appointment.status));
  if (hasConflict) {
    document.getElementById('err').textContent = 'Double booking prevented for this staff member.';
    return;
  }
  appointments.push({ id: crypto.randomUUID(), customerId, serviceId, staffId, date, time: appointmentTime, status: 'Pending' });
  render();
};
window.status = (id, value) => {
  appointments = appointments.map((appointment) => appointment.id === id ? { ...appointment, status: value, sale: value === 'Completed' ? services.find((service) => service.id === appointment.serviceId).price : appointment.sale } : appointment);
  render();
};
function appointmentRow(appointment) {
  const customer = customers.find((item) => item.id === appointment.customerId);
  const service = services.find((item) => item.id === appointment.serviceId);
  const person = staff.find((item) => item.id === appointment.staffId);
  const salon = selectedSalon();
  const message = `Hi ${customer.name}, your appointment at ${salon.name} is confirmed for 11/08/2026 at ${time(appointment.time)} for ${service.name}. Thank you!`;
  return `<div class="row"><b>${customer.name}</b><span>${service.name} • ${person.name} • ${time(appointment.time)}</span><select onchange="status('${appointment.id}',this.value)">${['Pending', 'Confirmed', 'Arrived', 'Completed', 'Cancelled', 'No-show'].map((status) => `<option ${status === appointment.status ? 'selected' : ''}>${status}</option>`)}</select><a target="_blank" href="${whatsappUrl(customer.whatsapp, message)}">WhatsApp</a></div>`;
}

function customersPage() {
  return `<h2>${role === 'staff' ? 'Basic Customer Info' : 'Customers'}</h2><div class="grid three">${customers.map((customer) => card(`<h3>${customer.name}</h3><p>${customer.mobile}</p><p>${customer.visits} visits • ${inr(customer.spend)}</p><p>${customer.membership || 'No membership'}</p><a href="${whatsappUrl(customer.whatsapp, `Hi ${customer.name}, this is ${selectedSalon().name}. How can we help you today?`)}">WhatsApp Customer</a>${role === 'owner' ? '<button onclick="setRoute(\'appointments\')">Book Appointment</button>' : ''}`)).join('')}</div>`;
}
function staffSchedule() {
  return `<h1>My Schedule</h1><p>Logged in staff see only assigned work and basic customer details.</p>${appointmentsPage()}`;
}
function crud(title, items, fields) {
  return `<h2>${title}</h2><div class="grid three">${items.map((item) => card(fields.map((field) => `<p><b>${field}:</b> ${item[field] ?? ''}</p>`).join(''))).join('')}</div>`;
}
function pricing() {
  return `<div class="grid three">${card('<h3>FREE</h3><b>₹0/month</b><p>50 appointments, 1 staff, basic booking</p>')}${card('<h3>BASIC</h3><b>₹499/month</b><p>Unlimited appointments, 5 staff, offers, WhatsApp tools</p>')}${card('<h3>PRO</h3><b>₹999/month</b><p>Unlimited staff, analytics, memberships, marketing tools</p>')}</div>`;
}
function admin() {
  return `<h2>Super Admin</h2><div class="grid stats">${['Total salons 5', 'Active salons 4', 'Total customers 100', 'Appointments this month 200', 'MRR ₹2,996', 'New salons this month 2'].map((item) => card(item)).join('')}</div>${salonListing()}${pricing()}`;
}
function publicBooking() {
  const salon = selectedSalon();
  return `<h1>${salon.name}</h1><p>${salon.location} • Open 9 AM - 7 PM</p><a href="${whatsappUrl(salon.whatsapp, `Hi ${salon.name}, I want to book an appointment`)}">Book on WhatsApp</a>${card(`<h2>Services</h2>${services.slice(0, 6).map((service) => `<p><b>${service.name}</b> — ${inr(service.price)} • ${service.duration} min</p>`).join('')}`)}${appointmentsPage()}`;
}

function bottomNav() {
  const items = role === 'customer' ? [['salons', 'Salons'], ['public', 'Book'], ['home', 'Home'], ['salons', 'More']] : role === 'staff' ? [['staff-schedule', 'Schedule'], ['appointments', 'Bookings'], ['customers', 'Customers'], ['staff-schedule', 'More']] : [['dashboard', 'Home'], ['appointments', 'Bookings'], ['customers', 'Customers'], ['settings', 'More']];
  return `<footer>${items.map(([item, label]) => `<button onclick="setRoute('${item}')">${label}</button>`).join('')}</footer>`;
}
function render() {
  const routes = { home: marketing, salons: salonListing, dashboard, appointments: appointmentsPage, customers: customersPage, services: () => crud('Services', services, ['name', 'category', 'price', 'duration', 'active']), staff: () => crud('Staff', staff, ['name', 'role', 'start', 'end', 'active']), offers: () => `<h2>Offers</h2>${card(`<h3>Onam Glow</h3><p>${selectedSalon().offer}</p><a href="${whatsappUrl(selectedSalon().whatsapp, `Hi Customer, ${selectedSalon().name} has a special offer for you: ${selectedSalon().offer}.`)}">Send Offer via WhatsApp</a>`)}`, sales: () => `<h2>Sales</h2><div class="grid stats">${['Today ₹120', 'Weekly ₹480', 'Monthly ₹2,160', 'Completed appointments 1', 'Average bill ₹120'].map((item) => card(item)).join('')}</div>`, membership: () => crud('Membership plans', [{ name: 'Gold Membership', price: 999, benefits: '10% discount, priority booking, birthday offer', status: 'Active' }], ['name', 'price', 'benefits', 'status']), settings: () => `<h2>Salon Profile & Onboarding</h2>${card('<p>Step 1 Salon name → Step 2 Location → Step 3 WhatsApp → Step 4 Services → Step 5 Staff → Step 6 Working hours → Step 7 Finish</p><progress value="86" max="100"></progress><p>Auth: Supabase email/password signup creates owner, salon profile and salon_users row through database/API onboarding.</p>')}`, admin, public: publicBooking, 'staff-schedule': staffSchedule };
  root.innerHTML = nav() + `<main>${routes[route]()}</main>` + bottomNav();
}
render();
