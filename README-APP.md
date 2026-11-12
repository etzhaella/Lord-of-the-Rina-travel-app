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

## פריסה לאוויר (Google Cloud Run + Neon, בחינם)

**הכנה (פעם אחת):**
1. מתקינים את [Google Cloud CLI](https://cloud.google.com/sdk/docs/install), ואז ב-PowerShell:
   `gcloud auth login`
2. ב-[console.cloud.google.com](https://console.cloud.google.com) יוצרים פרויקט ומחברים אליו חיוב (Billing), ואז:
   `gcloud config set project <PROJECT_ID>`
3. ב-[neon.tech](https://neon.tech) נרשמים, יוצרים פרויקט ומעתיקים את ה-Connection string (`postgresql://...`).

**הרצה מתיקיית הפרויקט ב-PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File deploy\1-setup.ps1            # פעם אחת: מפעיל שירותים ושומר את מחרוזת ה-DB
powershell -ExecutionPolicy Bypass -File deploy\2-deploy.ps1           # מעלה לאוויר; מריצים שוב אחרי כל שינוי
powershell -ExecutionPolicy Bypass -File deploy\3-add-google-key.ps1   # כשיש מפתח Google, מחבר אותו בלי פריסה מחדש
```
בסוף `2-deploy` מודפסת הכתובת של האפליקציה (`https://rina-frontend-....run.app`). פותחים אותה בטלפון ומוסיפים למסך הבית.
