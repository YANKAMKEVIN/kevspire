/** Types partagés entre données, simulation, rendu et interface. */
export type TowerKind = 'baliste' | 'phare' | 'mortier' | 'cloche' | 'bobine';
export type EnemyKind = 'grignot' | 'papillombre' | 'carapace' | 'fouisseur' | 'moucheron' | 'planeur' | 'mereBrume';
export type DamageType = 'phys' | 'lumiere' | 'givre' | 'foudre';
export type FloorKind = 'rempart' | 'atelier' | 'belvedere' | 'comptoir' | 'sanctuaire';
export type AbilityKind = 'eclat' | 'rafale';
export type SpawnSide = 'L' | 'R' | 'both' | 'sky' | 'under';
export type BiomeId = 'crepuscule' | 'nuit' | 'orage';
export type Side = -1 | 1;
