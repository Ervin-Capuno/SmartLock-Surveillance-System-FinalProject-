const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const ejs = require('ejs');
const fs = require('fs');

require('dotenv').config();

const app = express();
const port = 3000;

app.set('view engine', 'ejs');

const server = app.listen(port, () => {
  console.log('Server running! port ${port}')
});


// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  timezone: '+08:00'
});


db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});


const midnightTask = schedule.scheduleJob('0 0 * * *', () => {
  // This function will be executed at 12:00 AM in the Philippine time zone

  const philippineTime = moment().tz('Asia/Manila'); // Get current time in the Philippine time zone
  console.log(`Executing task at 12:00 PM in the Philippine time zone: ${philippineTime.format('YYYY-MM-DD HH:mm:ss')}`);

  // Delete all data from the 'door' table
  db.query('DELETE FROM door', (error) => {
    if (error) {
      console.error('Error deleting data from door table:', error);
    } else {
      console.log('Data deleted from door table at 12:00 Am');
    }
  });

  // Delete all data from the 'vibrations' table
  db.query('DELETE FROM vibrations', (error) => {
    if (error) {
      console.error('Error deleting data from vibrations table:', error);
    } else {
      console.log('Data deleted from vibrations table at 9:00 PM');
    }
  });
});


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // Set the session duration to one day
  },
}));


// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/mainWebsite', express.static(path.join(__dirname, 'public', 'mainWebsite')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signInAndSignUp.html'));
});

// app.get('/signup', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'signUp.html'));
// });

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    // Check if the email already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], (checkErr, results) => {
      if (checkErr) {
        console.error('Error checking existing user:', checkErr);
        res.send('<script>alert("Error checking existing user");window.location="/login"</script>');
        return;
      }

      if (results.length > 0) {
        // Email already exists
        res.send('<script>alert("Error checking existing user");window.location="/login";</script>');
        return;
      }

      // Hash the password
      bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
          console.error('Error hashing password:', hashErr);
          res.send('Error creating user');
          return;
        }

        // Generate a verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Store the user in the MySQL database with the verification token
        db.query(
          'INSERT INTO users (email, password, verification_token) VALUES (?, ?, ?)',
          [email, hashedPassword, verificationToken],
          (insertErr) => {
            if (insertErr) {
              console.error('Error creating user:', insertErr);
              res.send('Error creating user');
              return;
            }

            // Send verification email
            sendVerificationEmail(email, verificationToken);

            res.send('<script>alert("Verification email sent. Please check your email."); window.location="/login";</script>');
          }
        );
      });
    });
  }
);

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signInAndSignUp.html'));
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Retrieve the user from the MySQL database
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Error querying user:', err);
      res.send('Error querying user');
      return;
    }

    const user = results[0];

    if (!user) {
      res.send(`<script>alert("Invalid credentials");window.location = "/login";</script>`);
      return;
    }

    if (!user.is_verified) {
      res.send('<script>alert("Account not verified. Please check your email for the verification link.");window.location = "/login";</script>.');
      return;
    }

    // Check password
    if (await bcrypt.compare(password, user.password)) {
      // Store the user's ID in the session
      req.session.userId = user.id;

      res.redirect('/dashboard');
    } else {
      res.send(`<script>alert("Please check your password!");window.location = "/login";</script>`);
    }
  });
});


app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgotPassword.html'));
});

app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  // Check if the email exists in the database
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error querying user:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const user = results[0];

    if (!user) {
      res.status(404).json({ error: 'Email not registered' });
      return;
    }

    // Generate a password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store the reset token and its expiration time in the database
    const resetTokenExpiration = moment().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
    db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiration = ? WHERE id = ?',
      [resetToken, resetTokenExpiration, user.id],
      (updateErr) => {
        if (updateErr) {
          console.error('Error updating reset token:', updateErr);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }

        // Send a password reset email
        sendPasswordResetEmail(email, resetToken);

        // Respond with a success message
        res.json({ message: 'Password reset email sent successfully' });
      }
    );
  });
});

