const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware for parsing forms and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Serve static files (uploads, html, css, js)
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '/public/uploads/');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/flatmatefinder', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', err => console.error('MongoDB connection error:', err));
db.once('open', () => console.log('MongoDB connection successful'));

// User schema and model
const userSchema = new mongoose.Schema({
    fullname: String,
    email: String,
    phone: String,
    age: Number,
    gender: String,
    occupation: String,
    password: String,  // hash in production
    confirm: String,
    terms: Boolean,
});
const User = mongoose.model('User', userSchema);

// Flatmate requirement schema and model
const postSchema = new mongoose.Schema({
    images: [String],
    price: Number,
    furnishing: String,
    state: String,
    city: String,
    location: String,
    prefs: [String],
    gender: String,
    notes: String,
    createdAt: { type: Date, default: Date.now },
});
const Requirement = mongoose.model('Requirement', postSchema);

// Routes

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.post('/submit', async (req, res) => {
    const { fullname, email, phone, age, gender, occupation, password, confirm, terms } = req.body;
    if (password !== confirm) return res.status(400).send('Passwords do not match.');
    if (terms !== 'on') return res.status(400).send('You must accept the terms.');

    try {
        if (await User.findOne({ email })) return res.status(400).send('User with this email already exists.');
        const user = new User({ fullname, email, phone, age, gender, occupation, password, confirm, terms: true });
        await user.save();
        res.redirect('/login.html');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error saving user data.');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, message: 'Email and password are required' });

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || user.password !== password) return res.json({ success: false, message: 'Invalid email or password' });

        res.json({
            success: true,
            message: 'Login successful! Redirecting...',
            redirect: 'user-dashboard.html',
            user: { id: user._id, fullname: user.fullname, email: user.email },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// Flatmate requirement posting with image upload
app.post('/api/post-requirement', upload.array('images', 3), async (req, res) => {
    try {
        const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
        const prefs = Array.isArray(req.body.prefs) ? req.body.prefs : req.body.prefs ? [req.body.prefs] : [];
        const { price, furnishing, state, city, location, gender, notes } = req.body;

        const post = new Requirement({
            images,
            price: Number(price),
            furnishing,
            state,
            city,
            location,
            prefs,
            gender,
            notes,
        });
        await post.save();
        res.status(201).json({ success: true, message: 'Requirement posted successfully!', post });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error while posting requirement' });
    }
});

// Optional: get all requirements
app.get('/api/requirements', async (req, res) => {
    try {
        const data = await Requirement.find().sort({ createdAt: -1 });
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
