import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="empty-state" aria-labelledby="not-found-title">
      <span className="eyebrow">404 · Page not found</span>
      <h1 id="not-found-title">This connection went nowhere.</h1>
      <p>The page may have moved, or the address may be mistyped.</p>
      <Link className="btn btn-primary mt-2" to="/">
        Back to DevTinder
      </Link>
    </section>
  );
}