// Function to send password reset email
function sendPasswordResetEmail(email, token) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset Your Password',
    text: `Click the following link to reset your password: http://localhost:3000/reset-password?token=${token}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending password reset email:', error);
    } else {
      console.log('Password reset email sent:', info.response);
    }
  });
}

app.get('/dashboard', (req, res) => {
  // Check if the user is authenticated
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, 'public', 'mainWebsite', 'dashboard.html'));
  } else {
    res.redirect('/login');
  }
});

app.get('/api/camera', (req, res) => {
  const userId = req.session.userId; // Use userId from the session

  // Check if the user is authenticated
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fetch camera data for the authenticated user
  db.query('SELECT * FROM camera WHERE userId = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error querying camera data:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    console.log('Camera data:', results);

    res.json(results);
  });
});



app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Error logging out');
    }
    res.redirect('/');
  });
});

// Verification route
app.get('/verify', async (req, res) => {
  const { token } = req.query;

  // Retrieve the user based on the verification token
  db.query('SELECT * FROM users WHERE verification_token = ?', [token], (err, results) => {
    if (err) {
      console.error('Error querying user:', err);
      res.send('Error querying user');
      return;
    }

    const user = results[0];

    if (!user) {
      return res.send('Invalid verification token');
    }

    // Update the user's account status (e.g., set 'is_verified' field to true)
    db.query('UPDATE users SET is_verified = true WHERE id = ?', [user.id], (updateErr) => {
      if (updateErr) {
        console.error('Error updating user:', updateErr);
        res.send('Error updating user');
        return;
      }

      res.send('Account successfully verified');
    });
  });
});


// Function to send verification email
function sendVerificationEmail(email, token) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Account',
    text: `Click the following link to verify your account: http://localhost:3000/verify?token=${token}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending verification email:', error);
    } else {
      console.log('Verification email sent:', info.response);
    }
  });
}

