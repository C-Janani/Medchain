const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      registrationId: user.registrationId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

async function login(req, res) {
  try {
    const { registrationId, password, role } = req.body;

    if (!registrationId || !password || !role) {
      return res.status(400).json({
        message: "Registration ID, password and role are required",
      });
    }

    const user = await User.findOne({
      registrationId,
      role,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials for that role",
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!valid) {
      return res.status(401).json({
        message: "Invalid credentials for that role",
      });
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        registrationId: user.registrationId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).select(
      "-passwordHash"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch user",
      error: error.message,
    });
  }
}

module.exports = {
  login,
  me,
};