# Rutas verificadas · Morelia

Revisión del 19-nov-2026. Alcance: las 23 rutas del proyecto.

## Método y límites
- **Fuentes oficiales:** se buscó GTFS, datos abiertos, IMPLAN y Movilidad Michoacán y no hay ningún trazado publicado. El ITransporte solo publica una convocatoria de monitoreo y avisos de prensa.
- **Fuentes usadas:** relaciones route=bus de OpenStreetMap (una por sentido) y la lista de calles con parada de Moovit (`scripts/moovit-streets.json`).
- **Riesgo de independencia:** las relaciones de OSM tienen operador "Gobierno de Michoacán" y red "Urbano Morelia", y Moovit dice "fuente oficial de Combis". Pueden venir del mismo dato. Por eso "Alta*" lleva asterisco.
- **Qué es VERIFICADA:** cada sentido sale de su propia relación OSM (≥95% del trazo) y ≥90% de las calles de Moovit las recorre el trazo. No se confirmó el sentido de circulación: las relaciones de OSM no traen paradas ni from/to.
- **Moovit:** se abrió la lista de líneas y la página de GRIS 1. Las calles de las demás líneas son las ya guardadas en el proyecto, que no se volvieron a consultar.

## Rutas que se quedan (13)
| Ruta | Estado | Confianza | Fuentes | Pendientes | Relaciones OSM |
|---|---|---|---|---|---|
| GRIS-3-FURAMO | VERIFICADA | Alta* | OSM 99% / Moovit 82 de 86 calles | 1 hueco de 350 m unido con OSRM | [OSM 18180776](https://www.openstreetmap.org/relation/18180776), [OSM 18180799](https://www.openstreetmap.org/relation/18180799) |
| GRIS-3-OXXO | VERIFICADA | Alta* | OSM 100% / Moovit 71 de 73 | — | [OSM 18180790](https://www.openstreetmap.org/relation/18180790), [OSM 18180809](https://www.openstreetmap.org/relation/18180809) |
| NARANJA-3-METROPOLIS | VERIFICADA | Alta* | OSM 97% / Moovit 68 de 72 | 1 hueco de 550 m con OSRM | [OSM 18074018](https://www.openstreetmap.org/relation/18074018), [OSM 18096889](https://www.openstreetmap.org/relation/18096889) |
| ROJA-1 | VERIFICADA | Alta* | OSM 100% / Moovit 47 de 51 | — | [OSM 18015589](https://www.openstreetmap.org/relation/18015589), [OSM 18073974](https://www.openstreetmap.org/relation/18073974) |
| ROJA-4A | VERIFICADA | Alta* | OSM 99% / Moovit 59 de 60 | — | [OSM 18016125](https://www.openstreetmap.org/relation/18016125), [OSM 18073766](https://www.openstreetmap.org/relation/18073766) |
| NARANJA-2 | BAJA CONFIANZA | Baja | OSM 93% / Moovit 47 de 48 | Huecos de 1.3 km y 0.7 km unidos con OSRM | [OSM 17992232](https://www.openstreetmap.org/relation/17992232), [OSM 18073820](https://www.openstreetmap.org/relation/18073820) |
| NARANJA-1-SOLEDAD | BAJA CONFIANZA | Baja | OSM 90% / Moovit 37 de 37 | 5 huecos (hasta 830 m) con OSRM | [OSM 17992012](https://www.openstreetmap.org/relation/17992012), [OSM 17992193](https://www.openstreetmap.org/relation/17992193) |
| NARANJA-3-CENTRO | BAJA CONFIANZA | Baja | OSM 93% / Moovit 61 de 64 | Hueco de 2.25 km con OSRM; el orden de una relación va contrario al trazo | [OSM 18073958](https://www.openstreetmap.org/relation/18073958), [OSM 18073971](https://www.openstreetmap.org/relation/18073971) |
| ROJA-2-OKEN | BAJA CONFIANZA | Baja | OSM 85% / Moovit 44 de 44 | 5 huecos (hasta 1.2 km) con OSRM; orden de una relación contrario al trazo | [OSM 17945678](https://www.openstreetmap.org/relation/17945678), [OSM 17991972](https://www.openstreetmap.org/relation/17991972) |
| ROJA-3B | BAJA CONFIANZA | Baja | OSM 90% / Moovit 51 de 53 | Hueco de 1.6 km con OSRM; orden de una relación contrario al trazo | [OSM 18015573](https://www.openstreetmap.org/relation/18015573), [OSM 18073940](https://www.openstreetmap.org/relation/18073940) |
| NARANJA-3-DIRECTO | BAJA CONFIANZA | Baja | Solo OSM (98%); no hay datos de Moovit | 2 tramos rectos de ~1 km fuera de calle (19.764,-101.182 y 19.763,-101.192) | [OSM 18015602](https://www.openstreetmap.org/relation/18015602), [OSM 18073800](https://www.openstreetmap.org/relation/18073800) |
| GRIS-1 | MANTENIDA (indicación del equipo) | Media | Puntos a mano + OSRM; Moovit 51 de 54 | Ida y vuelta 98% idénticas; se dijo que está parcialmente bien | sin relación OSM (trazo a mano) |
| NARANJA-1 | MANTENIDA (indicación del equipo) | Media | Trazo a mano; Moovit 27 de 27 | Origen de la vuelta sin documentar | sin relación OSM (trazo a mano) |

## Rutas descartadas (10)
Se eliminaron de `routes.json`, `stops.json`, `routeCatalog.ts`, `waypoints.json` y `osm-relations.json`. Motivo común: OSM solo trae un sentido y la vuelta se generaba con routing espejo (OSRM), sin fuente que la confirme.

| Ruta | Motivo |
|---|---|
| GRIS-2 | Vuelta espejo OSRM; solo hay una relación OSM |
| NARANJA-2-SANTA-FE | Vuelta espejo OSRM. Además la relación OSM (cruza de oeste a este) no coincide con el trazo (0%), que se copió de Naranja 2 |
| NARANJA-3-ERANDENI | Vuelta espejo OSRM |
| ROJA-1-PUNHUATO | Vuelta espejo OSRM |
| ROJA-2-VILLAS-DEL-SOL | Vuelta espejo OSRM |
| ROJA-3 | Vuelta espejo OSRM guiada por una relación antigua sin etiquetar |
| ROJA-3A | Vuelta espejo OSRM |
| ROJA-4-TINIJARO | Vuelta espejo OSRM y un salto recto de 3 km |
| ROJA-4M | Vuelta espejo OSRM |
| GRIS-4 | Moovit lista dos sentidos y el trazo solo cubre uno; eliminada por decisión del equipo |

Respaldo previo a la eliminación: `C:UsersenriqHackapony-respaldo-rutas`. Git también conserva las versiones comprometidas, pero los cambios sin comprometer de `routes.json` y `stops.json` solo viven en ese respaldo.

## Fuentes consultadas
- Moovit, líneas de Combis en Morelia: https://moovitapp.com/index/en/public_transit-lines-Morelia-6204-3754596
- Moovit, GRIS 1: https://moovitapp.com/index/en/public_transit-line-gris_1-Morelia-6204-3754596-154082899-0
- Overpass API (OSM), relaciones listadas arriba.
- Búsqueda de datos oficiales sin resultado: https://transporte.michoacan.gob.mx (solo convocatoria de monitoreo 2026).
