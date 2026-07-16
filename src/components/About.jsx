import Constellation from './Constellation.jsx'
import { DecryptedText, BlurText } from './fx.jsx'
import '../styles/about.css'
import meafSvg from '../assets/003-meaf.svg?url'

export default function About() {
  return (
    <section aria-labelledby="about-heading">
      <div className="kicker"><DecryptedText text="02 — who am i?" /></div>
      <BlurText as="h2" id="about-heading">hi! i'm kate, your <span className="lite">astrologer</span></BlurText>
      <div className="about">
        <div className="portrait reveal">
          <div className="const-plate">
            <Constellation />
          </div>
          <img
            src={meafSvg}
            alt="Pencil sketch of Kate reading birth charts at her laptop"
            loading="lazy" decoding="async"
          />
          <span className="caption mono">fig. 02 — your astrologer</span>
        </div>
        <div className="about-copy reveal">
          <p>I've studied Tropical Western + Traditional/Hellenistic astrology for 4+ years, using astrology as a framework to help people understand themselves and the potential energies or patterns in their life better.</p>
          <p>Although I follow modern interpretations of planets, rulers, and signs, I also bring in Traditional elements like decans and planetary dignities to gain deeper insight into placements. Most of my study has been in birth chart interpretations & understanding how astrology shows up in personal lives.</p>
          <p>I use Placidus if you were born on/around the equator, and Whole Sign if you were born far north/south; if you have a house system preference, let me know!</p>
          <a className="btn" href="https://ko-fi.com/synastral" rel="noopener">get a chart reading ↗</a>
          <ul className="marginalia mono">
            <li>Outside of astrology, I'm a creative developer in tech who's been making and managing websites for 3+ years.</li>
            <li>I love exploring the intersection between spirituality, technology, and art, and I found that most birth chart generators weren't customisable enough for me. That's why I created my own webapp to fulfill my vision of an "ideal chart generator": something accurate (showing most major placements, aspects, and houses) as well as aesthetically customisable.</li>
            <li>Feel free to get in touch if you're interested in knowing more about my webdev experience.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
