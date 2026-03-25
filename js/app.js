const bookingForm = document.getElementById('booking-form');
const bookingsList = document.getElementById('bookings-list');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const dateInput = document.getElementById('date');
const timeInput = document.getElementById('time');
const adminLoginForm = document.getElementById('admin-login-form');
const adminBookingsPanel = document.getElementById('admin-bookings-panel');
const adminSuccessMessage = document.getElementById('admin-success-message');
const adminErrorMessage = document.getElementById('admin-error-message');
const adminLogoutButton = document.getElementById('admin-logout-button');

const ADMIN_SESSION_KEY = 'glamhub_admin_logged_in';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'adminhub';
const BOOKINGS_API_URL = '/api/bookings';

function formatDate(isoDate) {
    return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(time24) {
    const [hoursString, minutesString] = time24.split(':');
    const hours = Number(hoursString);
    const minutes = Number(minutesString);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
        return time24;
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = (hours % 12) || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function showMessage(element, message) {
    element.textContent = message;
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 3500);
}

function renderBookings(bookings) {
    if (!bookings.length) {
        bookingsList.innerHTML = '<p>No bookings yet. Confirmed appointments will appear here for admin.</p>';
        return;
    }

    bookingsList.innerHTML = bookings
        .map((booking) => `
            <article class="booking-item">
                <h4>${booking.name} · ${booking.service}</h4>
                <p>${formatDate(booking.date)} at ${formatTime(booking.time)}</p>
                <p>${booking.email}</p>
            </article>
        `)
        .join('');
}

function isAdminLoggedIn() {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

function setAdminSession(isLoggedIn) {
    localStorage.setItem(ADMIN_SESSION_KEY, isLoggedIn ? 'true' : 'false');
}

function updateAdminView() {
    const loggedIn = isAdminLoggedIn();

    adminLoginForm.style.display = loggedIn ? 'none' : 'grid';
    adminBookingsPanel.style.display = loggedIn ? 'block' : 'none';

    if (!loggedIn) {
        bookingsList.innerHTML = '<p>No bookings yet. Confirmed appointments will appear here for admin.</p>';
    }
}

function setBookingDateRange() {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);

    const formatAsInputDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    dateInput.min = formatAsInputDate(today);
    dateInput.max = formatAsInputDate(maxDate);
}

function isWithinBookingWindow(isoDate) {
    const selected = new Date(`${isoDate}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    return selected >= today && selected <= maxDate;
}

function isValidThirtyMinuteSlot(time) {
    const [hours, minutes] = time.split(':').map(Number);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
        return false;
    }

    return minutes === 0 || minutes === 30;
}

function populateTimeSlots() {
    const openingHour = 9;
    const closingHour = 20;
    const timeOptions = [];

    for (let hour = openingHour; hour <= closingHour; hour += 1) {
        for (const minute of [0, 30]) {
            if (hour === closingHour && minute === 30) {
                continue;
            }

            const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            timeOptions.push({
                value,
                label: formatTime(value)
            });
        }
    }

    timeInput.innerHTML = `
        <option value="" disabled selected>Select a time slot</option>
        ${timeOptions.map((slot) => `<option value="${slot.value}">${slot.label}</option>`).join('')}
    `;
}

async function fetchBookingsFromMongo() {
    const response = await fetch(BOOKINGS_API_URL, {
        headers: {
            'x-admin-username': ADMIN_USERNAME,
            'x-admin-password': ADMIN_PASSWORD
        }
    });

    if (!response.ok) {
        throw new Error('Unable to fetch bookings right now.');
    }

    return response.json();
}

bookingForm.addEventListener('submit', async (event) => {
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

    if (!isWithinBookingWindow(booking.date)) {
        showMessage(errorMessage, 'Bookings can only be made from today up to the next 7 days.');
        return;
    }

    if (!isValidThirtyMinuteSlot(booking.time)) {
        showMessage(errorMessage, 'Please select a time in 30-minute intervals.');
        return;
    }

    try {
        const response = await fetch(BOOKINGS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(booking)
        });

        const payload = await response.json();

        if (!response.ok) {
            showMessage(errorMessage, payload.error || 'Unable to save your booking right now.');
            return;
        }

        bookingForm.reset();
        setBookingDateRange();
        showMessage(successMessage, `Thanks ${booking.name}! Your ${booking.service} appointment is confirmed.`);

        if (isAdminLoggedIn()) {
            const bookings = await fetchBookingsFromMongo();
            renderBookings(bookings);
        }
    } catch (error) {
        showMessage(errorMessage, 'Unable to connect to booking service. Please try again.');
    }
});

adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(adminLoginForm);
    const username = formData.get('username')?.trim();
    const password = formData.get('password');

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        showMessage(adminErrorMessage, 'Invalid admin credentials. Please try again.');
        return;
    }

    try {
        setAdminSession(true);
        updateAdminView();
        adminLoginForm.reset();

        const bookings = await fetchBookingsFromMongo();
        renderBookings(bookings);
        showMessage(adminSuccessMessage, 'Admin login successful. You can now view bookings.');
    } catch (error) {
        setAdminSession(false);
        updateAdminView();
        showMessage(adminErrorMessage, 'Login worked, but bookings could not be loaded from MongoDB.');
    }
});

adminLogoutButton.addEventListener('click', () => {
    setAdminSession(false);
    updateAdminView();
    showMessage(adminSuccessMessage, 'You have been logged out.');
});

setBookingDateRange();
populateTimeSlots();
updateAdminView();

if (isAdminLoggedIn()) {
    fetchBookingsFromMongo()
        .then(renderBookings)
        .catch(() => {
            setAdminSession(false);
            updateAdminView();
        });
}
