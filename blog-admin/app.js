require('dotenv').config();
const path = require('path'), crypto = require('crypto');
const express = require('express'), cors = require('cors'), multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');

const PASS = process.env.ADMIN_PASSWORD || '';
if (PASS.length < 8) { console.error('Set ADMIN_PASSWORD (8+ characters).'); if (require.main === module) process.exit(1); }

const URI = process.env.MONGODB_URI || '';
if (!URI) { console.error('Set MONGODB_URI (your MongoDB Atlas connection string).'); if (require.main === module) process.exit(1); }

/* Hosted database (MongoDB Atlas). The connection is cached so serverless
   invocations on Vercel reuse it instead of reconnecting every time. */
function getPosts() {
  if (!global._postsCol) {
    global._postsCol = new MongoClient(URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 }).connect()
      .then(async client => {
        const col = client.db(process.env.MONGODB_DB || 'heritage_blog').collection('posts');
        await col.createIndex({ date: -1 });
        return col;
      })
      .catch(err => { global._postsCol = null; throw err; });   // allow a retry next request
  }
  return global._postsCol;
}
const toId = id => {
  if (!/^[a-f\d]{24}$/i.test(String(id))) throw new HttpError(404, 'Post not found.');
  return new ObjectId(String(id));
};

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const wrap = fn => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next);

const app = express();
app.use('/api/posts', cors({ methods: ['GET'] }));   // public read-only feed

const same = (a, b) => crypto.timingSafeEqual(
  crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());

function auth(req, res, next) {
  const [user, pass] = Buffer.from((req.headers.authorization || '').split(' ')[1] || '', 'base64').toString().split(/:(.*)/s);
  const ok = user && same(user, 'admin') && same(pass || '', PASS);
  const csrfOk = req.method === 'GET' || req.get('X-Requested-With') === 'admin';   // blocks cross-site form posts
  if (ok && csrfOk) return next();
  res.set('WWW-Authenticate', 'Basic realm="Heritage Crops Admin"').status(401).send('Login required');
}

/* Photos are held in memory, then sent to ImageKit (Vercel has no permanent disk).
   Vercel limits request bodies to ~4.5 MB; the admin page shrinks photos before upload. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (r, f, cb) => /^image\/(jpeg|png|webp|gif)$/.test(f.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Photo must be a JPG, PNG, WebP or GIF.'))
});

async function uploadToImageKit(file) {
  const key = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!key) throw new HttpError(400, 'Photo upload is not set up yet. Paste a photo link instead, or set IMAGEKIT_PRIVATE_KEY.');
  const name = crypto.randomBytes(6).toString('hex') + '-' + file.originalname.replace(/[^\w.-]/g, '_');
  const fd = new FormData();
  fd.append('file', new Blob([file.buffer], { type: file.mimetype }), name);
  fd.append('fileName', name);
  fd.append('folder', process.env.IMAGEKIT_FOLDER || '/HeritageCrops/blogs');
  fd.append('useUniqueFileName', 'true');
  const r = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64') }, body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new HttpError(502, 'Photo upload failed: ' + (j.message || r.status));
  return j.url;
}

async function readFields(req) {
  const b = req.body, t = s => String(s || '').trim();
  const f = { title: t(b.title).slice(0, 160), category: t(b.category).slice(0, 60), excerpt: t(b.excerpt).slice(0, 500), url: t(b.url), date: t(b.date) };
  if (!f.title || !f.category || !f.excerpt) throw new HttpError(400, 'Title, category and excerpt are required.');
  if (!/^https:\/\//i.test(f.url)) throw new HttpError(400, 'Post link must start with https://');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) throw new HttpError(400, 'Please choose a date.');
  f.image = t(b.image_url);
  if (f.image && !/^https:\/\//i.test(f.image)) throw new HttpError(400, 'Photo link must start with https://');
  if (req.file) f.image = await uploadToImageKit(req.file);   // an uploaded photo wins over a pasted link
  return f;
}

app.get('/api/posts', wrap(async (req, res) => {
  const posts = await getPosts();
  const rows = await posts.find({}).sort({ date: -1, _id: -1 }).toArray();
  res.set('Cache-Control', 'public, max-age=0, s-maxage=30').json(rows.map(d => ({
    id: String(d._id), title: d.title, category: d.category, excerpt: d.excerpt, url: d.url, image: d.image || '', date: d.date })));
}));

app.post('/api/posts', auth, upload.single('image'), wrap(async (req, res) => {
  const f = await readFields(req);
  const r = await (await getPosts()).insertOne({ ...f, createdAt: new Date() });
  res.status(201).json({ id: String(r.insertedId) });
}));

app.put('/api/posts/:id', auth, upload.single('image'), wrap(async (req, res) => {
  const _id = toId(req.params.id), posts = await getPosts();
  const old = await posts.findOne({ _id }, { projection: { image: 1 } });
  if (!old) throw new HttpError(404, 'Post not found.');
  const f = await readFields(req);
  if (!f.image) f.image = old.image || '';   // keep current photo if none supplied
  await posts.updateOne({ _id }, { $set: f });
  res.json({ ok: true });
}));

app.delete('/api/posts/:id', auth, wrap(async (req, res) => {
  await (await getPosts()).deleteOne({ _id: toId(req.params.id) });
  res.json({ ok: true });
}));

app.get('/admin', auth, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.redirect('/admin'));

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') err = new HttpError(400, 'Photo is too large (max 4 MB).');
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error. Please try again.' });
});

module.exports = app;
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Blog admin running → http://localhost:${PORT}/admin`));
}
