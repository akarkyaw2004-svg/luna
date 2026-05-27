# 🚀 Luna — GitHub Pages တင်နည်း + Notification အလုပ်လုပ်ပုံ

---

## 📋 ကြိုတင်ပြင်ဆင်မှုများ

- [x] GitHub account (https://github.com) — မရှိသေးပါက အခမဲ့ဖွင့်ပါ
- [x] Git installed (https://git-scm.com/download/win)
- [x] Luna website files ရှိရမည် (`d:\VS Project\luna\`)

---

## 🗂️ Step 1 — GitHub Repository အသစ်ဖန်တီးပါ

1. https://github.com/new သို့ သွားပါ
2. Repository name: **`luna`** ဟု ထည့်ပါ
3. **Public** ကို ရွေးပါ (GitHub Pages အတွက် လိုအပ်သည်)
4. **"Create repository"** ကိုနှိပ်ပါ

---

## 💻 Step 2 — Luna ဖိုင်များကို GitHub တင်ပါ

PowerShell (သို့) Command Prompt ကိုဖွင့်ပြီး အောက်ပါ command များကို တစ်ကြောင်းချင်း ရိုက်ထည့်ပါ:

```bash
# Luna ဖိုင်ရှိသည့် ဖိုဒါသို့ ဝင်ပါ
cd "d:\VS Project\luna"

# Git စတင်ပါ
git init

# ဖိုင်အားလုံး ထည့်ပါ
git add .

# Save (commit) ပြုလုပ်ပါ
git commit -m "🌙 Initial Luna cycle tracker"

# GitHub Repository နှင့် ချိတ်ဆက်ပါ
# (YOUR-USERNAME ကို သင့် GitHub username နှင့် အစားထိုးပါ)
git remote add origin https://github.com/YOUR-USERNAME/luna.git

# GitHub သို့ တင်ပါ
git branch -M main
git push -u origin main
```

> [!IMPORTANT]
> `YOUR-USERNAME` ကို သင့် GitHub username နှင့် အစားထိုးရမည်!
> ဥပမာ: username က `johnmoe` ဆိုပါက → `https://github.com/johnmoe/luna.git`

---

## 🌐 Step 3 — GitHub Pages ဖွင့်ပါ

1. GitHub တွင် `luna` repository ကိုဖွင့်ပါ
2. **Settings** tab ကိုနှိပ်ပါ
3. ဘယ်ဘက် sidebar တွင် **Pages** ကိုနှိပ်ပါ
4. **Source** အောက်တွင် → **"Deploy from a branch"** ကိုရွေးပါ
5. **Branch** → `main` ကိုရွေး၍ **`/ (root)`** ကိုရွေးပါ
6. **Save** ကိုနှိပ်ပါ

⏳ ၂-၃ မိနစ်ခန့် စောင့်ပါ — ထို့နောက် သင့် website လိပ်စာမှာ:

```
https://YOUR-USERNAME.github.io/luna/
```

ဤ URL ကို သင့်ချစ်သူထံ ပို့ပေးပါ! 💕

---

## 🔔 Notification — GitHub Pages တွင် အလုပ်လုပ်ပုံ

### ✅ အလုပ်လုပ်သည်များ

| Feature | GitHub Pages တွင် |
|---|---|
| 🌸 **In-app reminder banner** | ✅ အပြည့်အဝ အလုပ်လုပ်သည် |
| 🔔 **Browser notification (tab ဖွင့်ထားချိန်)** | ✅ အပြည့်အဝ အလုပ်လုပ်သည် |
| 📱 **Phone home screen တင်ပြီး notification** | ✅ PWA install လုပ်ပါက အလုပ်လုပ်သည် |
| 💾 **Offline mode** | ✅ Service Worker ကြောင့် internet မလိုပါ |

### ⚠️ ကန့်သတ်ချက်တစ်ခု

> **Browser/Phone ကို လုံးဝပိတ်ထားချိန်တွင် notification** ပို့ရန် — Backend Server (Node.js, Firebase) လိုအပ်သည်။ GitHub Pages သည် static hosting သာဖြစ်သောကြောင့် ဤ feature ကို support မလုပ်ပါ။

**✨ အကောင်းဆုံး Solution:** အောက်ပါ ၂ နည်းလမ်းကို သုံးပါ —

---

## 📱 Solution 1 — Phone Home Screen တင်ပါ (အကောင်းဆုံး)

Website ကို Phone App အဖြစ် Install လုပ်ပါ:

### Android တွင်:
1. Chrome browser တွင် `https://YOUR-USERNAME.github.io/luna/` ဖွင့်ပါ
2. Menu (⋮) → **"Add to Home screen"** ကိုနှိပ်ပါ
3. **"Add"** ကိုနှိပ်ပါ
4. Phone Home Screen တွင် Luna icon ပေါ်လာမည်
5. Luna app ကိုဖွင့်သောအခါ — **Notification Allow** ကိုနှိပ်ပါ

### iPhone (iOS) တွင်:
1. Safari browser တွင် URL ဖွင့်ပါ
2. Share button (□↑) → **"Add to Home Screen"** → **"Add"**

> [!TIP]
> Phone Home Screen တင်ပြီးပါက — App ကိုဖွင့်သောအချိန်တိုင်း (ရာသီ ၂ ရက်အလို ဖြစ်ပါက) romantic notification ထွက်မည်!

---

## 💡 Solution 2 — ရာသီမလာမီ ၂ ရက်တွင် App ဖွင့်ကြည့်ရန် သတိပေးပါ

သင့်ချစ်သူကို Calendar (Google Calendar, Phone Calendar) တွင် monthly reminder တစ်ခု ထည့်ပေးပါ:

```
Recurring reminder: "Luna app ဖွင့်ကြည့်ပါ 🌸"
```

App ဖွင့်သောချက်ချင်း — ရာသီ ၂ ရက်အလိုဆိုပါက romantic message ထွက်မည်!

---

## 🔄 Website ကို Update လုပ်နည်း (နောင်တချိန်)

ဖိုင်ပြင်ပြီးတိုင်း အောက်ပါ command ၃ ကြောင်းသာ ရိုက်ပါ:

```bash
cd "d:\VS Project\luna"
git add .
git commit -m "✨ Update Luna"
git push
```

GitHub Pages သည် ၂-၃ မိနစ်အတွင်း အလိုအလျောက် update ဖြစ်မည်!

---

## 🆓 GitHub Pages အချက်အလက်

| အချက် | ဆိုလိုသည်မှာ |
|---|---|
| 💰 **အဈ** | လုံးဝ အခမဲ့ |
| 🔒 **HTTPS** | ✅ အလိုအလျောက် (notification အတွက် လိုအပ်) |
| ⚡ **Speed** | CDN ဖြင့် မြန်ဆန်သည် |
| 💾 **Storage** | 1GB အထိ အခမဲ့ |
| 📊 **Bandwidth** | တစ်လ 100GB အထိ |

---

## 🌐 GitHub Pages URL Format

```
https://YOUR-USERNAME.github.io/luna/
```

ဤ URL ကို:
- **Message** ပို့ပေးပါ 💌
- **QR Code** ဖန်တီး၍ Print ထုတ်ပေးပါ
- Phone Browser တွင် Bookmark လုပ်ပေးပါ

---

*Luna နှင့်အတူ — သင့်ချစ်သူ၏ ကျန်းမာရေးကို ဂရုစိုက်ပါ 🌸💕*
