// =============================================
// 情侣系统 - 后端服务器
// =============================================

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT || 3000;
// =============================================
// 中间件
// =============================================
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/photos', express.static(path.join(__dirname, '../photos')));
app.use(express.static(path.join(__dirname, '../frontend')));

// =============================================
// 用户认证 API
// =============================================

// ----- 用户注册 -----
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        // 检查是否为空
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }
        
        // 检查用户名是否已存在
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: '用户名已存在，请换一个吧 💕'
            });
        }
        
        // 插入新用户（密码先明文存储，后续可加密）
        await pool.execute(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            [username, password, email || '']
        );
        
        res.json({
            success: true,
            message: '🎉 注册成功！欢迎来到我们的世界 💕'
        });
        
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({
            success: false,
            message: '注册失败：' + error.message
        });
    }
});

// ----- 用户登录 -----
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '请输入用户名和密码'
            });
        }
        
        // 查询用户
        const [users] = await pool.execute(
            'SELECT id, username, email FROM users WHERE username = ? AND password = ?',
            [username, password]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '❌ 用户名或密码错误，再想想 💕'
            });
        }
        
        const user = users[0];
        
        res.json({
            success: true,
            message: '💕 登录成功！欢迎回来 ' + user.username,
            data: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            success: false,
            message: '登录失败：' + error.message
        });
    }
});

// ----- 修改密码 -----
app.post('/api/change-password', async (req, res) => {
    try {
        const { username, oldPassword, newPassword } = req.body;
        
        if (!username || !oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: '请填写完整信息'
            });
        }
        
        // 验证旧密码
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE username = ? AND password = ?',
            [username, oldPassword]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '❌ 旧密码错误'
            });
        }
        
        // 更新密码
        await pool.execute(
            'UPDATE users SET password = ? WHERE username = ?',
            [newPassword, username]
        );
        
        res.json({
            success: true,
            message: '✅ 密码修改成功！'
        });
        
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({
            success: false,
            message: '修改失败：' + error.message
        });
    }
});
// =============================================
// 数据库连接池
// =============================================
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 测试数据库连接
async function testDBConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ 数据库连接成功！');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        console.error('请检查:');
        console.error('  1. MySQL 是否已启动');
        console.error('  2. .env 文件中的密码是否正确');
        console.error('  3. 数据库 love_system 是否已创建');
        return false;
    }
}

// =============================================
// API 路由
// =============================================

// ----- 测试接口 -----
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: '💕 服务器运行正常！',
        time: new Date().toLocaleString('zh-CN')
    });
});

// ----- 保存照片备注 -----
app.post('/api/photo/note', async (req, res) => {
    try {
        const { photoId, note } = req.body;
        
        if (!photoId) {
            return res.status(400).json({ 
                success: false, 
                message: '缺少 photoId 参数' 
            });
        }

        // 检查照片是否存在
        const [existing] = await pool.execute(
            'SELECT id FROM photos WHERE id = ?',
            [photoId]
        );

        if (existing.length > 0) {
            // 更新备注
            await pool.execute(
                'UPDATE photos SET note = ?, updated_at = NOW() WHERE id = ?',
                [note || '', photoId]
            );
        } else {
            // 插入新照片
            await pool.execute(
                'INSERT INTO photos (id, note, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
                [photoId, note || '']
            );
        }

        res.json({
            success: true,
            message: '✅ 备注保存成功！',
            data: { photoId, note }
        });

    } catch (error) {
        console.error('保存备注失败:', error);
        res.status(500).json({
            success: false,
            message: '保存失败：' + error.message
        });
    }
});

// ----- 获取所有照片备注 -----
app.get('/api/photos/notes', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, note, updated_at FROM photos ORDER BY id'
        );
        
        const notesMap = {};
        rows.forEach(row => {
            notesMap[row.id] = row.note || '';
        });

        res.json({
            success: true,
            data: notesMap
        });

    } catch (error) {
        console.error('获取备注失败:', error);
        res.status(500).json({
            success: false,
            message: '获取失败：' + error.message
        });
    }
});

// ----- 健康检查 -----
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});


