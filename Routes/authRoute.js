const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();
const authController = require("../Controllers/authController");

function issueTokenAndRedirect(req, res, loginMethod) {
  const token = jwt.sign(
    { id: req.user.id, loginMethod },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  // No cookie, add token in redirect URL instead
  res.redirect(`https://www.turjuman.online/auth/callback?token=${token}`);
}

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], callbackURL: "https://api.turjuman.online/auth/google/callback" })
);

router.get("/logout", authController.logout);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/login-failure",
    callbackURL: "https://api.turjuman.online/auth/google/callback",
  }),
  (req, res) => {
    issueTokenAndRedirect(req, res, "google");
  }
); //

router.get("/login-failure", (req, res) => {
  res.redirect("https://turjuman.online/login");
});

// Facebook login
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"], callbackURL: "https://api.turjuman.online/auth/facebook/callback" })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/auth/login-failure",
    callbackURL: "https://api.turjuman.online/auth/facebook/callback",
  }),
  (req, res) => {
    issueTokenAndRedirect(req, res, "facebook");
  }
);

module.exports = router;
