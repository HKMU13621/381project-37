// 導入依賴
const PORT = process.env.PORT || 8099;

const express = require('express');
const session = require('express-session');
const formidable = require('express-formidable');
const ffsmpeg = require('fluent-ffmpeg');
const passport = require('passport');// Use Passport Middleware
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const fs = require('fs').promises;  // Correct fs.promises import at the top level

const dotenv = require('dotenv');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);

dotenv.config(); // Load environment variables
const crypto = require('crypto');
// Or use a simpler alternative without requiring crypto:
const generateRandomState = () => Math.random().toString(36).substring(7);

const GOOGLE_OAUTH_URL = process.env.GOOGLE_OAUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_ACCESS_TOKEN_URL = process.env.GOOGLE_ACCESS_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const GOOGLE_CALLBACK_URL = "http%3A//localhost:8099/google/callback";
const FACEBOOK_CALLBACK_URL = "http://localhost:8099/auth/facebook/callback";

const GOOGLE_OAUTH_SCOPES = [

    "https%3A//www.googleapis.com/auth/userinfo.email",

    "https%3A//www.googleapis.com/auth/userinfo.profile",

];
const facebookAuth = {
    'clientID': FACEBOOK_APP_ID, // facebook App ID
    'clientSecret': FACEBOOK_APP_SECRET, // facebook App Secret
    'callbackURL': FACEBOOK_CALLBACK_URL
};
const googleAuth = {
    'clientID': GOOGLE_CLIENT_ID,
    'clientSecret': GOOGLE_CLIENT_SECRET,
    'callbackURL': GOOGLE_CALLBACK_URL
};
var user = {};  // user object to be put in session

// passport needs ability to serialize and unserialize users out of session
// Passport uses serializeUser function to persist user data (after successful authentication) into session. 
// Function deserializeUser is used to retrieve user data from session.
passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (id, done) {
    done(null, user);
});

// passport facebook strategy
passport.use(new FacebookStrategy({
    "clientID": facebookAuth.clientID,
    "clientSecret": facebookAuth.clientSecret,
    "callbackURL": facebookAuth.callbackURL
},
    function (token, refreshToken, profile, done) {
        //console.log("Facebook Profile: " + JSON.stringify(profile));
        console.log("Facebook Profile: ");
        console.log(profile);
        user = {};
        user['id'] = profile.id;
        //user['name'] = profile.name.givenName;
        user['name'] = profile.displayName;
        user['type'] = profile.provider;  // Facebook? Google? Twitter?
        console.log('user object: ' + JSON.stringify(user));
        return done(null, user);  // put user object into session => req.user
    })
);

passport.use(new GoogleStrategy({
    "clientID": googleAuth.clientID,
    "clientSecret": googleAuth.clientSecret,
    "callbackURL": googleAuth.callbackURL,
    passReqToCallback: true // pass request to callback

},
    function (token, refreshToken, profile, done) {
        console.log("Google Profile: ");
        console.log(profile);

        const user = {
            id: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            type: 'google'
        };

        console.log('user object: ' + JSON.stringify(user));
        return done(null, user);
    })
);


// 導入文件
const Audio = require('./models/audioModel');
const DatabaseHandler = require('./lib/mongodbHandler');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}
// 創建配置參數



// 創建依賴實體
const app = express();



// 設置模板引擎
app.set('view engine', 'ejs');
app.set('views', './views');

// 設置中間件
app.use(formidable({
    uploadDir: './uploads',    // Directory for temporary files
    keepExtensions: true,      // Keep file extensions
    maxFileSize: 50 * 1024 * 1024, // Max file size (50MB)
    multiples: true           // Allow multiple files
}));
app.use(session({ // 設置會話規則
    name: 'session',
    secret: 'COMPS381F_GROUPPROJECT',
    keys: ['key1', 'key2', 'key3'],
    resave: false,
    saveUninitialized: true
}));
app.use('/public', express.static('public'));