// ----- 获取所有照片列表 -----
app.get('/api/photos/list', async (req, res) => {
    try {
        console.log('📸 获取照片列表...');
        const [rows] = await pool.execute(
            'SELECT id, note, category, taken_date, created_at, updated_at FROM photos ORDER BY id'
        );
        console.log('✅ 获取到 ' + rows.length + ' 张照片');
        res.json({ 
            success: true, 
            data: { photos: rows, files: [] } 
        });
    } catch (error) {
        console.error('❌ 获取照片列表失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取失败：' + error.message 
        });
    }
});

// ----- 上传照片（支持分类和拍摄日期） -----
app.post('/api/photos/upload', async (req, res) => {
    try {
        console.log('📤 收到上传请求...');
        const { file, note, category, taken_date } = req.body;
        
        if (!file) {
            return res.status(400).json({ success: false, message: '请选择照片' });
        }
        
        // 获取最大ID
        const [maxId] = await pool.execute('SELECT MAX(id) as maxId FROM photos');
        const newId = (maxId[0].maxId || 0) + 1;
        console.log('📸 新照片ID:', newId);
        
        // 保存图片到文件夹
        const photosDir = path.join(__dirname, '../photos');
        if (!fs.existsSync(photosDir)) {
            fs.mkdirSync(photosDir, { recursive: true });
        }
        const fileName = `${newId}.jpg`;
        const filePath = path.join(photosDir, fileName);
        const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, base64Data, 'base64');
        console.log('💾 图片已保存:', filePath);
        
        // 插入数据库
        const finalCategory = category || '默认';
        const finalNote = note || '💕 新照片';
        const finalDate = taken_date || null;
        
        console.log('📝 插入数据:', { id: newId, note: finalNote, category: finalCategory, taken_date: finalDate });
        
        await pool.execute(
            'INSERT INTO photos (id, note, category, taken_date, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [newId, finalNote, finalCategory, finalDate]
        );
        
        console.log('✅ 照片上传成功，ID:', newId);
        
        res.json({ 
            success: true, 
            message: '📸 照片上传成功！', 
            data: { id: newId, url: `/photos/${fileName}` } 
        });
    } catch (error) {
        console.error('❌ 上传失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '上传失败：' + error.message 
        });
    }
});

// ----- 更新情书 -----
app.put('/api/letters/:id', async (req, res) => {
    console.log('🔵 收到情书更新请求, ID:', req.params.id);
    console.log('🔵 请求体:', req.body);
    try {
        const { id } = req.params;
        const { title, content, mood, weather, location, is_public } = req.body;
        
        console.log('📝 更新情书 ID:', id);
        console.log('   title:', title);
        console.log('   content:', content ? content.substring(0, 50) + '...' : '');
        
        const [result] = await pool.execute(
            'UPDATE love_letters SET title = ?, content = ?, mood = ?, weather = ?, location = ?, is_public = ? WHERE id = ?',
            [title, content, mood || '😊', weather || '☀️', location || '', is_public || false, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '情书不存在'
            });
        }
        
        res.json({
            success: true,
            message: '✅ 情书已更新！'
        });
    } catch (error) {
        console.error('❌ 更新情书失败:', error);
        res.status(500).json({
            success: false,
            message: '更新失败：' + error.message
        });
    }
});
// ----- 获取所有分类 -----
app.get('/api/photos/categories', async (req, res) => {
    try {
        console.log('📁 获取分类列表...');
        const [rows] = await pool.execute('SELECT DISTINCT category FROM photos ORDER BY category');
        console.log('✅ 获取到 ' + rows.length + ' 个分类');
        res.json({ 
            success: true, 
            data: rows.map(r => r.category) 
        });
    } catch (error) {
        console.error('❌ 获取分类失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取失败：' + error.message 
        });
    }
});

