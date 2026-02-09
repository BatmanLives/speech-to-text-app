# ✅ DEPLOYMENT CHECKLIST

Print this out or keep it open while deploying!

---

## BEFORE YOU START
- [ ] Download the speech-to-text-app.tar.gz file
- [ ] Extract all files to a folder
- [ ] Have an email address ready for GitHub signup

---

## PHASE 1: GITHUB (5 minutes)

### If you DON'T have GitHub account:
- [ ] Go to https://github.com/signup
- [ ] Enter email, create password
- [ ] Verify email
- [ ] Complete signup

### If you HAVE GitHub account:
- [ ] Log in to https://github.com

### Upload Your Code:
- [ ] Click "+ New repository" (top right)
- [ ] Name: `speech-to-text-app`
- [ ] Select: Public
- [ ] Click "Create repository"
- [ ] Click "uploading an existing file"
- [ ] Drag ALL files from your extracted folder
- [ ] Click "Commit changes"

**✅ Checkpoint**: You should see all your files listed on GitHub

---

## PHASE 2: RENDER (5 minutes)

### Create Account:
- [ ] Go to https://render.com
- [ ] Click "Get Started for Free"
- [ ] Click "Sign up with GitHub"
- [ ] Authorize Render (click green button)

### Deploy Your App:
- [ ] Click "New +" button (top right)
- [ ] Select "Web Service"
- [ ] Find "speech-to-text-app" in list
- [ ] Click "Connect"

### Configure Service:
- [ ] Name: `speech-to-text-app` (or your choice)
- [ ] Region: Select closest to you
- [ ] Branch: `main`
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Instance Type: **Free**
- [ ] Click "Create Web Service"

**✅ Checkpoint**: You should see "Build starting..." in logs

---

## PHASE 3: WAIT & TEST (3-5 minutes)

### Watch the Build:
- [ ] See logs scrolling (green text = good)
- [ ] Wait for "Build succeeded"
- [ ] Wait for "Service is live"
- [ ] Status shows green "Live"

### Get Your URL:
- [ ] Look at top of page for URL
- [ ] Should look like: `https://speech-to-text-app-xxxx.onrender.com`
- [ ] Copy this URL

### Test Your App:
- [ ] Click the URL
- [ ] Click "Start Listening"
- [ ] Allow microphone when asked
- [ ] Say "Testing one two three"
- [ ] See your words appear!

**✅ Checkpoint**: App works and transcribes your speech

---

## 🎉 SUCCESS!

Your app is now:
- ✅ Live on the internet
- ✅ Accessible from any browser
- ✅ Has HTTPS (secure)
- ✅ Free to use

### Share Your URL:
```
https://your-app-name.onrender.com
```

---

## 🚨 TROUBLESHOOTING

### Build Failed?
- [ ] Check GitHub - all files uploaded?
- [ ] Look at error in Render logs
- [ ] Try "Manual Deploy" button

### Can't Hear/Record?
- [ ] Using HTTPS URL? (should start with https://)
- [ ] Allowed microphone permission?
- [ ] Try different browser (Chrome works best)

### Site Loading Slow?
- [ ] First load after sleep = slow (30-60 sec)
- [ ] This is normal on free tier
- [ ] Upgrade to paid = instant

---

## NEXT STEPS

### Want to make changes?
1. Edit files on GitHub
2. Render auto-deploys in 2-3 minutes
3. Refresh your URL to see changes

### Want custom domain?
1. Buy domain (e.g., yourdomain.com)
2. Render → Settings → Custom Domain
3. Add DNS records
4. Done!

### Want Azure diarization?
1. See AZURE_UPGRADE.md
2. Set up Azure Speech Service
3. Add API keys to Render
4. Get speaker identification!

---

## 📞 STUCK?

**Can't find something?**
- QUICKSTART.md = Super simple overview
- DEPLOYMENT.md = Detailed step-by-step
- AZURE_UPGRADE.md = Advanced features

**Still stuck?**
- Check Render documentation
- GitHub has good guides
- The logs usually tell you what's wrong

---

You got this! 💪
