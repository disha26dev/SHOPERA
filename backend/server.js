const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");

const app = express();
const db = new Database(path.join(__dirname, "shopera.db"));

app.use(cors());
app.use(express.json());

db.prepare(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price INTEGER,
    description TEXT
)`).run();

const columns = db.prepare("PRAGMA table_info(products)").all();

if (!columns.some(column => column.name === "description")) {
db.prepare("ALTER TABLE products ADD COLUMN description TEXT").run();
}

const count = db.prepare("SELECT COUNT(*) AS count FROM products").get().count;

if (count === 0) {
const insert = db.prepare("INSERT INTO products (name, price, description) VALUES (?, ?, ?)");
insert.run("Classic Sneakers", 2499, "Comfortable and stylish sneakers perfect for everyday use.");
insert.run("Wireless Headphones", 1999, "Enjoy clear sound and a comfortable wireless listening experience.");
insert.run("Smart Watch", 3499, "A stylish smart watch to help you stay connected and active.");
}

db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL
)`).run();

app.get("/", (req, res) => {
res.send("SHOPERA Backend is running!");
});

app.get("/api/products", (req, res) => {
res.json(db.prepare("SELECT * FROM products").all());
});

app.post("/api/register", (req, res) => {
const { name, email, password } = req.body || {};


if (!name || !email || !password) {
    return res.status(400).json({ message: "Please fill in all fields." });
}

const cleanName = String(name).trim();
const cleanEmail = String(email).trim().toLowerCase();

if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ message: "Enter a valid name and email." });
}

if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "Password must contain at least 6 characters." });
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(password, salt, 64).toString("hex");

try {
    db.prepare("INSERT INTO users (name, email, salt, password_hash) VALUES (?, ?, ?, ?)")
        .run(cleanName, cleanEmail, salt, hash);

    res.status(201).json({ message: "Registration successful!", name: cleanName });
} catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({ message: "This email is already registered." });
    }

    console.error(error);
    res.status(500).json({ message: "Registration failed." });
}


});

app.post("/api/login", (req, res) => {
const { email, password } = req.body || {};


if (!email || !password || typeof password !== "string") {
    return res.status(400).json({ message: "Enter your email and password." });
}

const user = db.prepare("SELECT * FROM users WHERE email = ?")
    .get(String(email).trim().toLowerCase());

if (!user) {
    return res.status(401).json({ message: "Incorrect email or password." });
}

const hash = crypto.scryptSync(password, user.salt, 64);
const savedHash = Buffer.from(user.password_hash, "hex");

if (hash.length !== savedHash.length || !crypto.timingSafeEqual(hash, savedHash)) {
    return res.status(401).json({ message: "Incorrect email or password." });
}

res.json({ message: "Login successful!", name: user.name });


});

app.listen(5000, () => {
console.log("SHOPERA server started on port 5000");
console.log("Products API: http://localhost:5000/api/products");
console.log("Registration API: http://localhost:5000/api/register");
console.log("Login API: http://localhost:5000/api/login");
});
