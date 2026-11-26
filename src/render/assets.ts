/** Chargement des images et préparation de variantes (silhouettes blanches/cyan pour les effets). */
export const IMAGE_IDS = [
  'fond_titre', 'ciel_crepuscule', 'ciel_nuit', 'ciel_orage', 'ile_base',
  'etage_a', 'etage_b', 'etage_c', 'sommet', 'coeur',
  'baliste', 'phare', 'mortier', 'cloche', 'bobine',
  'grignot', 'papillombre', 'carapace', 'fouisseur', 'moucheron', 'planeur', 'mere_brume',
  'gardienne',
] as const;

export type ImageId = (typeof IMAGE_IDS)[number];

export type Drawable = HTMLImageElement | HTMLCanvasElement;

export class Assets {
  private images = new Map<ImageId, HTMLImageElement>();
  private tinted = new Map<string, HTMLCanvasElement>();

  static url(id: ImageId): string {
    return `${import.meta.env.BASE_URL}assets/${id}.webp`;
  }

  async load(onProgress?: (done: number, total: number) => void): Promise<void> {
    let done = 0;
    await Promise.all(
      IMAGE_IDS.map(
        (id) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
              this.images.set(id, img);
              onProgress?.(++done, IMAGE_IDS.length);
              resolve();
            };
            // Une image manquante ne doit pas bloquer le jeu : on dessinera une forme de secours.
            img.onerror = () => {
              onProgress?.(++done, IMAGE_IDS.length);
              resolve();
            };
            img.src = Assets.url(id);
          }),
      ),
    );
  }

  get(id: ImageId): HTMLImageElement | undefined {
    return this.images.get(id);
  }

  /** Silhouette d'une image remplie d'une couleur (flash de dégâts, givre). Mise en cache. */
  silhouette(id: ImageId, color: string): Drawable | undefined {
    const key = `${id}|${color}`;
    const cached = this.tinted.get(key);
    if (cached) return cached;
    const img = this.images.get(id);
    if (!img || typeof document === 'undefined') return undefined;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d');
    if (!g) return undefined;
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    this.tinted.set(key, c);
    return c;
  }
}

/** Halo radial pré-rendu, réutilisé par toutes les particules lumineuses. */
export function makeGlowSprite(size: number, rgb: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.25, `rgba(${rgb},0.55)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}
