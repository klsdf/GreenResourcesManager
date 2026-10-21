import { describe, expect, it } from 'vitest'
import { normalizeWebUrl } from './webUrl'

describe('normalizeWebUrl', () => {
  it('保住已经写好的 https，不改成 http', () => {
    expect(normalizeWebUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1')
    expect(normalizeWebUrl('  HTTPS://Example.com/Path  ')).toBe('HTTPS://Example.com/Path')
  })

  it('用户明确写了 http 时保持 http', () => {
    expect(normalizeWebUrl('http://example.com')).toBe('http://example.com')
  })

  it('没写协议时补 https', () => {
    expect(normalizeWebUrl('example.com/path')).toBe('https://example.com/path')
    expect(normalizeWebUrl('//example.com')).toBe('https://example.com')
  })

  it('拒绝不是网页的地址', () => {
    expect(normalizeWebUrl('javascript:alert(1)')).toBe('')
    expect(normalizeWebUrl('file:///C:/secret.txt')).toBe('')
    expect(normalizeWebUrl('')).toBe('')
  })
})
