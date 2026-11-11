import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <h1>🧭 הלכנו לאיבוד</h1>
      <p className="muted">הדף לא נמצא</p>
      <Link href="/" className="btn btn-primary">
        חזרה הביתה
      </Link>
    </main>
  );
}
