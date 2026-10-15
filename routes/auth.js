const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");

const router = express.Router();

router.post ("/login", async (req, res) => {
    try{
        const {email, password} = req.body;

        const user = await User.findOne({email});

        if(!user) {
            return res.status(401).json({message: "Invalid email or password"});
        }

        const passwordMatches = await bcrypt.compare(password, user.password);

        if(!passwordMatches){
            return res.status(401).json({message: "Invalid email or password"});
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h"}
        );
        res.status(200).json({message: "Login successful", token});

    } catch(error){
        console.error(error);
        res.status(500).json({message: "Server error during login"});
    }
});

module.exports = router;