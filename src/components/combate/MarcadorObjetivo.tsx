import styles from "./marcador-objetivo.module.css";

export default function MarcadorObjetivo() {
  return <span className={styles.arrow} data-marcador-objetivo aria-hidden="true" />;
}
