import styles from "./PiaThinkingLogo.module.css";

type PiaThinkingLogoProps = {
  /** Width and height in CSS pixels. */
  size?: number;
  /** Accessible description. Set to an empty string when nearby text describes the state. */
  label?: string;
  className?: string;
};

export default function PiaThinkingLogo({
  size = 64,
  label = "PIA is thinking",
  className = "",
}: PiaThinkingLogoProps) {
  const hidden = label.length === 0;

  return (
    <span
      className={`${styles.root} ${className}`}
      style={{ width: size, height: size }}
      role={hidden ? undefined : "status"}
      aria-label={hidden ? undefined : label}
      aria-hidden={hidden || undefined}
    >
      <span className={styles.glow} />
      <svg
        className={styles.mark}
        viewBox="65 65 450 490"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pia-thinking-a" x1="420" y1="120" x2="205" y2="505" gradientUnits="userSpaceOnUse">
            <stop stopColor="#45E0CA" />
            <stop offset=".48" stopColor="#228D80" />
            <stop offset="1" stopColor="#09090A" />
          </linearGradient>
          <linearGradient id="pia-thinking-b" x1="455" y1="125" x2="215" y2="520" gradientUnits="userSpaceOnUse">
            <stop stopColor="#39D4BF" />
            <stop offset=".5" stopColor="#1E756C" />
            <stop offset="1" stopColor="#0B0B0C" />
          </linearGradient>
        </defs>

        <g className={styles.lobeA}>
          <path
            fill="url(#pia-thinking-a)"
            d="M427.9 472.6c-20.4 0-40-8.9-53.8-24.3-21.1-23.8-51.2-37.7-83-38.5h-2.7c-30.9 0-60.5 12.4-82.1 34.6-9.3 9.5-20.7 16-34 19.3-5.6 1.4-11.4 2.1-17.1 2.1-33.1 0-61.6-22.4-69.5-54.6-4.6-18.9-1.8-37.6 8.3-54.2 10.1-16.6 25.3-27.8 44.2-32.5l2.9-.6c31.5-6.4 58.9-25.7 75.5-53.2 16.6-27.5 20.9-60.7 11.8-91.6l-.9-3.3c-4.6-18.9-1.8-37.6 8.3-54.2 10.1-16.6 25.3-27.8 44.2-32.5 5.6-1.4 11.4-2.1 17.1-2.1 33.1 0 61.6 22.4 69.5 54.6 3.3 13.5 2.6 27.5-1.9 40.5-10.7 30.4-8.1 64 7.2 92.4 15.3 28.4 41.8 49 73.1 56.9 21.1 5.3 39.1 20.1 48 39.7 16.4 35.9.6 78.5-35.3 95-9.6 4.4-19.3 6.5-29.8 6.5Z"
          />
        </g>
        <g className={styles.lobeB}>
          <path
            fill="url(#pia-thinking-b)"
            d="M494 278.5c-10.5 17.5-28.1 29.8-48.4 33.7-31.3 5.9-58.7 24.6-75.6 51.6l-1.4 2.3c-15.8 26.5-20.3 58.3-12.4 88.2 3.4 12.9 3.1 26-.9 39.1-1.7 5.5-4.1 10.8-7 15.8-17 28.4-50.9 41.4-82.5 31.7-18.6-5.7-33.2-17.8-42.3-34.9-9.1-17.2-10.9-36-5.2-54.6l.9-2.8c10.7-30.3 8.2-63.7-7-92.1-15.1-28.4-41.4-49.1-72.6-57.1l-3.3-.9c-18.6-5.7-33.2-17.8-42.3-34.9-9.1-17.2-10.9-36-5.2-54.6 1.7-5.5 4.1-10.9 7-15.8 17-28.4 50.9-41.4 82.5-31.7 13.3 4.1 25 11.8 33.8 22.5 20.6 24.8 50.8 39.7 83 41.2 32.2 1.4 63.6-10.8 86.3-33.6 15.4-15.4 37.3-23.2 58.8-20.9 39.3 4.3 67.7 39.8 63.4 79.1-1 10.2-4.2 19.7-9.6 28.7Z"
          />
        </g>
      </svg>
      <span className={styles.sheen} />
    </span>
  );
}
