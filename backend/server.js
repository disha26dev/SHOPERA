const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.DATABASE_URL) {
console.error("DATABASE_URL environment variable is missing.");
process.exit(1);
}

const db = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

async function initializeDatabase() {
await db.query(`         CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            description TEXT
        )
    `);


await db.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        salt TEXT NOT NULL,
        password_hash TEXT NOT NULL
    )
`);

const result = await db.query("SELECT COUNT(*)::int AS count FROM products");

if (result.rows[0].count === 0) {
    await db.query(
        `INSERT INTO products (name, price, description) VALUES
        ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)`,
        [
            "Classic Sneakers", 2499,
            "Comfortable and stylish sneakers perfect for everyday use.",
            "Wireless Headphones", 1999,
            "Enjoy clear sound and a comfortable wireless listening experience.",
            "Smart Watch", 3499,
            "A stylish smart watch to help you stay connected and active."
        ]
    );
}


}

app.get("/", (req, res) => {
res.send("SHOPERA Backend is running!");
});

app.get("/api/products", async (req, res) => {
try {
const result = await db.query("SELECT * FROM products ORDER BY id");
res.json(result.rows);
} catch (error) {
console.error("Products error:", error);
res.status(500).json({ message: "Unable to load products." });
}
});

app.post("/api/register", async (req, res) => {
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
    await db.query(
        "INSERT INTO users (name, email, salt, password_hash) VALUES ($1, $2, $3, $4)",
        [cleanName, cleanEmail, salt, hash]
    );

    res.status(201).json({
        message: "Registration successful!",
        name: cleanName
    });
} catch (error) {
    if (error.code === "23505") {
        return res.status(409).json({ message: "This email is already registered." });
    }

    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed." });
 }
});

app.post("/api/login", async (req, res) => {
const { email, password } = req.body || {};


if (!email || !password || typeof password !== "string") {
    return res.status(400).json({ message: "Enter your email and password." });
}

try {
    const result = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [String(email).trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
        return res.status(401).json({ message: "Incorrect email or password." });
    }

    const hash = crypto.scryptSync(password, user.salt, 64);
    const savedHash = Buffer.from(user.password_hash, "hex");

    if (hash.length !== savedHash.length || !crypto.timingSafeEqual(hash, savedHash)) {
        return res.status(401).json({ message: "Incorrect email or password." });
    }

    res.json({ message: "Login successful!", name: user.name });
} catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed." });
}


});

async function startServer() {
try {
await initializeDatabase();


    app.listen(PORT, "0.0.0.0", () => {
        console.log(`SHOPERA server started on port ${PORT}`);
    });
} catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
}


}

startServer();
