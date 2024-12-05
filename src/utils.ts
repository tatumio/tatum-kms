export const utils = {
  csvToArray: (csv: string): string[] => {
    if (!csv) return []
    return csv.split(',').map(value => value.trim())
  },
  hideValue: (value: string | undefined, showStart = 6, showEnd = 6): string => {
    if (!value) {
      return ''
    }
    const length = value.length
    if (length <= showStart + showEnd) {
      return '*'.repeat(length)
    }
    return (
      value.slice(0, showStart) +
      '*'.repeat(length - showStart - showEnd) +
      value.slice(length - 1 - showEnd, length - 1)
    )
  },
  hidePassword: (password: string | undefined): string => {
    if (!password) {
      return 'N/A'
    }
    return utils.hideValue(password, 6, 0)
  },
  hideApiKey: (secretValue: string | undefined): string => {
    if (!secretValue) {
      return 'N/A'
    }
    return utils.hideValue(secretValue)
  },
}
