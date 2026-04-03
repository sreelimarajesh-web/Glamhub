const bookingsList = document.getElementById('bookings-list');
const adminLoginForm = document.getElementById('admin-login-form');
const adminBookingsPanel = document.getElementById('admin-bookings-panel');
const adminSuccessMessage = document.getElementById('admin-success-message');
const adminErrorMessage = document.getElementById('admin-error-message');
const adminLogoutButton = document.getElementById('admin-logout-button');
const bookingDetailPanel = document.getElementById('booking-detail-panel');

const ADMIN_SESSION_KEY = 'glamhub_admin_logged_in';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'adminhub';
const BOOKINGS_API_URL = '/api/bookings';

let allBookings = [];
let selectedBookingId = null;

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

function isAdminLoggedIn() {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

function setAdminSession(isLoggedIn) {
    localStorage.setItem(ADMIN_SESSION_KEY, isLoggedIn ? 'true' : 'false');
}

function renderBookingDetails(booking) {
    if (!booking) {
        bookingDetailPanel.innerHTML = `
            <h3>Booked Person Details</h3>
            <p class="section-text">Select a booking from the sidebar to view full details.</p>
        `;
        return;
    }

    bookingDetailPanel.innerHTML = `
        <h3>Booked Person Details</h3>
        <article class="booking-item booking-detail-card">
            <h4>${booking.name}</h4>
            <p><strong>Service:</strong> ${booking.service}</p>
            <p><strong>Schedule:</strong> ${formatDate(booking.date)} at ${formatTime(booking.time)}</p>
            <p><strong>Email:</strong> ${booking.email}</p>
            <p><strong>Status:</strong> ${booking.status || 'active'}</p>
            <p><strong>Notes:</strong> ${booking.notes || '—'}</p>
            ${booking.status === 'cancelled' ? `<p><strong>Cancellation Reason:</strong> ${booking.cancellationReason || 'N/A'}</p>` : ''}
        </article>
        ${booking.status === 'cancelled' ? '' : `
            <form id="cancel-booking-form" class="booking-form cancel-booking-form">
                <div class="form-group">
                    <label for="cancellation-reason">Cancellation Reason</label>
                    <textarea id="cancellation-reason" name="reason" rows="3" placeholder="Why are you cancelling this booking?" required></textarea>
                </div>
                <button class="btn-secondary" type="submit">Cancel Booking</button>
            </form>
        `}
    `;

    const cancelForm = document.getElementById('cancel-booking-form');
    if (cancelForm) {
        cancelForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const reason = new FormData(cancelForm).get('reason')?.trim();

            if (!reason) {
                showMessage(adminErrorMessage, 'Please add a cancellation reason.');
                return;
            }

            try {
                const response = await fetch(`${BOOKINGS_API_URL}/${booking._id}/cancel`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-username': ADMIN_USERNAME,
                        'x-admin-password': ADMIN_PASSWORD
                    },
                    body: JSON.stringify({ reason })
                });

                const payload = await response.json();
                if (!response.ok) {
                    showMessage(adminErrorMessage, payload.error || 'Unable to cancel booking right now.');
                    return;
                }

                showMessage(adminSuccessMessage, `Booking cancelled for ${booking.name}.`);
                await refreshBookings();
            } catch (error) {
                showMessage(adminErrorMessage, 'Unable to connect to booking service. Please try again.');
            }
        });
    }
}

function renderBookings(bookings) {
    if (!bookings.length) {
        bookingsList.innerHTML = '<p>No bookings yet. Confirmed appointments will appear here for admin.</p>';
        renderBookingDetails(null);
        return;
    }

    bookingsList.innerHTML = bookings
        .map((booking) => `
            <button class="booking-item booking-sidebar-item ${selectedBookingId === booking._id ? 'selected' : ''}" data-booking-id="${booking._id}" type="button">
                <h4>${booking.name}</h4>
                <p>${formatDate(booking.date)} · ${formatTime(booking.time)}</p>
                <p>${booking.service} · ${booking.status || 'active'}</p>
            </button>
        `)
        .join('');

    bookingsList.querySelectorAll('[data-booking-id]').forEach((button) => {
        button.addEventListener('click', () => {
            selectedBookingId = button.getAttribute('data-booking-id');
            renderBookings(allBookings);
            const booking = allBookings.find((item) => item._id === selectedBookingId);
            renderBookingDetails(booking);
        });
    });

    const selected = bookings.find((item) => item._id === selectedBookingId) || bookings[0];
    selectedBookingId = selected?._id || null;
    renderBookingDetails(selected);
}

function updateAdminView() {
    const loggedIn = isAdminLoggedIn();

    adminLoginForm.style.display = loggedIn ? 'none' : 'grid';
    adminBookingsPanel.style.display = loggedIn ? 'block' : 'none';

    if (!loggedIn) {
        bookingsList.innerHTML = '';
        renderBookingDetails(null);
    }
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

async function refreshBookings() {
    allBookings = await fetchBookingsFromMongo();
    renderBookings(allBookings);
}

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

        await refreshBookings();
        showMessage(adminSuccessMessage, 'Admin login successful. You can now view bookings.');
    } catch (error) {
        setAdminSession(false);
        updateAdminView();
        showMessage(adminErrorMessage, 'Login worked, but bookings could not be loaded from MongoDB.');
    }
});

adminLogoutButton.addEventListener('click', () => {
    setAdminSession(false);
    selectedBookingId = null;
    allBookings = [];
    updateAdminView();
    showMessage(adminSuccessMessage, 'You have been logged out.');
});

updateAdminView();

if (isAdminLoggedIn()) {
    refreshBookings().catch(() => {
        setAdminSession(false);
        updateAdminView();
        showMessage(adminErrorMessage, 'Your admin session expired. Please log in again.');
    });
}
