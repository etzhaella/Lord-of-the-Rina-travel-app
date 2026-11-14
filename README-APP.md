# Lord of the Rina 🧭❤️
### Family Travel Companion

> האפליקציה נבנתה כמחווה לזכרה של רינה, כדי לעזור למשפחה ליצור חוויות וזיכרונות משותפים בטיולים.

אפליקציית ווב (מותאמת למובייל) שמוצאת מקומות מומלצים בסביבה, שומרת מועדפים, מנהלת את המלון ואת היעדים של הטיול, רושמת הוצאות ומנווטת ב-Waze.

## הפעלה (הכל בדוקר)

```bash
cp .env.example .env          # להכניס GOOGLE_PLACES_API_KEY (לא חובה – בלי מפתח רץ במצב הדגמה)
docker compose up --build
```

| שירות | כתובת |
|---|---|
| האפליקציה | http://localhost:3000 |
| API + תיעוד | http://localhost:8000/docs |
| Postgres | localhost:5432 (rina / rina) |

> **GPS בטלפון:** דפדפנים נותנים מיקום רק ב-HTTPS (או localhost). כדי לבדוק מהטלפון ברשת הביתית, משתמשים במנהרה עם HTTPS (למשל `cloudflared tunnel --url http://localhost:3000`) או בפריסה ל-Cloud Run.

## מה יש באפליקציה

| מסך | מה עושה |
|---|---|
| **בית** | מיקום נוכחי, כרטיס המלון ("חזרה למלון" ב-Waze), 4 קטגוריות, היעדים הקרובים |
| **Food 🍽️** | Breakfast / Coffee / Dinner |
| **Entertainment 🎭** | אטרקציות, מוזיאונים, פארקים, נקודות תצפית |
| **Christmas Markets 🎄** | שווקי חג מולד באזור |
| **Favorites ❤️** | מועדפים שלי / של כל המשפחה |
| **🏨 מלון** | חיפוש המלון ב-Google, "אני במלון עכשיו", הדבקת קואורדינטות/קישור. תאריכים, טלפון, הערות. כמה מלונות לטיול רב-עירוני (אחד פעיל) |
| **📌 יעדים** | רשימת יעדים משותפת: הוספה מחיפוש או מכל כרטיס מקום, סידור, תאריך מתוכנן, הערות, "ביקרנו", היעד הקרוב ביותר |
| **💳 הוצאות** | כפתור ＋ צף בכל מסך. סכום, מטבע, קטגוריה, מי שילם, תאריך. רשימה לפי יום + סיכום לפי קטגוריה / בן משפחה / יום |
| **👨‍👩‍👧 משפחה** | בחירת המשתמש הנוכחי, עריכת שמות/אימוג׳י/צבע |

**פילטרים:** מרחק (1/5/10/20 ק״מ), מחיר ($–$$$$), דירוג (4+ עד 4.8+), מיון, ו**חיפוש ליד: המיקום שלי / המלון**. אם אין GPS, החיפוש נעשה אוטומטית ליד המלון.

**Waze:** בלחיצה האפליקציה מנסה לפתוח את Waze. אם Waze לא מותקן, נפתח חלון עם Google Maps, התקנת Waze או Waze בדפדפן. באנדרואיד, Chrome עובר ל-Google Maps אוטומטית.

**זמן נסיעה:** הערכה לפי מרחק אווירי × 1.3 (הליכה 4.8 קמ״ש, נסיעה 32 קמ״ש + 3 דק׳).

## ארכיטקטורה

```
browser ──► Next.js 14 (TypeScript)  ──/api/* proxy──►  FastAPI  ──►  PostgreSQL
                                                          └──► Google Places API (New)
```
- מפתח Google נשאר בשרת בלבד. גם תמונות עוברות דרך `/api/places/photo`.
- הטבלאות נוצרות אוטומטית בהפעלה הראשונה, ו-5 בני משפחה נוצרים כברירת מחדל.

## Google Places API
ב-Google Cloud Console מפעילים את **Places API (New)**, יוצרים API key ומגבילים אותו ל-Places API.

## פריסה ל-Google Cloud Run (אוטומטית מהריפו)

**שני שירותים ב-Cloud Run (`europe-west1`, פרויקט `lord-of-the-rina-travel-app`):**

| שירות | מה הוא | פתוח לציבור |
|---|---|---|
| **`rina-frontend`** | שרת Next.js. **זה האתר.** מעביר כל `/api/*` אל ה-backend | כן, כאן מחברים את הסאב-דומיין |
| `rina-backend` | FastAPI: נתונים (Postgres), חיפוש Google Places, תמונות | כן (ה-frontend קורא אליו) |

