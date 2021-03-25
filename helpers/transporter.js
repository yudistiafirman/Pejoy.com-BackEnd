const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "testfirman28@gmail.com",
    pass: "syartikaa28*",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = transporter
