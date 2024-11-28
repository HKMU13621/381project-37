//==============================================================================================
// dependencies setup

const PORT = process.env.PORT || 8099;

const express = require('express');
const session = require('express-session');
const formidable = require('express-formidable');
// const ffsmpeg = require('fluent-ffmpeg');
const passport = require('passport');// Use Passport Middleware
// const fs = require('fs').promises;  // Correct fs.promises import at the top level
const dotenv = require('dotenv');
// const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

const util = require('util');
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);

const User = require('./models/userModel');  // Add this with your other imports
const bcrypt = require('bcrypt');  // Don't forget to install this: npm install bcrypt
const Audio = require('./models/audioModel');
const DatabaseHandler = require('./lib/mongodbHandler');
const uploadDir = path.join(__dirname, 'uploads');

const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const { ObjectId } = require('mongodb');
const { type } = require('os');

//==============================================================================================
// environment variables setup

dotenv.config(); // Load environment variables from .env file

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL;



const facebookAuth = {
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: FACEBOOK_CALLBACK_URL
};

const googleAuth = {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL
};


const app = express();

//==============================================================================================
// Middleware setup

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
app.use(session({
    secret: 'COMPS381F_GROUPPROJECT',
    resave: false,
    saveUninitialized: true,
    cookie: {         secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours}// 在生产环境中，使用 HTTPS 时应设置为 true
     } 
}));


app.use(passport.initialize());
app.use(passport.session());

app.use('/public', express.static('public'));




//==============================================================================================
// OAUTH setup
// Passport needs the following setup to save user data after authentication in the session:
// initialize passposrt and and session for persistent login sessions


var user = {};  // user object to be put in session

// passport needs ability to serialize and unserialize users out of session
// Passport uses serializeUser function to persist user data (after successful authentication) into session. 
// Function deserializeUser is used to retrieve user data from session.


// passport facebook strategy
passport.use(new FacebookStrategy({
    "clientID": facebookAuth.clientID,
    "clientSecret": facebookAuth.clientSecret,
    "callbackURL": facebookAuth.callbackURL
}, function (token, refreshToken, profile, done) {
    //console.log("Facebook Profile: " + JSON.stringify(profile));
    //console.log("Facebook Profile: ");
    //console.log(profile);

    const user = {
        id: profile.id,
        name: profile.displayName,
        type: profile.provider
    }


    //console.log('user object: ' + JSON.stringify(user));
    return done(null, user);
})
);

passport.use(new GoogleStrategy({
    "clientID": googleAuth.clientID,
    "clientSecret": googleAuth.clientSecret,
    "callbackURL": googleAuth.callbackURL
}, function (token, refreshToken, profile, done) {
    //console.log("Google Profile: ");
    // console.log(profile);

    const user = {
        id: profile.id,
        name: profile.displayName,
        type: profile.provider
    };

    // console.log('user object: ' + JSON.stringify(user));
    return done(null, user);
})
);

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});





//=======================================================================================
//DB Control part
// Add these to your existing server.js imports



// Handle Find Audio Files
/* const handle_Find = async (req, res) => {
    try {
        const audioFiles = await DatabaseHandler.findDocument(Audio, {});
        res.status(200).render('list', {
            nAudios: audioFiles.length,
            audios: audioFiles,
            user: req.session.passport.user
        });
    } catch (err) {
        console.error('Find error:', err);
        res.status(500).render('info', {
            message: 'Error finding audio files',
            user: req.user
        });
    }
};
 */
