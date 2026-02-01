import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <main className="page">
      <header className="page__header">
        <h1>Premium Attendance</h1>
        <p>Choose your portal to continue ,developed By Ahmed Wael</p>
      </header>
      <section className="card stack">
        <Link className="button button--primary" to="/employee">
          Employee
        </Link>
        <Link className="button button--ghost" to="/admin/login">
          Admin
        </Link>
      </section>
    </main>
  )
}

export default HomePage