// ----- 删除照片 -----
app.delete('/api/photos/:id', async (req, res) => {
    try {
        const photoId = parseInt(req.params.id);
        console.log('🗑️ 删除照片 ID:', photoId);
        
        // 从数据库删除
        await pool.execute('DELETE FROM photos WHERE id = ?', [photoId]);
        
        // 从文件夹删除图片
        const photosDir = path.join(__dirname, '../photos');
        const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        for (const ext of extensions) {
            const filePath = path.join(photosDir, `${photoId}.${ext}`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('🗑️ 已删除图片文件:', filePath);
                break;
            }
        }
        
        console.log('✅ 照片删除成功');
        res.json({ success: true, message: '🗑️ 照片已删除' });
    } catch (error) {
        console.error('❌ 删除失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '删除失败：' + error.message 
        });
    }
});
// =============================================
// 纪念日 API
// =============================================
// ----- 获取所有纪念日 -----
app.get('/api/anniversaries', async (req, res) => {
    try {
        const { user_id } = req.query;
        let query = 'SELECT * FROM anniversaries';
        const params = [];
        
        if (user_id) {
            query += ' WHERE user_id = ?';
            params.push(user_id);
        }
        
        query += ' ORDER BY event_date DESC';
        
        const [rows] = await pool.execute(query, params);
        
        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const results = rows.map(row => {
            const eventDate = new Date(row.event_date);
            const eventMonth = eventDate.getMonth();
            const eventDay = eventDate.getDate();
            const eventYear = eventDate.getFullYear();
            
            // ---- 计算从最初日期到今天的总天数 ----
            const originalDate = new Date(eventYear, eventMonth, eventDay);
            const diffTime = todayDate - originalDate;
            const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // ---- 计算下一个纪念日 ----
            // 今年的纪念日
            let nextDate = new Date(today.getFullYear(), eventMonth, eventDay);
            
            // 如果今年的已经过了，则计算明年的
            if (nextDate < todayDate) {
                nextDate = new Date(today.getFullYear() + 1, eventMonth, eventDay);
            }
            
            // 如果是今天
            const isToday = nextDate.getTime() === todayDate.getTime();
            
            // 计算距离下一个纪念日还有多少天
            const diffToNext = Math.ceil((nextDate - todayDate) / (1000 * 60 * 60 * 24));
            
            // ---- 判断是否即将到来（未来30天内） ----
            const isUpcoming = diffToNext > 0 && diffToNext <= 30;
            
            // ---- 生成显示文本 ----
            let daysDisplay, daysLabel;
            
            if (isToday) {
                daysDisplay = '🎉';
                daysLabel = '就是今天！';
            } else if (diffToNext > 0) {
                // 未来的纪念日
                daysDisplay = diffToNext;
                daysLabel = `还有 ${diffToNext} 天`;
            } else {
                // 已过的纪念日（显示已过天数）
                const daysAgo = Math.abs(daysPassed);
                daysDisplay = daysAgo;
                daysLabel = `${daysAgo} 天前`;
            }
            
            return {
                ...row,
                days_passed: daysPassed,
                days_to_next: diffToNext,
                days_display: daysDisplay,
                days_label: daysLabel,
                is_today: isToday,
                is_upcoming: isUpcoming,
                next_date: nextDate.toISOString().split('T')[0],
                event_date_formatted: originalDate.toISOString().split('T')[0]
            };
        });
        
        console.log('📅 返回纪念日数据:', results.length + ' 条');
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('获取纪念日失败:', error);
        res.status(500).json({
            success: false,
            message: '获取失败：' + error.message
        });
    }
});

// ----- 创建纪念日 -----
app.post('/api/anniversaries', async (req, res) => {
    try {
        const { user_id, title, event_date, category, reminder_days, is_important } = req.body;
        
        if (!user_id || !title || !event_date) {
            return res.status(400).json({
                success: false,
                message: '请填写完整信息'
            });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO anniversaries (user_id, title, event_date, category, reminder_days, is_important) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, title, event_date, category || '纪念日', reminder_days || 0, is_important || false]
        );
        
        res.json({
            success: true,
            message: '🎉 纪念日添加成功！',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('添加纪念日失败:', error);
        res.status(500).json({
            success: false,
            message: '添加失败：' + error.message
        });
    }
});

// ----- 更新纪念日 -----
app.put('/api/anniversaries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, event_date, category, reminder_days, is_important } = req.body;
        
        const [result] = await pool.execute(
            'UPDATE anniversaries SET title = ?, event_date = ?, category = ?, reminder_days = ?, is_important = ? WHERE id = ?',
            [title, event_date, category, reminder_days || 0, is_important || false, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '纪念日不存在'
            });
        }
        
        res.json({
            success: true,
            message: '✅ 纪念日更新成功！'
        });
    } catch (error) {
        console.error('更新纪念日失败:', error);
        res.status(500).json({
            success: false,
            message: '更新失败：' + error.message
        });
    }
});

