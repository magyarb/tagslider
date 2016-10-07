var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var InstagramStrategy = require('passport-instagram').Strategy;

var url = "http://tagslide.online";

var User = require('../models/user');

// Register
router.get('/register', function(req, res){
	res.render('register');
});

// Login
router.get('/login', function(req, res){
	res.render('login');
});

router.get('/lofasz', function(req, res){
	res.send('aaz');
});

// Register User
router.post('/register', function(req, res){
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;

	// Validation
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors:errors
		});
	} else {
		var newUser = new User({
			name: name,
			email:email,
			username: username,
			password: password
		});

		User.createUser(newUser, function(err, user){
			if(err) throw err;
			console.log(user);
		});

		req.flash('success_msg', 'You are registered and can now login');

		res.redirect('/users/login');
	}
});

passport.use(new LocalStrategy(
  function(username, password, done) {
   User.getUserByUsername(username, function(err, user){
   	if(err) throw err;
   	if(!user){
   		return done(null, false, {message: 'Unknown User'});
   	}

   	User.comparePassword(password, user.password, function(err, isMatch){
   		if(err) throw err;
   		if(isMatch){
   			return done(null, user);
   		} else {
   			return done(null, false, {message: 'Invalid password'});
   		}
   	});
   });
  }));

passport.use(new FacebookStrategy({
		clientID: "417097311706806",
		clientSecret: "47ebbb396e9ebf2ec0793f1256a23a17",
		callbackURL: url+"/users/auth/facebook/callback",
		profileFields: ['name','emails','gender','profileUrl']
	},
	function(accessToken, refreshToken, profile, done) {

		process.nextTick(function(){
			User.findOne({'facebook.id': profile.id}, function(err, user){
				if(err)
					return done(err);
				if(user)
					return done(null, user);
				else {
					var newUser = new User();
					newUser.facebook.id = profile.id;
					newUser.facebook.token = accessToken;
					newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
					newUser.facebook.email = profile.emails[0].value;

					newUser.save(function(err){
						if(err)
							throw err;
						return done(null, newUser);
					});
					console.log(profile);
					console.log(accessToken);
				}
			});
		});
	}
));

passport.use(new InstagramStrategy({
		clientID: "62d282dc0e97450480f6782fc25fc2dd",
		clientSecret: "d611c1bb5dc94341810b092419fd9cbd" ,
		callbackURL: url+"/users/auth/instagram/callback"
	},
	function(accessToken, refreshToken, profile, done) {
		var pandt = profile;
		pandt.token2 = accessToken;

		return done(null, profile);
	}
));

router.get('/auth/instagram',
	passport.authenticate('instagram'));

router.get('/auth/instagram/callback',
	passport.authorize('instagram', { failureRedirect: '/' }),
	function(req, res) {
		var user = req.user;
		var account = req.account;

		// Associate the Twitter account with the logged-in user.
		user.instagram.id = account.id;
		user.instagram.token = account.token2;
		user.instagram.username = account.username;
		user.save(function(err) {
			if (err) { return self.error(err); }
		});
		res.redirect('/');
	});

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
router.get('/auth/facebook', passport.authenticate('facebook', {scope: ['email']}));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
router.get('/auth/facebook/callback',
	passport.authenticate('facebook', { successRedirect: '/',
		failureRedirect: '/login' }));

passport.serializeUser(function(user, done){
	done(null, user.id);
});

passport.deserializeUser(function(id, done){
	User.findById(id, function(err, user){
		done(err, user);
	});
});

router.post('/login',
  passport.authenticate('local', {successRedirect:'/', failureRedirect:'/users/login',failureFlash: true}),
  function(req, res) {
    res.redirect('/');
  });

router.get('/logout', function(req, res){
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});

module.exports = router;