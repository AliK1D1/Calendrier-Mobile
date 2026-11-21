import { describe, expect, it } from "vitest";

import { cameraFor, DEFAULT_CENTER, MARKER_GRAY, markerTint, pickedPoint, SINGLE_ZOOM } from "../map";

describe("cameraFor", () => {
  it("aucun point : Montréal", () => {
    expect(cameraFor([])).toEqual({ coordinates: DEFAULT_CENTER, zoom: 10 });
  });
  it("un seul point : centré, zoom de rue", () => {
    expect(cameraFor([{ lat: 45.53, lng: -73.6 }])).toEqual({ coordinates: { latitude: 45.53, longitude: -73.6 }, zoom: SINGLE_ZOOM });
  });
  it("plusieurs points : centre de la boîte et zoom qui recule avec l'écart", () => {
    const near = cameraFor([{ lat: 45.51, lng: -73.57 }, { lat: 45.54, lng: -73.61 }]);
    expect(near.coordinates.latitude).toBeCloseTo(45.525, 5);
    expect(near.coordinates.longitude).toBeCloseTo(-73.59, 5);
    const far = cameraFor([{ lat: 45.5, lng: -73.6 }, { lat: 46.8, lng: -71.2 }]);
    expect(far.zoom).toBeLessThan(near.zoom);
    expect(near.zoom).toBeLessThanOrEqual(SINGLE_ZOOM);
    expect(far.zoom).toBeGreaterThanOrEqual(3);
  });
  it("ignore les coordonnées invalides", () => {
    expect(cameraFor([{ lat: Number.NaN, lng: 0 }, { lat: 45.53, lng: -73.6 }]).zoom).toBe(SINGLE_ZOOM);
  });
});

describe("pickedPoint", () => {
  it("arrondit à 6 décimales", () => {
    expect(pickedPoint(45.123456789, -73.987654321)).toEqual({ lat: 45.123457, lng: -73.987654 });
  });
  it("refuse ce qui manque ou sort du globe", () => {
    expect(pickedPoint(undefined, 1)).toBeNull();
    expect(pickedPoint(91, 0)).toBeNull();
    expect(pickedPoint(0, Number.NaN)).toBeNull();
  });
});

describe("markerTint", () => {
  it("garde une couleur #hex", () => {
    expect(markerTint("#2c5fa9", MARKER_GRAY)).toBe("#2c5fa9");
  });
  it("couleur système d'iOS (objet) ou texte invalide : la couleur de secours", () => {
    expect(markerTint({ semantic: ["secondaryLabel"] }, MARKER_GRAY)).toBe(MARKER_GRAY);
    expect(markerTint("[object Object]", MARKER_GRAY)).toBe(MARKER_GRAY);
    expect(markerTint(undefined, "#000000")).toBe("#000000");
  });
});