const handle_Find = async (req, res) => {
    try {
        const audioFiles = await DatabaseHandler.findDocument(Audio, {});
        // Get user from either passport or session
        const user = req.session.passport?.user || req.session.user;
        
        // console.log('Current user in handle_Find:', user); // Debug log

        if (!user) {
            return res.redirect('/login');
        }

        res.status(200).render('list', {
            nAudios: audioFiles.length || 0,
            audios: audioFiles || [],
            user: user
        });
    } catch (err) {
        console.error('Find error:', err);
        const user = req.session.passport?.user || req.session.user;
        res.status(500).render('info', {
            message: 'Error finding audio files',
            user: user
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
const handle_Create = async (req, res, serviceType = "WEB_SERVICE") => {
    try {

        // console.log('Files received:', req.files); // Debug log
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
            
            // console.log('Processing audio file:', req.files.audio_file); // Debug log

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
            // console.log('Processing cover image:', req.files.cover_image); // Debug log

            const imageFile = req.files.cover_image;
            const imageData = await readFile(imageFile.path);
            newAudio.cover_image = imageData.toString('base64');

            try {
                await unlink(imageFile.path);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }


        // console.log('Saving audio document:', newAudio); // Debug log

        const result = await DatabaseHandler.insertDocument(Audio, newAudio);

        if (serviceType === "WEB_SERVICE") {
            res.status(200).render('info', {
                message: `Created new audio file: ${newAudio.title}`,
                user: req.user
            });
        } else if (serviceType === "RESTFUL_SERVICE") {
            res.status(201).json(result).end();
        }

    } catch (err) {
        console.error('Create error:', err);

        if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            for (const file of files) {
                const filePath = path.join(uploadDir, file);
                fs.rmSync(filePath, { recursive: true, force: true });
            }
        }

        res.status(500).render('info', {
            message: 'Error creating audio file: ' + err.message,
            user: req.user
        });
    }
};


// In handle_Update
const handle_Update = async (req, res, criteria, serviceType = "WEB_SERVICE") => {
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
        
        // console.log('Updating with:', {
        //     ...updateDoc,
        //     file_data: updateDoc.file_data ? '[FILE DATA]' : undefined,
        //     cover_image: updateDoc.cover_image ? '[IMAGE DATA]' : undefined
        // });

        const results = await DatabaseHandler.updateDocument(
            Audio,
            { _id: new ObjectId(criteria._id) },
            updateDoc
        );

        if (serviceType === "WEB_SERVICE") {
            res.status(200).render('info', {
                message: `Updated audio file: ${updateDoc.title}`,
                user: req.user
            });
        } else if (serviceType === "RESTFUL_SERVICE") {
            res.status(200).json(results).end();
        }

    } catch (err) {
        console.error('Update error:', err);

        if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            for (const file of files) {
                const filePath = path.join(uploadDir, file);
                fs.rmSync(filePath, { recursive: true, force: true });
            }
        }

        res.status(500).render('info', {
            message: 'Error updating audio file: ' + err.message,
            user: req.user
        });
    }
};

// Handle Delete Audio
const handle_Delete = async (req, res, criteria, serviceType = "WEB_SERVICE") => {
    try {
        const audioFile = await DatabaseHandler.findDocument(Audio, {
            _id: new ObjectId(criteria)
        });

        if (audioFile.length > 0) {
            await DatabaseHandler.deleteDocument(Audio, {
                _id: new ObjectId(criteria)
            });
            if (serviceType === "RESTFUL_SERVICE") {
                return res.status(204).end();
            } else if (serviceType === "WEB_SERVICE") {
                res.status(200).render('info', {
                    message: `Deleted audio file: ${audioFile[0].title}`,
                    user: req.user
                });
            }
        } else {
            if (serviceType === "RESTFUL_SERVICE") {
                return res.status(404).json({ error: 'Audio file not found' }).end();
            } else if (serviceType === "WEB_SERVICE") {
                res.status(404).render('info', {
                    message: 'Audio file not found!',
                    user: req.user
                });
            }
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
// App routes functions (Web Services)

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

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated() || req.session || req.session.user) {
        return next();
    }
    res.redirect('/login');
}


app.get("/", isLoggedIn, function (req, res) {
    res.redirect('/content');
});

//Login Page
app.get("/login", function (req, res) {
    res.render("login");
});
app.get("/register", function (req, res) {
    res.render("register");
});
// Update the login route
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.fields;
        
        // Find user
        const users = await DatabaseHandler.findDocument(User, {
            $or: [
                { username: username },
                { email: username }
            ]
        });

        if (!users || users.length === 0) {
            return res.render('login', { error: 'User not found' });
        }

        const user = users[0];

        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.render('login', { error: 'Invalid password' });
        }

        // Set user in session
        req.session.user = {
            id: user._id.toString(),
            name: user.username,
            type: 'local'
        };
        // console.log('Setting session user:', req.session.user); // Debug log

        // Save session before redirect
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('login', { error: 'Login failed' });
            }
            // console.log('Session saved:', req.session);
            res.redirect('/content');
        });
    } catch (err) {
        console.error('Login error:', err);
        res.render('login', { error: 'Login failed: ' + err.message });
    }
});
// Update the registration route to also set the proper user info
app.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirm_password } = req.fields;

        if (password !== confirm_password) {
            return res.render('register', { error: 'Passwords do not match' });
        }

        // Check if user exists
        const existingUser = await DatabaseHandler.findDocument(User, {
            $or: [
                { username: username },
                { email: email }
            ]
        });

        if (existingUser && existingUser.length > 0) {
            return res.render('register', { error: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = await DatabaseHandler.insertDocument(User, {
            username,
            email,
            password: hashedPassword,
            type: 'local',  // Add type field
            created_at: new Date()
        });

        // Success message and redirect to login
        res.render('login', { message: 'Registration successful! Please login.' });

    } catch (err) {
        console.error('Registration error:', err);
        res.render('register', { error: 'Registration failed' });
    }
});

