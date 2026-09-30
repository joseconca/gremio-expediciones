export interface GroundProjectionConfig {
  /**
   * Posición vertical del horizonte en pantalla.
   *
   * 0.30 = 30% de la altura del canvas.
   */
  horizonScreenRatio: number;

  /**
   * Punto vertical de referencia del suelo.
   *
   * Por ejemplo 0.68 significa que el punto de
   * referencia del mundo aparecerá al 68% de la pantalla.
   */
  groundFocusRatio: number;

  /**
   * Profundidad virtual de la cámara respecto al plano.
   *
   * Controla la intensidad de la perspectiva.
   */
  cameraDepth: number;

  /**
   * Distancia focal.
   *
   * Controla cuánto cambia el tamaño con la profundidad.
   */
  focalLength: number;
}

export interface GroundReference {
  worldX: number;
  worldY: number;

  screenX: number;
  screenY: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  scale: number;
}

export class GroundProjection {
  private readonly horizonScreenRatio: number;
  private readonly groundFocusRatio: number;
  private readonly cameraDepth: number;
  private readonly focalLength: number;

  constructor(config: GroundProjectionConfig) {
    if (config.horizonScreenRatio >= 1) {
      throw new Error("GroundProjection: horizonScreenRatio debe ser menor que 1.");
    }

    if (
      config.groundFocusRatio <= config.horizonScreenRatio ||
      config.groundFocusRatio > 1
    ) {
      throw new Error(
        "GroundProjection: groundFocusRatio debe estar entre horizonScreenRatio y 1."
      );
    }

    if (config.cameraDepth <= 0) {
      throw new Error("GroundProjection: cameraDepth debe ser mayor que 0.");
    }

    if (config.focalLength <= 0) {
      throw new Error("GroundProjection: focalLength debe ser mayor que 0.");
    }

    this.horizonScreenRatio = config.horizonScreenRatio;

    this.groundFocusRatio = config.groundFocusRatio;

    this.cameraDepth = config.cameraDepth;

    this.focalLength = config.focalLength;
  }

  /**
   * Proyecta un punto del mundo sobre la pantalla
   * utilizando una referencia explícita del suelo.
   *
   * IMPORTANTE:
   *
   * Esta función NO modifica las coordenadas del mundo.
   * Solamente calcula dónde debe dibujarse algo.
   */
  project(
    worldX: number,
    worldY: number,
    reference: GroundReference,
    screenWidth: number,
    screenHeight: number
  ): ProjectedPoint {
    /*
     * Distancia del horizonte al punto de referencia
     * del suelo.
     */
    const focusY = reference.screenY;

    const horizonY = screenHeight * this.horizonScreenRatio;

    const focusDistance = focusY - horizonY;

    /*
     * Diferencia de profundidad respecto al punto
     * de referencia.
     *
     * worldY menor → más lejos.
     * worldY mayor → más cerca.
     */
    const relativeDepth = worldY - reference.worldY;

    /*
     * La distancia virtual de la cámara al plano
     * aumenta/disminuye según nos alejamos del
     * punto de referencia.
     */
    const depth = this.cameraDepth - relativeDepth;

    /*
     * Evitamos llegar al punto de fuga.
     */
    const safeDepth = Math.max(this.cameraDepth * 0.05, depth);

    /*
     * Escala perspectiva.
     *
     * En el punto de referencia:
     *
     * focalLength / cameraDepth
     *
     * Queremos aproximadamente 1.
     */
    const scale = this.focalLength / safeDepth;

    /*
     * Coordenada vertical.
     *
     * El punto de referencia siempre queda
     * exactamente en reference.screenY.
     */
    const screenY = focusY + (focusDistance * relativeDepth) / safeDepth;

    /*
     * La referencia horizontal es explícita.
     *
     * Esto es importante: no suponemos que
     * worldX=0 ni que el jugador está en el
     * centro geométrico del sprite.
     */
    const relativeX = worldX - reference.worldX;

    const screenX = reference.screenX + relativeX * scale;

    return {
      x: screenX,
      y: screenY,
      scale,
    };
  }

  /**
   * Proyecta una fila vertical del mapa.
   */
  projectRow(
    worldY: number,
    tileHeight: number,
    reference: GroundReference,
    screenWidth: number,
    screenHeight: number
  ): {
    top: ProjectedPoint;
    bottom: ProjectedPoint;
  } {
    const top = this.project(
      reference.worldX,
      worldY,
      reference,
      screenWidth,
      screenHeight
    );

    const bottom = this.project(
      reference.worldX,
      worldY + tileHeight,
      reference,
      screenWidth,
      screenHeight
    );

    return {
      top,
      bottom,
    };
  }
}
