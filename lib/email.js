const nodemailer = require('nodemailer');

function buildTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass
        }
    });
}

async function sendBookingAcceptedEmail({ to, name, service, date, time }) {
    const transporter = buildTransporter();

    if (!transporter) {
        return {
            sent: false,
            message: 'SMTP is not configured. Email was not sent.'
        };
    }

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const subject = 'Your GlamHub booking has been accepted';
    const text = [
        `Hi ${name},`,
        '',
        `Great news — your booking for ${service} on ${date} at ${time} has been accepted.`,
        '',
        'Thank you for choosing GlamHub.'
    ].join('\n');

    await transporter.sendMail({
        from,
        to,
        subject,
        text
    });

    return {
        sent: true,
        message: 'Acceptance email sent to customer.'
    };
}

module.exports = {
    sendBookingAcceptedEmail
};
