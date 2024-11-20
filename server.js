// 導入依賴
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

// 創建依賴實體
const app = express();

// 創建配置參數
const PORT = process.env.PORT || 3000;

// 設置模板引擎
app.set('view engine', 'ejs');
app.set('views', './views'); // 設置視圖文件夾

// 設置中間件
app.use(bodyParser.urlencoded({ extended: true })); // 解析 url 編碼格式請求體
app.use(bodyParser.json());
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
    res.status(404).send('404 Not Found').end();
});

// ------------------------

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行在 http://localhost:${PORT}`);
});

