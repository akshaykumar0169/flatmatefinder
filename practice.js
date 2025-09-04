const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware to parse URL-encoded bodies (from forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // ✅ Add this for JSON parsing
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/flatmatefinder', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (error) => console.error('MongoDB connection error:', error));
db.once('open', () => {
    console.log('MongoDB connection successful');
});

// Define schema matching your signup form
const userSchema = new mongoose.Schema({
    fullname: String,
    email: String,
    phone: String,
    age: Number,
    gender: String,
    occupation: String,
    password: String,
    confirm: String,
    terms: Boolean,
});

// Create User model
const User = mongoose.model('User', userSchema);

// Serve your signup.html file at root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

// Handle form POST submission
app.post('/submit', async (req, res) => {
    console.log('Form Data:', req.body);

    const {
        fullname,
        email,
        phone,
        age,
        gender,
        occupation,
        password,
        confirm,
        terms,
    } = req.body;

    const termsAccepted = terms === 'on';

    if (password !== confirm) {
        return res.status(400).send('Passwords do not match.');
    }
    if (!termsAccepted) {
        return res.status(400).send('You must accept the terms.');
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('User with this email already exists.');
        }

        const user = new User({
            fullname,
            email,
            phone,
            age,
            gender,
            occupation,
            password,
            confirm,
            terms: termsAccepted,
        });

        await user.save();

        // ✅ Redirect directly to login page
        return res.redirect('/login.html');
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).send('Error saving user data.');
    }
});

// ✅ Updated login route with database authentication
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user in database by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Check if password matches (Note: In production, use bcrypt for password hashing)
        if (user.password !== password) {
            return res.json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Login successful
        res.json({
            success: true,
            message: "Login successful! Redirecting...",
            redirect: "user-dashboard.html",
            user: {
                id: user._id,
                fullname: user.fullname,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});










