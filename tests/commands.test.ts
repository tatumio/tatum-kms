import { describe, expect } from '@jest/globals'
import { exec } from 'child_process'

function runCommand(cmd: string, callback: (error: Error | null, stdout: string, stderr: string) => void): void {
  exec(cmd, (error, stdout, stderr) => {
    callback(error, stdout, stderr)
  })
}

describe('Generic Commands Tests', () => {
  it('should display help when no parameter is provided', done => {
    runCommand('yarn start', (error, stdout, stderr) => {
      expect(stderr).toBe('')
      expect(stdout).toContain('Tatum KMS - Key Management System for Tatum-powered apps.')
      expect(stdout).toContain('Usage')
      done()
    })
  })
})

const chains: [string][] = [['ABC'], ['XYZ']]

describe('Chain-specific Commands Tests', () => {
  chains.forEach(([chain]) => {
    it(`should not generate wallet for ${chain} and end up with error`, done => {
      runCommand(`yarn start generatewallet ${chain}`, (error, stdout, stderr) => {
        expect(stderr).toContain('Error: Unsupported blockchain')
        done()
      })
    })
  })
})
