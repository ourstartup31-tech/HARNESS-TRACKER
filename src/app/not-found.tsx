export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-main)", backgroundColor: "var(--bg-main)" }}>
      <h2>404 - Page Not Found</h2>
      <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>The requested engineering tracker view does not exist.</p>
    </div>
  );
}