//==============================================================================================
// OAUTH Functions
// Passport needs the following setup to save user data after authentication in the session:
// initialize passposrt and and session for persistent login sessions
app.use(session({
    secret: "tHiSiSasEcRetStr",
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated() || req.session.user){
        req.user = req.session.user
        return next();
}
    res.redirect('/login');
}





//==============================================================================================
// send to facebook to do the authentication
app.get("/auth/facebook", passport.authenticate("facebook", { scope: "email" }));
// handle the callback after facebook has authenticated the user
app.get("/auth/facebook/callback",
    passport.authenticate("facebook", {
        successRedirect: "/content",
        failureRedirect: "/"
    }));

app.get("/auth/google", async (req, res) => {
    const state = "COMPS381F_GROUPPROJECT";
    const scopes = GOOGLE_OAUTH_SCOPES.join(" ");
    const GOOGLE_OAUTH_CONSENT_SCREEN_URL = `${GOOGLE_OAUTH_URL}?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_CALLBACK_URL}&access_type=offline&response_type=code&state=${state}&scope=${scopes}`;
    res.redirect(GOOGLE_OAUTH_CONSENT_SCREEN_URL);
});
/* app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email']
    })
); */

app.get("/google/callback", async (req, res) => {
    try {
        console.log("Received callback with query:", req.query);

        const { code } = req.query;
        if (!code) {
            return res.status(400).send("Authorization code missing");
        }

        const data = {
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: "http://localhost:8099/google/callback", // Make sure port matches your server
            grant_type: "authorization_code"
        };

        console.log("Requesting token with data:", data);

        // Exchange code for tokens
        const response = await fetch(GOOGLE_ACCESS_TOKEN_URL, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Token exchange failed:", errorData);
            return res.status(response.status).send("Failed to exchange code for token");
        }

        const tokenData = await response.json();
        console.log("Received token data:", tokenData);

        // Get user info using access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        if (!userInfoResponse.ok) {
            console.error("Failed to get user info:", await userInfoResponse.text());
            return res.status(userInfoResponse.status).send("Failed to get user info");
        }

        const userInfo = await userInfoResponse.json();
        
        // Store user info in session
        req.session.user = userInfo;
        
        // Redirect to your app's dashboard/home page
        res.redirect('/');

    } catch (error) {
        console.error("OAuth error:", error);
        res.status(500).send("Authentication failed");
    }
});

/* app.get('/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: '/content',
        failureRedirect: '/'
    })
); */
//=======================================================================================
//DB Control part
// Add these to your existing server.js imports
const { ObjectId } = require('mongodb');

// Handle Find Audio Files
const handle_Find = async (req, res) => {
    try {
        const audioFiles = await DatabaseHandler.findDocument(Audio, {});
        res.status(200).render('list', {
            nAudios: audioFiles.length,
            audios: audioFiles,
            user: req.user
        });
    } catch (err) {
        console.error('Find error:', err);
        res.status(500).render('info', {
            message: 'Error finding audio files',
            user: req.user
        });
    }
};

// Handle Edit Audio
const handle_Edit = async (req, res, criteria) => {
    try {
        const audioFile = await DatabaseHandler.findDocument(Audio, {
            _id: new ObjectId(criteria._id)
        });

        if (audioFile.length > 0) {
            res.status(200).render('edit', {
                audio: audioFile[0],
                user: req.user
            });
        } else {
            res.status(404).render('info', {
                message: 'Audio file not found!',
                user: req.user
            });
        }
    } catch (err) {
        console.error('Edit error:', err);
        res.status(500).render('info', {
            message: 'Error editing audio file',
            user: req.user
        });
    }
};

