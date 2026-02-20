# Punjabi Relation Terms (English Script)

Relation labels can be shown in Punjabi (English script) when the family admin enables **Punjabi** in Settings → Relation labels language. Only the following types are localized; all others stay in English.

- **When gender is unknown**, Punjabi is not used and the English label is shown.
- **"ji"** is used for elder terms as requested.
- **Grandparents** use maternal vs paternal: Nana/Nani (mother’s side), Dada/Dadi (father’s side).
- **Paternal uncle** uses elder vs younger when birth dates are known: **Tayaji** (father’s elder brother), **Chacha ji** (father’s younger brother).

## Grandparents (maternal vs paternal, male vs female)

| English label              | Punjabi (English script) |
|----------------------------|---------------------------|
| Maternal Grandmother       | Nani ji                   |
| Maternal Grandfather       | Nana ji                   |
| Paternal Grandmother       | Dadi ji                   |
| Paternal Grandfather       | Dada ji                   |
| Grandmother (unspecified)  | Nani ji                   |
| Grandfather (unspecified)  | Dada ji                   |

## Aunts / uncles

| English label              | Punjabi (English script) |
|-----------------------------|---------------------------|
| Maternal Aunt              | Masi ji                   |
| Paternal Aunt              | Bua ji                    |
| Maternal Uncle             | Mamaji                    |
| Paternal Uncle             | Chacha ji / Tayaji        |
| Paternal Uncle (elder)     | Tayaji                    |
| Paternal Uncle (younger)   | Chacha ji                 |
| Aunt (generic)             | Masi ji / Bua ji          |
| Uncle (generic)            | Mamaji / Chacha ji        |
| Great Aunt                 | Masi ji / Bua ji          |
| Great Uncle                | Mamaji / Chacha ji        |
| Half-Aunt                  | Masi ji / Bua ji          |
| Half-Uncle                 | Mamaji / Chacha ji        |

## Aunt’s / uncle’s spouse (in-law specific terms)

| English label               | Punjabi (English script) |
|-----------------------------|---------------------------|
| Maternal Aunt's Spouse      | Masar ji                  |
| Maternal Uncle's Spouse     | Mami ji                   |
| Paternal Aunt's Spouse      | Phupha ji                 |
| Paternal Uncle's Spouse     | Chachi ji                 |

*(Mother’s sister’s husband = Masar ji; mother’s brother’s wife = Mami ji; father’s sister’s husband = Phupha ji; father’s brother’s wife = Chachi ji.)*

## Not localized (always English)

- Parent, Child, Sibling, Spouse, Half-Sibling  
- Grandchild  
- **Niece, Nephew**  
- Cousin  
- Self, Not Related, Extended Family  

## Adding more languages

The family setting is stored as `families.relation_language` (`en` \| `punjabi`). To add Spanish, Telugu, etc.:

1. Add the code to the DB enum and migration (e.g. `es`, `te`).
2. Add a label map in `src/lib/relation-labels.ts` and use it in `getRelationDisplayLabel`.
3. Add the option in Settings → Relation labels language.
