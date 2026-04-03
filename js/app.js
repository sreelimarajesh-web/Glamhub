const bookingForm = document.getElementById('booking-form');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const dateInput = document.getElementById('date');
const timeInput = document.getElementById('time');

const BOOKINGS_API_URL = '/api/bookings';

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
    } catch (error) {
        showMessage(errorMessage, 'Unable to connect to booking service. Please try again.');
    }
});

setBookingDateRange();
populateTimeSlots();