כל `git push` ל-`main` מפעיל את הטריגר ב-Cloud Build, שמריץ את `cloudbuild.yaml`:
1. בונה במקביל `backend` ו-`frontend` ומתייג `:<COMMIT_SHA>` וגם `:latest`.
2. דוחף אל `europe-west1-docker.pkg.dev/lord-of-the-rina-travel-app/rina/`.
3. מעלה את `rina-backend` עם הסודות מ-Secret Manager.
4. מעלה את `rina-frontend` עם `BACKEND_URL` שמצביע על ה-backend.

בסוף הלוג (שלב `deploy-frontend`) מודפס `WEBSITE: https://...`.

### יצירת הטריגר (הסוג הנכון)
השגיאה `lstat /workspace/Dockerfile: no such file or directory` אומרת שהטריגר מוגדר כ-*Dockerfile/Autodetected/Inline*. הטריגר הנכון מריץ את `cloudbuild.yaml`:
```powershell
powershell -ExecutionPolicy Bypass -File deploy\5-create-trigger.ps1
```
הסקריפט מציג את הטריגרים הקיימים (כדי לזהות ולכבות את הישן) ויוצר את `deploy-main`. תנאי מוקדם: חיבור הריפו פעם אחת ב-Console (*Cloud Build → Triggers → Connect repository*).

### סודות (Secret Manager)
| Secret | חובה | נכנס כ- | תוכן |
|---|---|---|---|
| `db-url` | כן | `DATABASE_URL` | Connection string של Postgres (למשל Neon: `postgresql://...?...sslmode=require`) |
| `places-key` | לא | `GOOGLE_PLACES_API_KEY` | מפתח Places API (New). בלעדיו האתר עולה במצב הדגמה |

```powershell
# יצירה (פעם אחת). הערך נכתב לקובץ זמני ולא מופיע בהיסטוריית הפקודות
$p = "lord-of-the-rina-travel-app"
Read-Host "DB connection string" | Set-Content -NoNewline db.tmp
gcloud secrets create db-url --data-file=db.tmp --replication-policy=automatic --project $p
Remove-Item db.tmp

Read-Host "Google Places key" | Set-Content -NoNewline key.tmp
gcloud secrets create places-key --data-file=key.tmp --replication-policy=automatic --project $p
Remove-Item key.tmp

# עדכון ערך קיים: אותו דבר עם  gcloud secrets versions add <name> --data-file=...
```
ה-service account של Cloud Run (`572829443523-compute@developer.gserviceaccount.com`) צריך `roles/secretmanager.secretAccessor`.
אחרי הוספת `places-key` מריצים שוב את הטריגר (או `git push`), והאפליקציה עוברת לנתונים אמיתיים.

### בדיקה מקומית של אימג׳י הפרודקשן
```powershell
docker build -t rina-backend  -f backend/Dockerfile  backend
docker build -t rina-frontend --target runner -f frontend/Dockerfile frontend

docker network create rina-net
docker run -d --name rina-db  --network rina-net -e POSTGRES_USER=rina -e POSTGRES_PASSWORD=rina -e POSTGRES_DB=rina postgres:16-alpine
docker run -d --name rina-api --network rina-net -e PORT=8080 -e DATABASE_URL=postgresql://rina:rina@rina-db:5432/rina -p 8081:8080 rina-backend
docker run -d --name rina-web --network rina-net -e PORT=8080 -e BACKEND_URL=http://rina-api:8080 -p 8080:8080 rina-frontend
```
- האתר: http://localhost:8080
- ה-API: http://localhost:8081/api/health

ניקוי: `docker rm -f rina-web rina-api rina-db; docker network rm rina-net`

### סאב-דומיין
```powershell
gcloud beta run domain-mappings create --service=rina-frontend --domain=thehaleysincolmar.etzhaella.com --region=europe-west1 --project=lord-of-the-rina-travel-app
```
אצל ספק ה-DNS של `etzhaella.com` מוסיפים: **CNAME**, שם `thehaleysincolmar`, ערך `ghs.googlehosted.com.`
התעודה (HTTPS) מונפקת לבד, אחרי 15 דקות עד כמה שעות.

### פריסה ידנית (חלופה)
הסקריפטים ב-`deploy/` (`1-setup.ps1`, `2-deploy.ps1`, `3-add-google-key.ps1`) עדיין עובדים לפריסה ידנית מהמחשב.
