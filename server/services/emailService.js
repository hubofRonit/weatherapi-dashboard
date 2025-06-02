// server/services/emailService.js
import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter;

try {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure, // true for 465, false for other ports like 587
      pool: true,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
       // Optional: Add TLS options if needed (e.g., for self-signed certs, though not recommended for Gmail)
      // tls: {
      //   rejectUnauthorized: false // Use only for testing with local/self-signed certs
      // }
    });

    // Verify connection configuration (optional, but good for startup check)
    transporter.verify(function(error, success) {
      if (error) {
        console.error("Nodemailer configuration error:", error);
        // Decide if this should be a fatal error or just a warning
        // process.exit(1);
      } else {
        console.log("Nodemailer is ready to send emails");
      }
    });

} catch (error) {
    console.error("Failed to create Nodemailer transporter:", error);
    // Make transporter unusable if creation fails
    transporter = null;
}


/**
 * Sends an email.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject.
 * @param {string} text - Plain text body.
 * @param {string} html - HTML body (optional).
 */
const sendEmail = async (to, subject, text, html) => {
    if (!transporter) {
        console.error("Email not sent: Nodemailer transporter is not configured correctly.");
        return; // Prevent errors if transporter setup failed
    }

  const mailOptions = {
    from: config.email.from, // sender address (must be same as auth user for some services like Gmail)
    to: to,                  // list of receivers
    subject: subject,        // Subject line
    text: text,              // plain text body
    html: html,              // html body (optional)
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    // Depending on the error, you might want to retry or log differently
  }
};

export default sendEmail;