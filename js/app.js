// Booking Application Logic

class Booking {
    constructor() {
        this.bookings = [];
    }

    // Method to create a new booking
    createBooking(customerName, date, time, service) {
        const booking = {
            id: this.bookings.length + 1,
            customerName,
            date,
            time,
            service,
            status: 'confirmed'
        };
        this.bookings.push(booking);
        return booking;
    }

    // Method to cancel a booking
    cancelBooking(bookingId) {
        const bookingIndex = this.bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex !== -1) {
            this.bookings[bookingIndex].status = 'canceled';
            return this.bookings[bookingIndex];
        }
        return null;
    }

    // Method to list all bookings
    listBookings() {
        return this.bookings;
    }

    // Method to get a specific booking
    getBookingDetails(bookingId) {
        return this.bookings.find(b => b.id === bookingId) || null;
    }
}

// Usage
const bookingApp = new Booking();

// Create new bookings
bookingApp.createBooking('John Doe', '2026-03-25', '10:00', 'Haircut');
bookingApp.createBooking('Jane Smith', '2026-03-25', '11:00', 'Facial');

// List all bookings
console.log(bookingApp.listBookings());

// Get details of a specific booking
console.log(bookingApp.getBookingDetails(1));

// Cancel a booking
console.log(bookingApp.cancelBooking(1));
console.log(bookingApp.listBookings());