app.get('/reset-password', (req, res) => {
  const { token } = req.query;

  // Log the contents of the "views" directory
  const viewsDirectory = path.join(__dirname, 'views');
  fs.readdir(viewsDirectory, (err, files) => {
    if (err) {
      console.error('Error reading views directory:', err);
    } else {
      console.log('Contents of views directory:', files);
    }
  });

  if (!token) {
    return res.status(400).json({ error: 'Reset token is missing' });
  }

  db.query(
    'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiration > NOW()',
    [token],
    (error, results) => {
      if (error) {
        console.error('Error verifying reset token:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const user = results[0];

      if (!user) {
        console.error('Invalid or expired reset token:', token);
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Render the EJS template with the token
      res.render('resetPassword', { token });
    }
  );
});

// Password reset form submission route
app.post('/reset-password', (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  db.query(
    'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiration > NOW()',
    [token],
    (error, results) => {
      if (error) {
        console.error('Error verifying reset token:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const user = results[0];

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      bcrypt.hash(newPassword, 10, (hashError, hashedPassword) => {
        if (hashError) {
          console.error('Error hashing password:', hashError);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        db.query(
          'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiration = NULL WHERE id = ?',
          [hashedPassword, user.id],
          (updateError) => {
            if (updateError) {
              console.error('Error updating password in the database:', updateError);
              return res.status(500).json({ error: 'Internal Server Error' });
            }

            res.json({ message: 'Password reset successfully' });
          }
        );
      });
    }
  );
});


app.post('/api/door-control', (req, res) => {
  try {
    const { doorState } = req.body;
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Log the received doorState for debugging
    console.log('Received doorState:', doorState);

    // Update the door state in the database using callbacks
    const query = 'INSERT INTO door (doorState, userId, doorTimestamp) VALUES (?, ?, CURRENT_TIMESTAMP)';
    db.query(query, [doorState, userId], (error, results) => {
      if (error) {
        console.error('Error handling door control request:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // Log the door state to the terminal
      const doorStatus = doorState === 1 ? 'open' : 'closed';
      console.log("Door state updated successfully. Current state: ${doorStatus}");

      res.json({ message: "Door is now ${doorStatus}" });
    });
  } catch (error) {
    console.error('Error handling door control request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/api/all-door-states', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fetch all door state records for the authenticated user
  db.query(
    'SELECT doorState, doorTimestamp FROM door WHERE userId = ? ORDER BY doorTimestamp DESC',
    [userId],
    (error, results) => {
      if (error) {
        console.error('Error querying door states:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const doorStates = results.map(record => ({
        doorTimestamp: record.doorTimestamp,
        doorState: record.doorState,
      }));

      res.json({ doorStates });
    }
  );
});

app.get('/api/latest-door-states', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fetch the latest 10 door states for the authenticated user
  db.query(
      'SELECT doorState, doorTimestamp FROM door WHERE userId = ? ORDER BY doorTimestamp DESC LIMIT 10',
      [userId],
      (error, results) => {
          if (error) {
              console.error('Error querying latest door states:', error);
              return res.status(500).json({ error: 'Internal Server Error' });
          }

          const latestDoorStates = results.map(record => ({
              doorTimestamp: record.doorTimestamp.toISOString(), // Convert to string
              doorState: record.doorState,
          }));

          res.json({ doorStates: latestDoorStates });
      }
  );
});


app.get('/api/check-latest-customer-data', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
  }

  const customerOutQuery = 'SELECT customerOut, customerTimeStampOut FROM customersOut WHERE userId = ? ORDER BY customerTimeStampOut DESC LIMIT 10';
  const customerInQuery = 'SELECT customerIn, customerTimeStampIn FROM customersin WHERE userId = ? ORDER BY customerTimeStampIn DESC LIMIT 10';

  db.query(customerOutQuery, [userId], (errorOut, resultsOut) => {
      if (errorOut) {
          console.error('Error fetching latest customer out data:', errorOut);
          return res.status(500).json({ error: 'Internal Server Error' });
      }

      db.query(customerInQuery, [userId], (errorIn, resultsIn) => {
          if (errorIn) {
              console.error('Error fetching latest customer in data:', errorIn);
              return res.status(500).json({ error: 'Internal Server Error' });
          }

          const latestCustomerOut = resultsOut.length > 0 ? resultsOut : [];
          const latestCustomerIn = resultsIn.length > 0 ? resultsIn : [];

          res.json({ latestCustomerOut, latestCustomerIn });
      });
  });
});



//for vibrations
app.get('/api/latest-vibrations', (req, res) => {
  // Get the user ID from the session
  const userId = req.session.userId;

  if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
  }

  // Use the user ID in the SQL query
  const query = 'SELECT vibrationValue, vibrationTimestamp FROM vibrations WHERE userId = ? ORDER BY vibrationTimestamp DESC LIMIT 10';

  db.query(query, [userId], (error, results) => {
      if (error) {
          console.error('Error fetching latest vibrations:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      } else {
          const vibrations = results.map(record => ({
              vibrationTimestamp: record.vibrationTimestamp.toISOString(), // Convert to string
              vibrationValue: record.vibrationValue,
          }));

          res.json({ vibrations });
      }
  });
});


//for the cameraLinks
app.post('/api/cameraLink', (req, res) => {
  const userId = req.session.userId;
  const outCameraLink = req.body.outCamera;
  const inCameraLink = req.body.inCamera;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const updateQuery = 'UPDATE camera SET cameraIn = ?, cameraOut = ? WHERE userId = ?';

  db.query(updateQuery, [inCameraLink, outCameraLink, userId], (error, results) => {
    if (error) {
      console.error('Error updating camera:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      // Handle the response after the update is successful
      res.json({ message: 'Camera links updated successfully' });
    }
  });
});

//for notifications
app.get('/api/check-latest-vibration', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const query = 'SELECT vibrationValue FROM vibrations WHERE userId = ? ORDER BY vibrationTimestamp DESC LIMIT 1';

  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error fetching latest vibration:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (results.length > 0) {
        const latestVibrationValue = results[0].vibrationValue;
        // Check if the latest vibration value is greater than 70
        const alert = latestVibrationValue >= 70 ? 1 : 0;
        res.json({ alert });
        console.log(alert);
      } else {
        res.json({ alert: 0 }); // No vibration data found
      }
    }
  });
});


// Endpoint for all customer out data
app.get('/api/all-customer-out', (req, res) => {
  const userId = req.session.userId;

  // Check if the user is authenticated
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fetch customer out data for the authenticated user
  const query = 'SELECT customerOutID, customerOut, customerTimeStampOut FROM customersOut WHERE userId = ? ORDER BY customerTimeStampOut';

  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error querying customer out data:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const customerOutData = results.map(record => ({
      customerId: record.customerOutID,
      customerOut: record.customerOut,
      customerTimeStamp: record.customerTimeStampOut,
    }));

    res.json({ customerOutData });
  });
});

// Endpoint for all customer in data
app.get('/api/all-customer-in', (req, res) => {
  const userId = req.session.userId;

  // Check if the user is authenticated
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fetch customer in data for the authenticated user
  const query = 'SELECT customerInID, customerIn, customerTimeStampIn FROM customersIn WHERE userId = ? ORDER BY customerTimeStampIn';

  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error querying customer in data:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const customerInData = results.map(record => ({
      customerId: record.customerInID,
      customerIn: record.customerIn,
      customerTimeStamp: record.customerTimeStampIn,
    }));

    res.json({ customerInData });
  });
});

