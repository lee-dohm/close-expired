import nock from 'nock'

import Issue from '../src/issue'

interface GraphQlData<T> {
  data: T
}

let requestBodies: nock.Body[] = []

function graphqlNock<T>(...returnValues: GraphQlData<T>[]): void {
  const n = nock('https://api.github.com')

  returnValues.forEach((returnValue) => {
    n.post('/graphql').reply(200, (_, body) => {
      requestBodies.push(body)

      return returnValue
    })
  })
}

describe('Issue', () => {
  const mockToken = '1234567890abcdef'

  const testInfo = {
    createdAt: '2020-01-23T00:00:00Z',
    id: 'MDU6SXNzdWU3MDQ1MTA1NzE=',
    title: 'Test title',
    url: 'https://github.com/octocat/spoon-knife/issues/1'
  }

  beforeEach(() => {
    Object.assign(process.env, {
      GITHUB_REPOSITORY: 'test-owner/test-repo',
      GITHUB_ACTION: 'close-expired',
      INPUT_TOKEN: mockToken
    })
  })

  describe('fromUrl', () => {
    it('returns a valid Issue when given a valid URL', async () => {
      graphqlNock({
        data: {
          resource: testInfo
        }
      })

      const issue = await Issue.fromUrl('https://github.com/octocat/spoon-knife/issues/1')

      expect(issue.createdAt).toEqual(new Date(testInfo.createdAt))
      expect(issue.id).toEqual(testInfo.id)
      expect(issue.title).toEqual(testInfo.title)
      expect(issue.url).toEqual(testInfo.url)
    })
  })

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
