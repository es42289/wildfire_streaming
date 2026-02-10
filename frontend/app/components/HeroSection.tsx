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
      <div className={styles.right}>
        <img src="/logos/NASA.svg" alt="NASA" className={styles.logo} />
        <img src="/logos/NOAA.png" alt="NOAA" className={styles.logo} />
        <div className={styles.divider} />
        <div className={styles.sources}>
          <div className={styles.source}>
            <div className={styles.sourceName}>MODIS</div>
            <div className={styles.sourceDesc}>~1 km resolution</div>
          </div>
          <div className={styles.source}>
            <div className={styles.sourceName}>VIIRS</div>
            <div className={styles.sourceDesc}>~375 m resolution</div>
          </div>
          <div className={styles.source}>
            <div className={styles.sourceName}>FIRMS</div>
            <div className={styles.sourceDesc}>Global fire data</div>
          </div>
        </div>
      </div>
    </section>
  );
}