app.post('/api/update-customer', (req, res) => {
  const { type, customerId, newValue } = req.body;

  // Check if the provided type is valid
  const validTypes = ['Customer In', 'Customer Out'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid customer type' });
  }

  // Check if the customer with the given ID exists
  const tableName = type === 'Customer In' ? 'customersIn' : 'customersOut';
  const checkCustomerQuery = `SELECT * FROM ${tableName} WHERE ${type.toLowerCase()}ID = ?`;

  db.query(checkCustomerQuery, [customerId], (checkErr, results) => {
    if (checkErr) {
      console.error('Error checking existing customer:', checkErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (results.length === 0) {
      // Customer not found
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Update the customer information
    const updateQuery = `UPDATE ${tableName} SET ${type.toLowerCase()} = ? WHERE ${type.toLowerCase()}ID = ?`;
    db.query(updateQuery, [newValue, customerId], (updateErr) => {
      if (updateErr) {
        console.error('Error updating customer:', updateErr);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // Respond with a success message
      res.json({ message: 'Customer updated successfully' });
    });
  });
});





// Function to handle proximity sensor alert
async function handleProximitySensor(userId, tableName) {
  try {
    const triggerField = tableName === 'proximitySensorOut' ? 'triggerOut' : 'triggerIn';

    // Fetch trigger and userId for the current session user
    const query = `SELECT ${triggerField}, userId FROM ${tableName} WHERE userId = ?`;
    const [rows] = await db.promise().query(query, [userId]);

    // Check if the expected properties exist
    if (rows && rows.length > 0 && rows[0].hasOwnProperty(triggerField)) {
      const trigger = rows[1][triggerField];

      console.log(`${tableName} - User ${userId}: trigger is ${trigger}`);

      return { alert: trigger === 1 };
    } else {
      console.error(`Unexpected data structure for ${tableName}`);
      return { alert: false };
    }
  } catch (error) {
    console.error(`Error fetching ${tableName} data:`, error);
    throw error;
  }
}

// Endpoint for proximity sensor out
app.get('/api/proximity-sensor-out', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await handleProximitySensor(userId, 'proximitySensorOut');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint for proximity sensor in
app.get('/api/proximity-sensor-in', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await handleProximitySensor(userId, 'proximitySensorIn');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});






//for arduino codes and endpoint
let userIn = 0;
let motionState = "FALSE";
app.post('/motion', (req, res) => {
  console.log(req.body.motionState);
  if (req.body.motionState === 'HIGH') {
    userIn++;
    console.log('Motion Detected! Incrementing userIn:', userIn);
  } else {
    console.log('Motion Ended');
    console.log(userIn);
  }
  res.sendStatus(200);
});


app.get('/getMotionState', (req, res) => {
  if (userIn >0) {
    motionState = 'HIGH';
    console.log(userIn);
  }

  console.log('Sending motion state to client:', motionState);

  // Send the motion state as JSON to the client
  res.json({ motionState });
});