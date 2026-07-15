import { useEffect } from 'react'
import { Nav, DataStrip } from './components/Chrome.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import { Shop, Metamorph, Footer } from './components/Sections.jsx'

export default function App() {
  // scroll-reveal for .reveal elements. A MutationObserver runs alongside
  // the initial scan so any .reveal elements added to the DOM after first
  // render (if that ever happens again) still get picked up.
  useEffect(() => {
    let count = 0
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
    }), { threshold: 0.15 })

    const watch = (el) => {
      el.style.transitionDelay = (count++ % 3) * 90 + 'ms'
      io.observe(el)
    }

    document.querySelectorAll('.reveal').forEach(watch)

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.matches?.('.reveal')) watch(node)
          node.querySelectorAll?.('.reveal').forEach(watch)
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => { io.disconnect(); mo.disconnect() }
  }, [])

  return (
    <>
      <a className="skip-link mono" href="#chart-form">skip to chart form</a>
      <Nav />
      <DataStrip />
      <main>
        <Hero />
        <About />
        <Shop />
        <Metamorph />
      </main>
      <Footer />
    </>
  )
}
