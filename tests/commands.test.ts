import { describe, expect } from '@jest/globals'
import { spawnSync } from 'child_process'

function runCommand(cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, {
    shell: false,
    encoding: 'utf-8',
    env: { ...process.env, TATUM_KMS_PASSWORD: 'test' },
  })
  return result.output?.toString()
}

describe('No Command (Help) Tests', () => {
  it('should display help when no parameter is provided', async () => {
    const result = runCommand('yarn', ['start'])
    expect(result).toContain('Tatum KMS - Key Management System for Tatum-powered apps.')
    expect(result).toContain('Usage')
  })
})

const invalidChains: [string][] = [['ABC'], ['XYZ']]

describe('Unsupported Chain Tests', () => {
  invalidChains.forEach(([chain]) => {
    it(`should not generate wallet for ${chain} and end up with error`, async () => {
      const result = runCommand('yarn', ['start', 'generatewallet', `${chain}`])
      expect(result).toContain('Error: Unsupported blockchain.')
    })
  })
})

const validChains: [string][] = [
  ['ALGO'],
  ['BTC'],
  ['BSC'],
  ['CELO'],
  ['DOGE'],
  ['ETH'],
  ['KLAY'],
  ['LTC'],
  ['MATIC'],
  ['XRP'],
  ['SOL'],
  ['XLM'],
  ['TRON'],
]

describe('Command generatemanagedwallet Tests', () => {
  validChains.forEach(([validChain]) => {
    it('should generate a managed wallet', async () => {
      runCommand('rm', ['~/.tatumrc/wallet.dat'])

      const result = runCommand('yarn', ['start', 'generatemanagedwallet', `${validChain}`, '--testnet'])
      const signatureId = result.match(/(?<="signatureId":\s?")([a-f0-9-]+)(?=")/)
      expect(signatureId?.length).toBe(2)

      let assertRegex = /(?<="xpub":\s?")([a-zA-Z0-9]+)(?=")/
      if (['ALGO', 'XRP', 'SOL', 'XLM'].includes(validChain)) {
        assertRegex = /(?<="address":\s?")([a-zA-Z0-9]+)(?=")/;
      }

      const assertValue = result.match(assertRegex)
      expect(assertValue?.length).toBe(2)

      if (signatureId) {
        const resultCheck = runCommand('yarn', ['start', 'getmanagedwallet', `${signatureId[0]}`, '--testnet'])
        expect(resultCheck).toMatch(assertRegex)
      }
    })
  })
})
