import Issue from '../src/issue'

describe('Issue', () => {
  const testInfo = {
    createdAt: new Date('2020-01-23T00:00:00Z'),
    id: 'MDU6SXNzdWU3MDQ1MTA1NzE=',
    title: 'Test title',
    url: 'https://github.com/octocat/spoon-knife/issues/1'
  }

  describe('isExpired', () => {
    it('returns false if there is no date', () => {
      const issue = new Issue(testInfo)

      expect(issue.isExpired()).toBe(false)
    })

    it('returns false if the date has not passed', () => {
      const issue = new Issue(Object.assign(testInfo, { title: 'Out Jan 31' }))

      expect(issue.isExpired(new Date('2020-01-25T00:00:00Z'))).toBe(false)
    })

    it('returns true if the date has passed', () => {
      const issue = new Issue(Object.assign(testInfo, { title: 'Out Jan 31' }))

      expect(issue.isExpired(new Date('2020-02-05T00:00:00Z'))).toBe(true)
    })

    it('returns false if the start date has passed, but not the end', () => {
      const issue = new Issue(Object.assign(testInfo, { title: 'Out Jan 31 to Feb 5' }))

      expect(issue.isExpired(new Date('2020-02-01T00:00:00Z'))).toBe(false)
    })

    it('returns true if both the start and end dates have passed', () => {
      const issue = new Issue(Object.assign(testInfo, { title: 'Out Jan 31 to Feb 5' }))

      expect(issue.isExpired(new Date('2020-02-10T00:00:00Z'))).toBe(true)
    })
  })
})
