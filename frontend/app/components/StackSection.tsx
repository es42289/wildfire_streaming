import styles from "./StackSection.module.css";

function PythonLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2C7 2 7 4.5 7 4.5V7h4v1H6S3 8 3 12s2.5 4 2.5 4H8v-2.5S7.8 11 10 11h3s2.2.1 2.2-2V5.5S15.5 2 11 2z" fill="#3776AB" />
      <path d="M11 20c4 0 4-2.5 4-2.5V15h-4v-1h5s3 0 3-4-2.5-4-2.5-4H14v2.5s.2 2.5-2 2.5H9s-2.2-.1-2.2 2v3.5S6.5 20 11 20z" fill="#FFD43B" />
      <circle cx="9" cy="5" r="1" fill="#fff" />
      <circle cx="13" cy="17" r="1" fill="#fff" />
    </svg>
  );
}

function Logo({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className={styles.logoImg} />;
}

function ArrowRight() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M8 14h12M16 9l4 5-4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const stages = [
  {
    label: "Ingest",
    techs: [
      { icon: <Logo src="/logos/EVENTBRIDGE.png" alt="EventBridge" />, name: "EventBridge" },
      { icon: <Logo src="/logos/LAMBDA.png" alt="Lambda" />, name: "Lambda" },
      { icon: <PythonLogo />, name: "Python" },
    ],
  },
  {
    label: "Stream Process",
    techs: [
      { icon: <Logo src="/logos/FLINK.png" alt="Apache Flink" />, name: "Apache Flink" },
      { icon: <Logo src="/logos/LAMBDA.png" alt="Lambda" />, name: "Lambda" },
      { icon: <Logo src="/logos/DYNAMODB.png" alt="DynamoDB" />, name: "DynamoDB" },
    ],
  },
  {
    label: "Deliver",
    techs: [
      { icon: <Logo src="/logos/API_GATEWAY.png" alt="API Gateway" />, name: "API Gateway" },
      { icon: <Logo src="/logos/WEBSOCKET.svg" alt="WebSocket" />, name: "WebSocket" },
      { icon: <Logo src="/logos/S3.png" alt="S3" />, name: "S3" },
      { icon: <Logo src="/logos/CLOUDFRONT.png" alt="CloudFront" />, name: "CloudFront" },
    ],
  },
  {
    label: "Render",
    techs: [
      { icon: <Logo src="/logos/NEXT_JS.svg" alt="Next.js" />, name: "Next.js" },
      { icon: <Logo src="/logos/MAPLIBRE.png" alt="MapLibre GL" />, name: "MapLibre GL" },
    ],
  },
];

export default function StackSection() {
  return (
    <section className={styles.stack}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          A <span className={styles.accent}>Streaming Data</span> Pipeline — End to End
        </h2>
        <p className={styles.description}>
          Satellite fire data is ingested on a schedule, processed through a streaming
          pipeline, stored in DynamoDB, and pushed to connected browsers over WebSocket
          — all running serverless on AWS.
        </p>
      </div>
      <div className={styles.pipeline}>
        {stages.map((stage, i) => (
          <div key={stage.label} className={styles.stageWrapper}>
            <div className={styles.stage}>
              <div className={styles.stageLabel}>{stage.label}</div>
              <div className={styles.techList}>
                {stage.techs.map((tech) => (
                  <div key={tech.name} className={styles.techItem}>
                    <span className={styles.techIcon}>{tech.icon}</span>
                    {tech.name}
                  </div>
                ))}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className={styles.arrow}>
                <ArrowRight />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
