import styles from "./HeroSection.module.css";

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.left}>
        <h1 className={styles.heading}>
          Real-Time Wildfire Monitoring — <span className={styles.accent}>Live Stream</span>
        </h1>
        <p className={styles.description}>
          NASA satellite hotspots streamed through a serverless pipeline and
          delivered to the browser via WebSocket — updated every ~3 hours.
        </p>
      </div>
      <div className={styles.sources}>
        <div className={styles.source}>
          {/* NASA meatball - simplified */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" fill="#0B3D91" />
            <circle cx="11" cy="11" r="7" fill="none" stroke="#FC3D21" strokeWidth="1.2" />
            <path d="M6 11c2-3 4-5 7-5s3 2 1 4-5 4-7 1" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <circle cx="11" cy="6.5" r="1" fill="#fff" />
          </svg>
          <div>
            <div className={styles.sourceName}>MODIS</div>
            <div className={styles.sourceDesc}>~1 km resolution</div>
          </div>
        </div>
        <div className={styles.source}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" fill="#0B3D91" />
            <circle cx="11" cy="11" r="7" fill="none" stroke="#FC3D21" strokeWidth="1.2" />
            <path d="M6 11c2-3 4-5 7-5s3 2 1 4-5 4-7 1" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <circle cx="11" cy="6.5" r="1" fill="#fff" />
          </svg>
          <div>
            <div className={styles.sourceName}>VIIRS</div>
            <div className={styles.sourceDesc}>~375 m resolution</div>
          </div>
        </div>
        <div className={styles.source}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" fill="#0B3D91" />
            <circle cx="11" cy="11" r="7" fill="none" stroke="#FC3D21" strokeWidth="1.2" />
            <path d="M6 11c2-3 4-5 7-5s3 2 1 4-5 4-7 1" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <circle cx="11" cy="6.5" r="1" fill="#fff" />
          </svg>
          <div>
            <div className={styles.sourceName}>NASA FIRMS</div>
            <div className={styles.sourceDesc}>Global fire data</div>
          </div>
        </div>
      </div>
    </section>
  );
}