// Add a route to get user info
app.get('/user/info', isLoggedIn, (req, res) => {
    res.json({
        id: req.user.id,
        name: req.user.name,
        type: req.user.type
    });
});
// send to facebook to do the authentication
app.get("/auth/facebook", passport.authenticate("facebook", { scope: "email", session: true }));
// handle the callback after facebook has authenticated the user
app.get("/auth/facebook/callback",
    passport.authenticate("facebook", {
        successRedirect: "/content",
        failureRedirect: "/"
    })
);

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: true }));
app.get('/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: '/content',
        failureRedirect: '/'
    })
);

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
        await handle_Delete(req, res, req.query._id);
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

        
        // Prevent special character name errors
        const encodedFilename = encodeURIComponent(audioFile[0].file_name);

        // Set headers for file download
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="${encodedFilename}"`,
            'Content-Length': audioFile[0].file_data.length
        });

        res.send(audioFile[0].file_data);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).send('Error downloading file');
    }
});

//=======================================================================================
// App routes functions (Restful Services)


// curl -X GET http://localhost:8099/api/audio
app.get('/api/audio', async (req, res) => {
    try {
        const audioFiles = await DatabaseHandler.findDocument(Audio, {});
        res.status(200).json(audioFiles).end();
    } catch (err) {
        console.error('Route error:', err);
        res.status(500).json({ error: 'Server error' }).end();
    }
});

// curl -X GET http://localhost:8099/api/audio/67418e9dbda411689c0ad4bd
app.get('/api/audio/:id', async (req, res) => {
    try {
        const audioFiles = await DatabaseHandler.findDocument(Audio, { _id: new ObjectId(req.params.id) });
        res.status(200).json(audioFiles).end();

    } catch (err) {
        console.error('Route error:', err);
        res.status(500).json({ error: 'Server error' }).end();
    }
});

// curl -X POST http://localhost:8099/api/audio \
// -F "title=Test" \
// -F "artist=Test" \
// -F "album=Test" \
// -F "genre=Test" \
// -F "audio_file=@/Users/ncw500/Downloads/ROSE & Bruno Mars - APT. (Official Music Video).mp3" \
// -F "cover_image=@/Users/ncw500/Downloads/unnamed.jpg"

app.post('/api/audio', async (req, res) => {
    try {
        const result = await handle_Create(req, res, "RESTFUL_SERVICE");
        res.status(200).json(result).end();
    } catch (err) {
        console.error('Route error:', err);
        res.status(500).json({ error: 'Server error' }).end();
    }
});

// curl -X PUT http://localhost:8099/api/audio/67418e9dbda411689c0ad4bd \
// -F "title=Changed" \
// -F "artist=Changed" \
// -F "album=Changed" \
// -F "genre=Changed" \
// -F "audio_file=@/Users/ncw500/Downloads/ROSE & Bruno Mars - APT. (Official Music Video).mp3" \
// -F "cover_image=@/Users/ncw500/Downloads/unnamed.jpg"
app.put('/api/audio/:id', async (req, res) => {
    try {
        const criteria = { _id: req.params.id };
        await handle_Update(req, res, criteria, "RESTFUL_SERVICE");
    } catch (err) {
        console.error('Route error:', err);
        res.status(500).json({ error: 'Server error' }).end();
    }
});

// curl -X DELETE http://localhost:8099/api/audio/67418e9dbda411689c0ad4bd
app.delete('/api/audio/:id', async (req, res) => {
    try {
        await handle_Delete(req, res, req.params.id, "RESTFUL_SERVICE");
    } catch (err) {
        console.error('Route error:', err);
        res.status(500).json({ error: 'Server error' }).end();
    }
});


//=========================
// 啟動伺服器

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

