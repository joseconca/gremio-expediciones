import styles from "./combate-rpg.module.css";

export default function HistorialCombate({ lineas, onAmpliar }: { lineas: string[]; onAmpliar: () => void }) {
  return <div className={styles.history}>
    <button type="button" onClick={onAmpliar} aria-label="Ampliar historial">+</button>
    <div role="log" aria-live="polite">{(lineas.length ? lineas.slice(-4) : ["El combate comienza…"]).map((linea, i) => <p key={i}>{linea}</p>)}</div>
  </div>;
}
