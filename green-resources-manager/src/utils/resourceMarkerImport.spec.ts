import { describe, expect, it } from 'vitest'
import { decideMarkerImport, type MarkerImportCandidate } from './resourceMarkerImport'

function candidate(overrides: Partial<MarkerImportCandidate> = {}): MarkerImportCandidate {
  return {
    resourceId: 'r1',
    exact: false,
    known: true,
    oldPathExists: false,
    typeMatches: true,
    ...overrides
  }
}

describe('decideMarkerImport', () => {
  it('does nothing without markers', () => {
    expect(decideMarkerImport([])).toEqual({ action: 'none' })
  })

  it('relocates when the exact marker points at a missing record', () => {
    expect(decideMarkerImport([candidate({ exact: true })])).toEqual({
      action: 'relocate',
      resourceId: 'r1'
    })
  })

  it('treats an existing old path as a copy', () => {
    expect(decideMarkerImport([candidate({ exact: true, oldPathExists: true })])).toEqual({
      action: 'duplicate',
      resourceId: 'r1'
    })
  })

  it('does not move a record into another resource type', () => {
    expect(decideMarkerImport([candidate({ exact: true, typeMatches: false })])).toEqual({
      action: 'duplicate',
      resourceId: 'r1'
    })
  })

  it('adopts the exact marker id when the database has no such record', () => {
    expect(decideMarkerImport([candidate({ exact: true, known: false })])).toEqual({
      action: 'adopt',
      resourceId: 'r1'
    })
  })

  it('prefers the exact marker over other renamed-file candidates', () => {
    expect(
      decideMarkerImport([
        candidate({ resourceId: 'exact', exact: true }),
        candidate({ resourceId: 'other', exact: false })
      ])
    ).toEqual({ action: 'relocate', resourceId: 'exact' })
  })

  it('uses a single renamed-file marker when there is no exact one', () => {
    expect(decideMarkerImport([candidate({ resourceId: 'renamed' })])).toEqual({
      action: 'relocate',
      resourceId: 'renamed'
    })
  })

  it('refuses to guess when several missing records match', () => {
    expect(
      decideMarkerImport([
        candidate({ resourceId: 'a' }),
        candidate({ resourceId: 'b' })
      ])
    ).toEqual({ action: 'ambiguous', count: 2 })
  })

  it('treats any existing renamed-file candidate as a copy', () => {
    expect(
      decideMarkerImport([
        candidate({ resourceId: 'a', oldPathExists: true }),
        candidate({ resourceId: 'b' })
      ])
    ).toEqual({ action: 'duplicate', resourceId: 'a' })
  })

  it('ignores markers from another resource type', () => {
    expect(
      decideMarkerImport([candidate({ typeMatches: false, oldPathExists: true })])
    ).toEqual({ action: 'none' })
  })

  it('still adopts an exact unknown id when other markers exist', () => {
    expect(
      decideMarkerImport([
        candidate({ resourceId: 'exact', exact: true, known: false }),
        candidate({ resourceId: 'other', known: true })
      ])
    ).toEqual({ action: 'adopt', resourceId: 'exact' })
  })
})
