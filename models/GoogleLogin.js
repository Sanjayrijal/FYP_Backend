const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // Check if user already exists with this email
        let user = await User.findOne({ email });

        if (user) {
          // Link Google ID to existing account if not already linked
          if (!user.googleId) {
            user.googleId = profile.id;
            user.profilePic = user.profilePic || profile.photos[0].value;
            user.verified = true;
            await user.save();
          }
          return done(null, user);
        }

        // Check if user exists with googleId
        user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Create brand new user
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: email,
            profilePic: profile.photos[0].value,
            verified: true,
          });
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
