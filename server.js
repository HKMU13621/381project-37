// 導入依賴
const express = require('express');
const session = require('express-session');
const formidable = require('express-formidable');
const ffsmpeg = require('fluent-ffmpeg');

// 導入文件
const Audio = require('./models/audioModel');
const DatabaseHandler = require('./lib/mongodbHandler');

// 創建配置參數
const PORT = process.env.PORT || 3000;



// 創建依賴實體
const app = express();



// 設置模板引擎
app.set('view engine', 'ejs');
app.set('views', './views');

// 設置中間件
app.use(formidable());
app.use(session({ // 設置會話規則
    name: 'session',
    secret: 'COMPS381F_GROUPPROJECT',
    keys: ['key1', 'key2', 'key3'],
    resave: false,
    saveUninitialized: true
}));
app.use('/public', express.static('public'));


// 根路由 
app.get('/', async (req, res) => {
    try {
        await DatabaseHandler.connect();
        await DatabaseHandler.disconnect();
        //res.status(200).json({ message: 'Connected to MongoDB' }).end();
        res.render('index', { message: 'Connected to MongoDB' });
    } catch (err) {
        res.status(404).send('404 Not Found').end();
    }
});

// ------------------------

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行在 http://localhost:${PORT}`);
});

