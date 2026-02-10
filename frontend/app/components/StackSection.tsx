import styles from "./StackSection.module.css";

/* ── Official-style colored SVG logos ────────────────────────── */

function EventBridgeLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" rx="4" fill="#E7157B" />
      <path d="M11 5v12M5 11h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="11" cy="11" r="3" stroke="#fff" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function LambdaLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" rx="4" fill="#FF9900" />
      <path d="M6 17l4-12h2l2.5 8.5L17 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

function FlinkLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" rx="4" fill="#E6526F" />
      <path d="M5 9l4-3 4 3 4-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 14l4-3 4 3 4-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

function DynamoDBLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" rx="4" fill="#4053D6" />
      <ellipse cx="11" cy="7" rx="5.5" ry="2.5" stroke="#fff" strokeWidth="1.4" fill="none" />
      <path d="M5.5 7v8c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7" stroke="#fff" strokeWidth="1.4" />
      <path d="M5.5 11.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5" stroke="#fff" strokeWidth="1.1" />
    </svg>
  );
}

function ApiGatewayLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" rx="4" fill="#A166FF" />
      <rect x="8" y="4" width="6" height="14" rx="1.5" stroke="#fff" strokeWidth="1.3" fill="none" />
      <line x1="3" y1="8" x2="8" y2="8" stroke="#fff" strokeWidth="1.3" />
      <line x1="3" y1="14" x2="8" y2="14" stroke="#fff" strokeWidth="1.3" />
      <line x1="14" y1="11" x2="19" y2="11" stroke="#fff" strokeWidth="1.3" />
    </svg>
  );
}

function S3Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" rx="4" fill="#569A31" />
      <path d="M6 6l5-2 5 2v10l-5 2-5-2V6z" stroke="#fff" strokeWidth="1.3" fill="none" />
      <path d="M6 6l5 2 5-2" stroke="#fff" strokeWidth="1.1" />
      <line x1="11" y1="8" x2="11" y2="18" stroke="#fff" strokeWidth="1.1" />
    </svg>
  );
}

function CloudFrontLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" rx="4" fill="#8C4FFF" />
      <circle cx="11" cy="11" r="6" stroke="#fff" strokeWidth="1.3" fill="none" />
      <circle cx="11" cy="11" r="2.5" fill="#fff" opacity="0.6" />
      <line x1="11" y1="5" x2="11" y2="8" stroke="#fff" strokeWidth="1.2" />
      <line x1="15.2" y1="7" x2="13.3" y2="9.2" stroke="#fff" strokeWidth="1.2" />
      <line x1="15.2" y1="15" x2="13.3" y2="12.8" stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}

function WebSocketLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" rx="4" fill="#2B7489" />
      <path d="M5 14l3-3 3 3 3-3 3 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="8" r="1.5" fill="#fff" opacity="0.6" />
      <circle cx="16" cy="8" r="1.5" fill="#fff" opacity="0.6" />
      <line x1="7.5" y1="8" x2="14.5" y2="8" stroke="#fff" strokeWidth="1.2" strokeDasharray="2 1.5" />
    </svg>
  );
}

function NextJsLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" fill="#000" stroke="#555" strokeWidth="0.5" />
      <path d="M8.5 6.5v9M8.5 6.5l7 9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.5" y1="6.5" x2="14.5" y2="11" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MapLibreLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" rx="4" fill="#396CB2" />
      <path d="M11 4L5 8v8l6 2 6-2V8L11 4z" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      <circle cx="11" cy="10.5" r="2.5" stroke="#fff" strokeWidth="1.1" fill="none" />
      <circle cx="11" cy="10.5" r="0.8" fill="#fff" />
    </svg>
  );
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
      { icon: <EventBridgeLogo />, name: "EventBridge" },
      { icon: <LambdaLogo />, name: "Lambda" },
      { icon: <PythonLogo />, name: "Python" },
    ],
  },
  {
    label: "Stream Process",
    techs: [
      { icon: <FlinkLogo />, name: "Apache Flink" },
      { icon: <LambdaLogo />, name: "Lambda" },
      { icon: <DynamoDBLogo />, name: "DynamoDB" },
    ],
  },
  {
    label: "Deliver",
    techs: [
      { icon: <ApiGatewayLogo />, name: "API Gateway" },
      { icon: <WebSocketLogo />, name: "WebSocket" },
      { icon: <S3Logo />, name: "S3" },
      { icon: <CloudFrontLogo />, name: "CloudFront" },
    ],
  },
  {
    label: "Render",
    techs: [
      { icon: <NextJsLogo />, name: "Next.js" },
      { icon: <MapLibreLogo />, name: "MapLibre GL" },
    ],
  },
];

export default function StackSection() {
  return (
    <section className={styles.stack}>
      <h2 className={styles.heading}>
        A <span className={styles.accent}>Streaming Data</span> Pipeline — End to End
      </h2>
      <p className={styles.description}>
        Satellite fire data is ingested on a schedule, processed through a
        streaming pipeline, stored in DynamoDB, and pushed to connected browsers
        over WebSocket — all running serverless on AWS.
      </p>
      <div className={styles.pipeline}>
        {stages.map((stage, i) => (
          <div key={stage.label} style={{ display: "flex", alignItems: "center" }}>
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
