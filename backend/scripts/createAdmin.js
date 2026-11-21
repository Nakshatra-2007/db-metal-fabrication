
require("dotenv").config();

const bcrypt = require("bcryptjs");
const readline = require("readline");
const db = require("../config/db");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function createAdmin() {
  try {
    const username = (await ask("Enter admin username: ")).trim();
    const password = await ask("Enter admin password: ");

    if (!username || password.length < 8) {
      throw new Error("Username is required and password must be at least 8 characters.");
    }

    // Convert password into a secure hash
    const hashedPassword = await bcrypt.hash(password, 12);

    // Store admin details in MySQL
    await db.promise().execute(
      "INSERT INTO admins (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    );

    console.log("Admin account created successfully!");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    rl.close();
    db.end();
  }
}

createAdmin();