// ----- 删除纪念日 -----
app.delete('/api/anniversaries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await pool.execute(
            'DELETE FROM anniversaries WHERE id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '纪念日不存在'
            });
        }
        
        res.json({
            success: true,
            message: '🗑️ 纪念日已删除'
        });
    } catch (error) {
        console.error('删除纪念日失败:', error);
        res.status(500).json({
            success: false,
            message: '删除失败：' + error.message
        });
    }
});
// =============================================
// 情书 API
// =============================================

// ----- 获取所有情书 -----
app.get('/api/letters', async (req, res) => {
    try {
        const { user_id } = req.query;
        let query = 'SELECT * FROM love_letters';
        const params = [];
        
        if (user_id) {
            query += ' WHERE user_id = ?';
            params.push(user_id);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [rows] = await pool.execute(query, params);
        
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('获取情书失败:', error);
        res.status(500).json({
            success: false,
            message: '获取失败：' + error.message
        });
    }
});

// ----- 获取单封情书 -----
app.get('/api/letters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.execute(
            'SELECT * FROM love_letters WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '情书不存在'
            });
        }
        
        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('获取情书失败:', error);
        res.status(500).json({
            success: false,
            message: '获取失败：' + error.message
        });
    }
});

// ----- 创建情书 -----
app.post('/api/letters', async (req, res) => {
    try {
        const { user_id, title, content, mood, weather, location, is_public } = req.body;
        
        if (!user_id || !title || !content) {
            return res.status(400).json({
                success: false,
                message: '请填写完整信息'
            });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO love_letters (user_id, title, content, mood, weather, location, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, title, content, mood || '😊', weather || '☀️', location || '', is_public || false]
        );
        
        res.json({
            success: true,
            message: '💌 情书已保存！',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('创建情书失败:', error);
        res.status(500).json({
            success: false,
            message: '创建失败：' + error.message
        });
    }
});

// ----- 更新情书 -----
app.put('/api/letters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, mood, weather, location, is_public } = req.body;
        
        const [result] = await pool.execute(
            'UPDATE love_letters SET title = ?, content = ?, mood = ?, weather = ?, location = ?, is_public = ? WHERE id = ?',
            [title, content, mood || '😊', weather || '☀️', location || '', is_public || false, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '情书不存在'
            });
        }
        
        res.json({
            success: true,
            message: '✅ 情书已更新！'
        });
    } catch (error) {
        console.error('更新情书失败:', error);
        res.status(500).json({
            success: false,
            message: '更新失败：' + error.message
        });
    }
});

// ----- 删除情书 -----
app.delete('/api/letters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await pool.execute(
            'DELETE FROM love_letters WHERE id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '情书不存在'
            });
        }
        
        res.json({
            success: true,
            message: '🗑️ 情书已删除'
        });
    } catch (error) {
        console.error('删除情书失败:', error);
        res.status(500).json({
            success: false,
            message: '删除失败：' + error.message
        });
    }
});

// =============================================
// 启动服务器
// =============================================
app.listen(PORT, async () => {
    console.log(`\n💕 ===== 情侣系统服务器 =====`);
    console.log(`🚀 服务地址: http://localhost:${PORT}`);
    console.log(`📡 API测试: http://localhost:${PORT}/api/test`);
    console.log(`❤️ 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`\n⏳ 正在连接数据库...`);
    await testDBConnection();
    console.log(`============================\n`);
});

// 优雅退出
process.on('SIGINT', async () => {
    console.log('\n🛑 正在关闭服务器...');
    await pool.end();
    process.exit(0);
});
