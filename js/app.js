const bookingForm = document.getElementById('booking-form');
const bookingsList = document.getElementById('bookings-list');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const dateInput = document.getElementById('date');

const STORAGE_KEY = 'glamhub_bookings';

function getBookings() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveBookings(bookings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function formatDate(isoDate) {
    return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function showMessage(element, message) {
    element.textContent = message;
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 3500);
}

function renderBookings() {
    const bookings = getBookings();

    if (!bookings.length) {
        bookingsList.innerHTML = '<p>No bookings yet. Your confirmed appointments will appear here.</p>';
        return;
    }

    bookingsList.innerHTML = bookings
        .map((booking) => `
            <article class="booking-item">
                <h4>${booking.name} · ${booking.service}</h4>
                <p>${formatDate(booking.date)} at ${booking.time}</p>
                <p>${booking.email}</p>
            </article>
        `)
        .join('');
}

function setMinimumDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${year}-${month}-${day}`;
}

bookingForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(bookingForm);
    const booking = {
        name: formData.get('name')?.trim(),
        email: formData.get('email')?.trim(),
        date: formData.get('date'),
        time: formData.get('time'),
        service: formData.get('service'),
        notes: formData.get('notes')?.trim() || ''
    };

    if (!booking.name || !booking.email || !booking.date || !booking.time || !booking.service) {
        showMessage(errorMessage, 'Please complete all required booking details.');
        return;
    }

    const bookings = getBookings();
    bookings.unshift(booking);
    saveBookings(bookings);

    bookingForm.reset();
    setMinimumDate();
    renderBookings();
    showMessage(successMessage, `Thanks ${booking.name}! Your ${booking.service} appointment is confirmed.`);
});

setMinimumDate();
renderBookings();