// In handle_Create
const handle_Create = async (req, res) => {
    try {

        console.log('Files received:', req.files); // Debug log
        const newAudio = {
            title: req.fields.title,
            artist: req.fields.artist,
            album: req.fields.album,
            genre: req.fields.genre,
            create_at: new Date(),
            update_at: new Date()
        };

        // Handle audio file upload
        if (req.files && req.files.audio_file) {
            console.log('Processing audio file:', req.files.audio_file); // Debug log
            
            const file = req.files.audio_file;
            const fileData = await readFile(file.path);
            newAudio.file_data = fileData;
            newAudio.file_name = file.originalFilename || file.name;
            newAudio.file_size = file.size;
            
            try {
                await unlink(file.path);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }

        // Handle cover image upload
        if (req.files && req.files.cover_image) {
            console.log('Processing cover image:', req.files.cover_image); // Debug log
            
            const imageFile = req.files.cover_image;
            const imageData = await readFile(imageFile.path);
            newAudio.cover_image = imageData.toString('base64');
            
            try {
                await unlink(imageFile.path);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }

        console.log('Saving audio document:', newAudio); // Debug log

        const result = await DatabaseHandler.insertDocument(Audio, newAudio);
        res.status(200).render('info', { 
            message: `Created new audio file: ${newAudio.title}`, 
            user: req.user 
        });
    } catch (err) {
        console.error('Create error:', err);
        res.status(500).render('info', { 
            message: 'Error creating audio file: ' + err.message, 
            user: req.user 
        });
    }
};


// In handle_Update
const handle_Update = async (req, res, criteria) => {
    try {
        // Only include fields that are actually being updated
        const updateDoc = {};

        // Update text fields if they exist
        if (req.fields.title) updateDoc.title = req.fields.title;
        if (req.fields.artist) updateDoc.artist = req.fields.artist;
        if (req.fields.album) updateDoc.album = req.fields.album;
        if (req.fields.genre) updateDoc.genre = req.fields.genre;
        updateDoc.update_at = new Date();

        // Handle audio file upload only if new file is provided
        if (req.files && req.files.audio_file && req.files.audio_file.size > 0) {
            const file = req.files.audio_file;
            const fileData = await readFile(file.path);
            updateDoc.file_data = fileData;
            updateDoc.file_name = file.originalFilename || file.name;
            updateDoc.file_size = file.size;
            
            try {
                await unlink(file.path);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }

        // Handle cover image upload only if new image is provided
        if (req.files && req.files.cover_image && req.files.cover_image.size > 0) {
            const imageFile = req.files.cover_image;
            const imageData = await readFile(imageFile.path);
            updateDoc.cover_image = imageData.toString('base64');
            
            try {
                await unlink(imageFile.path);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }

        console.log('Updating with:', { 
            ...updateDoc, 
            file_data: updateDoc.file_data ? '[FILE DATA]' : undefined,
            cover_image: updateDoc.cover_image ? '[IMAGE DATA]' : undefined
        });

        const results = await DatabaseHandler.updateDocument(
            Audio,
            { _id: new ObjectId(criteria._id) },
            updateDoc
        );

        res.status(200).render('info', { 
            message: `Updated audio file: ${updateDoc.title}`, 
            user: req.user 
        });
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).render('info', { 
            message: 'Error updating audio file: ' + err.message, 
            user: req.user 
        });
    }
};
// Handle Delete Audio
const handle_Delete = async (req, res) => {
    try {
        const audioFile = await DatabaseHandler.findDocument(Audio, {
            _id: new ObjectId(req.query._id)
        });

        if (audioFile.length > 0) {
            await DatabaseHandler.deleteDocument(Audio, {
                _id: new ObjectId(req.query._id)
            });
            res.status(200).render('info', {
                message: `Deleted audio file: ${audioFile[0].title}`,
                user: req.user
            });
        } else {
            res.status(404).render('info', {
                message: 'Audio file not found!',
                user: req.user
            });
        }
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).render('info', {
            message: 'Error deleting audio file',
            user: req.user
        });
    }
};

const validateAudioFile = (req, res, next) => {
    if (!req.fields || !req.fields.title || !req.fields.artist) {
        return res.status(400).render('info', { 
            message: 'Title and artist are required', 
            user: req.user 
        });
    }
    
    if (!req.files || !req.files.audio_file) {
        return res.status(400).render('info', { 
            message: 'Audio file is required', 
            user: req.user 
        });
    }
    
    next();
};


//=======================================================================================
// 根路由 
// app.get('/', isLoggedIn, async (req, res) => {
//     try {
//         let result = [];

//         result = await DatabaseHandler.findDocument(Audio, { filename: "test1" });  // Corrected
//         // result = await DatabaseHandler.insertDocument(Audio, {filename: "test2", data: "test2"}); // Corrected
//         // result = await DatabaseHandler.updateDocument(Audio, {filename: "test2"}, {filename: "test3"}); // Corrected
//         // result = await DatabaseHandler.deleteDocument(Audio, {filename: "test3"}); // Corrected

//         res.status(200).json(result).end();
//         // res.render('index', { result: result });
//     } catch (err) {
//         res.status(404).json(err.message).end();
//     }
// });
app.get("/", isLoggedIn, function (req, res) {
    res.redirect('/content');
});
//Login Page
app.get("/login", function (req, res) {
    res.render("login");
});
// Content/List route
app.get("/content", isLoggedIn, async (req, res) => {
    try {
        // Use handle_Find function we created earlier
        await handle_Find(req, res);
    } catch (err) {
        console.error("Error in content route:", err);
        res.status(500).render('info', {
            message: 'Error loading audio list',
            user: req.user
        });
    }
});

// Create routes
app.get('/create', isLoggedIn, (req, res) => {
    res.status(200).render('create', { user: req.user });
});

app.post('/create', isLoggedIn, validateAudioFile, async (req, res) => {
    try {
        await handle_Create(req, res);
    } catch (err) {
        console.error('Route error:', err);
        res.status(500).render('info', { 
            message: 'Server error during file upload', 
            user: req.user 
        });
    }
});

// Details route
app.get('/details', isLoggedIn, async (req, res) => {
    try {
        const audioFile = await DatabaseHandler.findDocument(Audio, {
            _id: new ObjectId(req.query._id)
        });

        if (audioFile.length > 0) {
            res.status(200).render('details', {
                audio: audioFile[0],
                user: req.user
            });
        } else {
            res.status(404).render('info', {
                message: 'Audio file not found',
                user: req.user
            });
        }
    } catch (err) {
        console.error("Error in details route:", err);
        res.status(500).render('info', {
            message: 'Error loading audio details',
            user: req.user
        });
    }
});

// Edit routes
app.get('/edit', isLoggedIn, async (req, res) => {
    try {
        await handle_Edit(req, res, req.query);
    } catch (err) {
        console.error("Error in edit route:", err);
        res.status(500).render('info', {
            message: 'Error loading edit form',
            user: req.user
        });
    }
});

app.post('/update', isLoggedIn, validateAudioFile, async (req, res) => {
    try {
        const criteria = { _id: req.fields._id };
        await handle_Update(req, res, criteria);
    } catch (err) {
        console.error("Error in update route:", err);
        res.status(500).render('info', {
            message: 'Error updating audio file',
            user: req.user
        });
    }
});

// Delete route
app.get('/delete', isLoggedIn, async (req, res) => {
    try {
        await handle_Delete(req, res);
    } catch (err) {
        console.error("Error in delete route:", err);
        res.status(500).render('info', {
            message: 'Error deleting audio file',
            user: req.user
        });
    }
});

// Logout route (no changes needed)
app.get("/logout", function (req, res, next) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/login');
    });
});
// ------------------------
// Add these routes to handle audio playback and download
// Add route to stream audio
app.get('/audio/:id', isLoggedIn, async (req, res) => {
    try {
        const audioFile = await DatabaseHandler.findDocument(Audio, {
            _id: new ObjectId(req.params.id)
        });

        if (!audioFile || audioFile.length === 0 || !audioFile[0].file_data) {
            return res.status(404).send('Audio file not found');
        }

        // Set the content type and headers for audio streaming
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioFile[0].file_data.length,
            'Accept-Ranges': 'bytes'
        });

        res.send(audioFile[0].file_data);
    } catch (err) {
        console.error('Audio streaming error:', err);
        res.status(500).send('Error streaming audio');
    }
});

// Add route to download audio
app.get('/download/:id', isLoggedIn, async (req, res) => {
    try {
        const audioFile = await DatabaseHandler.findDocument(Audio, {
            _id: new ObjectId(req.params.id)
        });

        if (!audioFile || audioFile.length === 0 || !audioFile[0].file_data) {
            return res.status(404).send('Audio file not found');
        }

        // Set headers for file download
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="${audioFile[0].file_name}"`,
            'Content-Length': audioFile[0].file_data.length
        });

        res.send(audioFile[0].file_data);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).send('Error downloading file');
    }
});
//=========================
// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行在 http://localhost:${PORT}`);
});

