# Heritage Crops – Blog Admin (Vercel + MongoDB Atlas + ImageKit)

## 1. Create the database (MongoDB Atlas, free tier)
1. cloud.mongodb.com → create a free cluster.
2. Database Access → add a user (username + password).
3. Network Access → Add IP Address → **Allow access from anywhere (0.0.0.0/0)**
   (Vercel uses changing IP addresses, so a fixed IP list won't work).
4. Connect → Drivers → copy the connection string and put your user/password in it.

## 2. Get your ImageKit private key
ImageKit dashboard → Developer options → copy the **Private key**.

## 3. Test on your computer (optional)
    npm install
    copy .env.example .env      (fill in the values)
    npm start                   → http://localhost:3000/admin

## 4. Deploy to Vercel
1. Put this folder in a GitHub repo (`.env` is git-ignored — never upload it).
2. vercel.com → Add New → Project → import the repo → Deploy.
3. Settings → Environment Variables, add:
   ADMIN_PASSWORD, MONGODB_URI, IMAGEKIT_PRIVATE_KEY
   (optional: MONGODB_DB, IMAGEKIT_FOLDER). Then Redeploy.
4. Admin: https://YOUR-PROJECT.vercel.app/admin   (user: admin)

## 5. Connect the website
In index.html set the blog list's address (no trailing slash):
    data-news-api="https://YOUR-PROJECT.vercel.app"
