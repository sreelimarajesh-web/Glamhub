const bookingForm = document.getElementById('booking-form');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const dateInput = document.getElementById('date');
const timeInput = document.getElementById('time');
const bookingsList = document.getElementById('my-bookings-list');

const BOOKINGS_API_URL = '/api/bookings';
const MY_BOOKINGS_API_URL = '/api/my-bookings';

const googleIdToken = sessionStorage.getItem('glamhubGoogleIdToken') || '';
const signedInUserName = sessionStorage.getItem('glamhubUserName') || '';
const signedInUserEmail = sessionStorage.getItem('glamhubUserEmail') || '';

if (!googleIdToken) {
    window.location.replace('login.html');
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

function authHeaders() {
    return {
        Authorization: `Bearer ${googleIdToken}`,
        'Content-Type': 'application/json'
    };
}

async function loadMyBookings() {
    try {
        const response = await fetch(MY_BOOKINGS_API_URL, {
            headers: {
                Authorization: `Bearer ${googleIdToken}`
            }
        });

        const payload = await response.json();

        if (!response.ok) {
            showMessage(errorMessage, payload.error || 'Unable to load your bookings.');
            return;
        }

        renderMyBookings(payload);
    } catch (error) {
        showMessage(errorMessage, 'Unable to load bookings right now.');
    }
}

function renderMyBookings(bookings) {
    if (!bookings.length) {
        bookingsList.innerHTML = '<p class="section-text">No bookings yet.</p>';
        return;
    }

    bookingsList.innerHTML = bookings.map((booking) => `
        <article class="booking-item">
            <h4>${booking.service}</h4>
            <p><strong>Date:</strong> ${booking.date}</p>
            <p><strong>Time:</strong> ${formatTime(booking.time)}</p>
            <p><strong>Status:</strong> ${booking.status}</p>
            <p><strong>Notes:</strong> ${booking.notes || '—'}</p>
            ${booking.status !== 'cancelled' ? `
                <div class="my-booking-actions">
                    <button class="btn-secondary" type="button" onclick="rescheduleBooking('${booking._id}')">Reschedule +1 Day</button>
                    <button class="btn-secondary danger-btn" type="button" onclick="cancelBooking('${booking._id}')">Cancel</button>
                </div>
            ` : ''}
        </article>
    `).join('');
}

async function rescheduleBooking(bookingId) {
    try {
        const response = await fetch(`${MY_BOOKINGS_API_URL}/${bookingId}/reschedule`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({
                date: dateInput.value,
                time: timeInput.value
            })
        });

        const payload = await response.json();

        if (!response.ok) {
            showMessage(errorMessage, payload.error || 'Unable to reschedule booking.');
            return;
        }

        showMessage(successMessage, 'Booking rescheduled successfully.');
        loadMyBookings();
    } catch (error) {
        showMessage(errorMessage, 'Unable to reschedule right now.');
    }
}

async function cancelBooking(bookingId) {
    try {
        const response = await fetch(`${MY_BOOKINGS_API_URL}/${bookingId}/cancel`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({
                reason: 'Cancelled by customer'
            })
        });

        const payload = await response.json();

        if (!response.ok) {
            showMessage(errorMessage, payload.error || 'Unable to cancel booking.');
            return;
        }

        showMessage(successMessage, 'Booking cancelled successfully.');
        loadMyBookings();
    } catch (error) {
        showMessage(errorMessage, 'Unable to cancel right now.');
    }
}

window.rescheduleBooking = rescheduleBooking;
window.cancelBooking = cancelBooking;

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
            body: JSON.stringify({
                ...booking,
                idToken: googleIdToken
            })
        });

        const payload = await response.json();

        if (!response.ok) {
            showMessage(errorMessage, payload.error || 'Unable to save your booking right now.');
            return;
        }

        bookingForm.reset();
        document.getElementById('email').value = signedInUserEmail;
        document.getElementById('name').value = signedInUserName;
        setBookingDateRange();
        showMessage(successMessage, `Thanks ${booking.name}! Your ${booking.service} appointment is confirmed.`);
        loadMyBookings();
    } catch (error) {
        showMessage(errorMessage, 'Unable to connect to booking service. Please try again.');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('glamhubGoogleIdToken');
    sessionStorage.removeItem('glamhubUserName');
    sessionStorage.removeItem('glamhubUserEmail');
    window.location.replace('login.html');
});

document.getElementById('welcome-user').textContent = signedInUserName ? `Welcome, ${signedInUserName}` : 'My Booking Page';
document.getElementById('name').value = signedInUserName;
document.getElementById('email').value = signedInUserEmail;
setBookingDateRange();
populateTimeSlots();
loadMyBookings();
