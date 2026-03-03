"use client";

import Link from "next/link";
import styles from "./HeroOverlay.module.css";

export default function HeroOverlay() {
  return (
    <section className={styles.overlay} aria-label="Collabs landing">
      <div className={styles.center}>
        <h1>Chloe Kang</h1>
        <Link href="/collabs/reels" className={styles.enterButton}>
          Enter
        </Link>
      </div>
    </section>
  );
}
