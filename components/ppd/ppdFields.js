/* Draft PPD field definitions — shared by Create/Edit form, Detail view and List (mirrors backend/ppd_fields.py) */

export const BASIC_FIELDS = [
  ['project_name', 'Project Name'],
  ['project_type', 'Project Type'],
  ['brand',        'Brand'],
  ['date',         'Date'],
]

export const TEAM_FIELDS = [
  ['project_leader',   'Project Leader'],
  ['marketing',        'Marketing'],
  ['rd_product',       'R&D-Product'],
  ['rd_packaging',     'R&D-Packaging'],
  ['legal_regulatory', 'Legal & Regulatory'],
]

// [section id, heading, [[field key, label], ...], large?]
export const RICH_SECTIONS = [
  ['goal',        'Overall Project Goal',               [['overall_goal', 'Overall Project Goal']], true],
  ['consumer',    'Consumer Context',                   [['consumer_target_group', 'Consumer Target Group'], ['consumer_evidence', 'Consumer Evidence']]],
  ['construct',   'Product Construct',                  [['flavour', 'Flavour'], ['attributes', 'Attributes']]],
  ['business',    'Business Logic',                     [['business_logic', 'Business Logic']]],
  ['description', 'Product Description',                [
    ['product_description',        'Detailed Product Description & Functions'],
    ['performance_claims',         'Essential Product Performance & Claims'],
    ['benchmark',                  'Benchmark to Match or Beat'],
    ['primary_pack_description',   'Detailed Primary Pack Description'],
    ['patent_legal_requirements',  'Patent/Legal/Registration Requirements'],
  ]],
  ['legal',       'Legal & Regulatory Considerations',  [['legal_regulatory_considerations', 'Legal & Regulatory Considerations']]],
  ['objective',   'Project Objective',                  [['target_objective', 'Target Objective'], ['minimum_objective', 'Minimum Objective']]],
  ['assumptions', 'Assumptions',                        [['assumptions', 'Assumptions']]],
  ['constraints', 'Constraints',                        [['constraints', 'Constraints']]],
  ['risks',       'Risks & Potential Problems',         [['risks', 'Risks & Potential Problems']]],
]

// Keys stored in ppd.draft_form (project_name & brand are top-level PPD columns)
export const DRAFT_KEYS = [
  'project_type', 'date',
  ...TEAM_FIELDS.map(([k]) => k),
  ...RICH_SECTIONS.flatMap(([, , fields]) => fields.map(([k]) => k)),
]

const ALLOWED_TAGS = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'A', 'SPAN'])

/** Keep only the formatting the editor produces; drop scripts, handlers and unsafe links. */
export function sanitizeHtml(html) {
  if (!html || typeof window === 'undefined') return html || ''
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const clean = (node) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 3) return
      if (child.nodeType !== 1 || !ALLOWED_TAGS.has(child.tagName)) {
        if (child.nodeType === 1 && !['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(child.tagName)) {
          clean(child)
          child.replaceWith(...child.childNodes)
        } else child.remove()
        return
      }
      Array.from(child.attributes).forEach(a => {
        const keep = child.tagName === 'A' && a.name === 'href' && /^(https?:|mailto:|\/)/i.test(a.value.trim())
        if (!keep) child.removeAttribute(a.name)
      })
      if (child.tagName === 'A') { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noreferrer') }
      clean(child)
    })
  }
  const root = doc.body.firstChild
  clean(root)
  return root.innerHTML
}

/** Plain-text preview of rich-text HTML (for tables / search results). */
export const htmlToText = (html) => (html || '').replace(/<(br|\/p|\/div|\/li)[^>]*>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
