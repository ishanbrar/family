// ══════════════════════════════════════════════════════════
// Legacy – Top 50 Hereditary / Genetic Health Conditions
// Comprehensive medical conditions database.
// ══════════════════════════════════════════════════════════

import type { MedicalCondition } from "./types";

export const ALL_CONDITIONS: MedicalCondition[] = [
  // ── Hereditary ────────────────────────────────
  { id: "cond-001", name: "Diabetes Type 2", type: "hereditary", description: "Chronic condition affecting blood sugar metabolism with strong hereditary component." },
  { id: "cond-003", name: "Glaucoma", type: "hereditary", description: "Group of eye conditions damaging the optic nerve, often hereditary." },
  { id: "cond-005", name: "Sickle Cell Disease", type: "hereditary", description: "Inherited blood disorder causing abnormal hemoglobin and misshapen red blood cells." },
  { id: "cond-006", name: "Cystic Fibrosis", type: "hereditary", description: "Genetic disorder affecting lungs and digestive system through thick mucus production." },
  { id: "cond-007", name: "Huntington's Disease", type: "hereditary", description: "Progressive neurodegenerative disorder caused by autosomal dominant mutation in HTT gene." },
  { id: "cond-008", name: "Hemophilia A", type: "hereditary", description: "X-linked bleeding disorder caused by deficiency of clotting factor VIII." },
  { id: "cond-009", name: "Alzheimer's Disease", type: "hereditary", description: "Progressive neurodegenerative disease. APOE-e4 gene variant increases risk." },
  { id: "cond-010", name: "Parkinson's Disease", type: "hereditary", description: "Neurodegenerative movement disorder. LRRK2 and GBA gene mutations increase risk." },
  { id: "cond-012", name: "Breast Cancer (BRCA)", type: "hereditary", description: "BRCA1/BRCA2 gene mutations significantly increase breast and ovarian cancer risk." },
  { id: "cond-013", name: "Colorectal Cancer", type: "hereditary", description: "Cancer of colon/rectum linked to Lynch syndrome and familial adenomatous polyposis." },
  { id: "cond-018", name: "Thalassemia", type: "hereditary", description: "Inherited blood disorder causing reduced hemoglobin production and anemia." },
  { id: "cond-019", name: "Marfan Syndrome", type: "hereditary", description: "Connective tissue disorder affecting heart, eyes, blood vessels, and skeleton." },
  { id: "cond-021", name: "Phenylketonuria (PKU)", type: "hereditary", description: "Metabolic disorder where the body cannot break down phenylalanine amino acid." },
  { id: "cond-022", name: "Gaucher Disease", type: "hereditary", description: "Lysosomal storage disorder causing fatty substance buildup in organs and bones." },
  { id: "cond-023", name: "Tay-Sachs Disease", type: "hereditary", description: "Fatal genetic disorder destroying nerve cells in the brain and spinal cord." },
  { id: "cond-024", name: "Familial Hypercholesterolemia", type: "hereditary", description: "Inherited condition causing dangerously high LDL cholesterol from birth." },
  { id: "cond-025", name: "Polycystic Kidney Disease", type: "hereditary", description: "Inherited disorder causing clusters of fluid-filled cysts in the kidneys." },
  { id: "cond-026", name: "Ehlers-Danlos Syndrome", type: "hereditary", description: "Group of inherited disorders affecting connective tissues—skin, joints, blood vessels." },
  { id: "cond-027", name: "Osteogenesis Imperfecta", type: "hereditary", description: "Brittle bone disease caused by defects in collagen production genes." },
  { id: "cond-028", name: "Neurofibromatosis", type: "hereditary", description: "Genetic disorder causing tumors to form on nerve tissue throughout the body." },
  { id: "cond-029", name: "Retinoblastoma", type: "hereditary", description: "Rare eye cancer primarily in children, caused by mutations in the RB1 gene." },
  { id: "cond-030", name: "Hemochromatosis", type: "hereditary", description: "Inherited condition causing excessive iron absorption and organ damage." },
  { id: "cond-031", name: "Wilson's Disease", type: "hereditary", description: "Rare inherited disorder causing copper accumulation in liver, brain, and other organs." },
  { id: "cond-032", name: "Alpha-1 Antitrypsin Deficiency", type: "hereditary", description: "Inherited condition that raises risk of lung and liver disease." },
  { id: "cond-033", name: "Duchenne Muscular Dystrophy", type: "hereditary", description: "X-linked progressive muscle degeneration caused by dystrophin gene mutations." },
  { id: "cond-034", name: "Spinal Muscular Atrophy", type: "hereditary", description: "Genetic disease causing motor neuron loss and progressive muscle wasting." },
  { id: "cond-035", name: "Fragile X Syndrome", type: "hereditary", description: "Genetic condition causing intellectual disability, most common inherited cause." },
  { id: "cond-036", name: "Prostate Cancer (Hereditary)", type: "hereditary", description: "BRCA2 and HOXB13 gene mutations significantly increase prostate cancer risk." },
  { id: "cond-037", name: "Ovarian Cancer (Hereditary)", type: "hereditary", description: "BRCA1/BRCA2 mutations and Lynch syndrome increase ovarian cancer risk." },
  { id: "cond-038", name: "Hemophilia B", type: "hereditary", description: "X-linked bleeding disorder caused by deficiency of clotting factor IX." },
  { id: "cond-039", name: "Sickle Cell Trait", type: "hereditary", description: "Carrier state for sickle cell—one copy of the HbS gene. Usually asymptomatic." },
  // ── Chronic ───────────────────────────────────
  { id: "cond-002", name: "Hypertension", type: "chronic", description: "Persistent high blood pressure increasing risk of heart disease and stroke." },
  { id: "cond-004", name: "Asthma", type: "chronic", description: "Chronic respiratory condition causing airway inflammation and breathing difficulties." },
  { id: "cond-040", name: "Type 1 Diabetes", type: "chronic", description: "Autoimmune destruction of insulin-producing beta cells. Strong genetic component." },
  { id: "cond-041", name: "Coronary Artery Disease", type: "chronic", description: "Heart disease caused by plaque buildup with significant hereditary risk factors." },
  { id: "cond-042", name: "Amyotrophic Lateral Sclerosis (ALS)", type: "chronic", description: "Progressive neurodegenerative disease affecting motor neurons. ~10% familial." },
  // ── Autoimmune ────────────────────────────────
  { id: "cond-014", name: "Celiac Disease", type: "autoimmune", description: "Autoimmune disorder triggered by gluten, damaging the small intestine lining." },
  { id: "cond-015", name: "Rheumatoid Arthritis", type: "autoimmune", description: "Chronic autoimmune disorder causing joint inflammation and progressive destruction." },
  { id: "cond-016", name: "Lupus (SLE)", type: "autoimmune", description: "Systemic autoimmune disease where the immune system attacks healthy tissue." },
  { id: "cond-043", name: "Multiple Sclerosis", type: "autoimmune", description: "Immune system attacks nerve fiber protective covering. Strong genetic component." },
  { id: "cond-044", name: "Crohn's Disease", type: "autoimmune", description: "Inflammatory bowel disease with hereditary susceptibility (NOD2 gene)." },
  { id: "cond-045", name: "Ulcerative Colitis", type: "autoimmune", description: "Chronic inflammatory condition of the colon with genetic predisposition." },
  { id: "cond-046", name: "Graves' Disease", type: "autoimmune", description: "Autoimmune thyroid disorder causing hyperthyroidism. Runs in families." },
  { id: "cond-047", name: "Hashimoto's Thyroiditis", type: "autoimmune", description: "Autoimmune thyroid destruction causing hypothyroidism. Strong genetic link." },
  { id: "cond-048", name: "Psoriasis", type: "autoimmune", description: "Chronic skin condition with strong hereditary component (HLA-Cw6 gene)." },
  { id: "cond-049", name: "Atopic Dermatitis (Eczema)", type: "autoimmune", description: "Chronic inflammatory skin condition with filaggrin gene mutations." },
  // ── Mental Health ─────────────────────────────
  { id: "cond-011", name: "Bipolar Disorder", type: "mental_health", description: "Extreme mood swings between mania and depression. ~80% heritability." },
  { id: "cond-017", name: "Schizophrenia", type: "mental_health", description: "Chronic mental disorder affecting perception and thought. ~80% genetic risk." },
  { id: "cond-020", name: "Major Depressive Disorder", type: "mental_health", description: "Persistent depressive disorder with ~40% heritability. Polygenic inheritance." },
  { id: "cond-050", name: "ADHD", type: "mental_health", description: "Attention deficit hyperactivity disorder. ~75% heritability, polygenic." },
];
