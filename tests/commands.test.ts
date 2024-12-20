import { describe, expect } from '@jest/globals'
import { spawnSync } from 'child_process'

function runCommand(cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, { shell: false, encoding: 'utf-8' })
  return result.output.toString()
}

describe('Generic Commands Tests', () => {
  it('should display help when no parameter is provided', async () => {
    const result = runCommand('yarn', ['start'])
    expect(result).toContain('Tatum KMS - Key Management System for Tatum-powered apps.')
    expect(result).toContain('Usage')
  })
})

const chains: [string][] = [['ABC'], ['XYZ']]

describe('Chain-specific Commands Tests', () => {
  chains.forEach(([chain]) => {
    it(`should not generate wallet for ${chain} and end up with error`, async () => {
      const result = runCommand('yarn', ['start', 'generatewallet', `${chain}`])
      expect(result).toContain('Error: Unsupported blockchain.')
    })
  })
})
