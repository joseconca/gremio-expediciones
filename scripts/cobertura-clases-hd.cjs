// Compare the actual class catalog with the HD production library, without
// treating ancestor fallbacks or legacy sprites as newly produced HD artwork.
/* eslint-disable @typescript-eslint/no-require-imports -- The in-memory TypeScript loader uses CommonJS, like the repository's Node tests. */
require("../tests/load-typescript.cjs");
const fs = require("node:fs");
const path = require("node:path");
const { CLASES } = require("../src/lib/progresion/clases.ts");
const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "assets/spritesheets/hd-128x256/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const write = process.argv.includes("--write");
const catalog = Object.values(CLASES).sort((a, b) => a.tier - b.tier);
const missing = catalog.filter(c => !manifest.classes.some(v => v.id === c.id));
if (write) {
  let order = Math.max(...manifest.classes.map(c => c.order));
  for (const c of missing) {
    manifest.classes.push({ id: c.id, name: c.nombre, tier: c.tier, order: ++order, sourceStatus: "not-started" });
  }
  for (const c of manifest.classes) {
    for (const sex of ["m", "f"]) {
      if (manifest.variants.some(v => v.classId === c.id && v.sex === sex)) continue;
      const base = `assets/spritesheets/hd-128x256/${c.id}/${sex}`;
      const reference = manifest.variants.find(v => v.classId === "novato" && v.sex === sex);
      manifest.variants.push({
        classId: c.id, className: c.name, tier: c.tier, sex,
        order: manifest.variants.length + 1, status: "pending", actionsCompleted: [],
        sheetPath: `${base}/${c.id}-${sex}-sheet.png`, frameRoot: `${base}/frames`,
        sourceStatus: "not-started", qaStatus: "not-started",
        equipmentRigId: reference.equipmentRigId,
        bodyScale: { ...reference.bodyScale },
        bodyRegistration: "Novato canonical transforms; equipment rig shared by sex",
      });
    }
  }
  manifest.branch = "nuevas-clases";
  if (missing.length) {
    manifest.nextVariant = "superNovato-m";
    manifest.nextTask = "Complete missing classes by tier, class, sex (m then f), and action; preserve original sources and prompts, validate shared equipment, commit each action.";
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
const rows = catalog.map(c => ({
  classId: c.id, name: c.nombre, tier: c.tier,
  variants: ["m", "f"].map(sex => {
    const v = manifest.variants.find(v => v.classId === c.id && v.sex === sex);
    const actions = v?.audit?.technicalActions ?? [];
    return { sex, validFrames: v?.audit?.validFrames ?? 0, invalidFrames: v?.audit?.invalidFrames ?? 0,
      technicalActions: actions.length, missingActions: 15 - actions.length,
      costumeRevisionPendingActions: v?.artDirection?.actionsToRework ?? [],
      visualApprovedActions: v?.actionsCompleted?.length ?? 0 };
  }),
}));
const variants = rows.flatMap(c => c.variants);
const report = {
  catalogClasses: catalog.length, expectedVariants: catalog.length * 2,
  expectedFrames: catalog.length * 120,
  technicallyCompleteVariants: variants.filter(v => v.technicalActions === 15 && !v.costumeRevisionPendingActions.length).length,
  validFrames: variants.reduce((n, v) => n + v.validFrames, 0),
  invalidFrames: variants.reduce((n, v) => n + v.invalidFrames, 0),
  missingActions: variants.reduce((n, v) => n + v.missingActions, 0),
  note: "Technical completion is not artistic approval or runtime promotion. Run auditar-sprites-hd.py before refreshing this derived report.",
  classes: rows,
};
if (write) fs.writeFileSync(path.join(path.dirname(manifestPath), "previews/class-coverage.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
