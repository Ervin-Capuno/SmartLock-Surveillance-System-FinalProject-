const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');

const socketio = require('socket.io');
require('dotenv').config();


const app = express();
const port = 3000;

const server = app.listen(port, () => {
  console.log('Server running! port ${port}')
});


const io = socketio(server)


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // Set the session duration to one day
  },
}));

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});




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
  res.sendFile(path.join(__dirname, 'public', 'signIn.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signUp.html'));
});

app.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 5 }),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if the email already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], (checkErr, results) => {
      if (checkErr) {
        console.error('Error checking existing user:', checkErr);
        res.send('Error checking existing user');
        return;
      }

      if (results.length > 0) {
        // Email already exists
        res.send('User with this email already exists');
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

            res.redirect('/login');
          }
        );
      });
    });
  }
);

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signIn.html'));
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
      // User not found
      res.send('Invalid credentials');
      return;
    }

    if (!user.is_verified) {
      // User not verified
      res.send('Account not verified. Please check your email for the verification link.');
      return;
    }

    // Check password
    if (await bcrypt.compare(password, user.password)) {
      // Store the user's ID in the session
      req.session.userId = user.id;

      res.redirect('/dashboard');
    } else {
      res.send('Invalid credentials');
    }
  });
});

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

    console.log('Camera data:', results); // Log the results to the console

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


//door States 
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

app.post('/api/door-state', (req, res) => {
  const { servo_position } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const servoPositionInt = parseInt(servo_position);

  if (isNaN(servoPositionInt)) {
    return res.status(400).json({ error: 'Invalid servo position' });
  }

  // Update the door state in the database
  db.query(
    'INSERT INTO door (doorState, userId, doorTimestamp) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [servoPositionInt, userId],
    (error, results) => {
      if (error) {
        console.error('Error updating door state:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      io.emit('doorState', { doorState: servoPositionInt });
  
      console.log('Door state updated successfully:', results);
      res.json({ message: 'Door state updated successfully' });
    }
  );
});



app.get('/api/door-state', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fetch the latest door state with timestamp for the authenticated user
  db.query(
    'SELECT doorState, doorTimestamp FROM door WHERE userId = ? ORDER BY doorTimestamp DESC LIMIT 1',
    [userId],
    (error, results) => {
      if (error) {
        console.error('Error querying door state:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (results.length > 0) {
        const latestDoorState = results[0];
        res.json({
          doorState: latestDoorState.doorState,
          doorTimestamp: latestDoorState.doorTimestamp
        });
      } else {
        res.json({ doorState: null, doorTimestamp: null }); // If no records are found
      }
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