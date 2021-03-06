import * as chrono from 'chrono-node'
import * as core from '@actions/core'
import * as github from '@actions/github'

/**
 * A GraphQL mutation to close an Issue given its ID.
 */
const closeIssueMutation = `
mutation($issueId: ID!) {
  closeIssue(input: { clientMutationId: "close-expired", issueId: $issueId }) {
    issue {
      state
      url
    }
  }
}
`

/**
 * A GraphQL query to retrieve an Issue given its URL.
 */
const issueQuery = `
query($resource: URI!) {
  resource(url: $resource) {
    ... on Issue {
      createdAt
      title
      url
    }
  }
}
`

/**
 * Response returned by the close issue mutation.
 */
interface CloseMutationResponse {
  closeIssue: {
    /** Information about the issue that was closed. */
    issue: {
      state: IssueState
      url: string
    }
  }
}

/**
 * Information retrieved on an Issue by the query.
 */
export interface IssueInfo {
  /** Date and time the issue was created. */
  createdAt: Date | string

  /** GraphQL ID of the Issue. */
  id: string

  /** Title of the Issue. */
  title: string

  /** URL to locate the Issue. */
  url: string
}

/**
 * Response returned by the issue resource query.
 */
interface IssueQueryResponse {
  /** Info describing the Issue or PR or `null` when the URL passed does not describe an Issue or PR.  */
  resource: IssueInfo | null
}

// eslint-disable-next-line no-shadow, @typescript-eslint/no-unused-vars
enum IssueState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN'
}

/**
 * A GitHub Issue.
 */
export default class Issue implements IssueInfo {
  createdAt: Date
  id: string
  title: string
  url: string

  /**
   * Constructs an Issue from its URL.
   *
   * @param url URL to construct the Issue from
   */
  static async fromUrl(url: string): Promise<Issue> {
    const token = core.getInput('token', { required: true })
    const client = github.getOctokit(token, { host: 'https://api.github.com' })

    core.debug(`Issue.fromUrl: ${url}`)

    const response: IssueQueryResponse = await client.graphql(issueQuery, { resource: url })

    core.debug(`Response: ${JSON.stringify(response, null, 2)}`)

    if (response.resource) {
      return new Issue(response.resource)
    } else {
      throw new Error(`No resource retrieved for: ${url}`)
    }
  }

  /**
   * Creates a new `Issue`.
   *
   * @param issueInfo Information describing the issue.
   */
  constructor({ createdAt, id, title, url }: IssueInfo) {
    this.createdAt = new Date(createdAt)
    this.id = id
    this.title = title
    this.url = url
  }

  /**
   * Closes the Issue.
   */
  async close(): Promise<void> {
    const token = core.getInput('token', { required: true })
    const client = github.getOctokit(token)

    core.debug(`Issue.close(): ${this.url}`)

    const response: CloseMutationResponse = await client.graphql(closeIssueMutation, {
      issueId: this.id
    })

    if (
      response &&
      response.closeIssue.issue.url === this.url &&
      response.closeIssue.issue.state === IssueState.CLOSED
    ) {
      return
    }

    throw new Error(`Unable to close issue: ${this.url}`)
  }

  /**
   * Determines if the Issue has expired based on the dates in its title.
   *
   * An issue has expired if any of the following are true:
   *
   * 1. It has an end date in the title and now is after that date
   * 1. It has a single date in the title and now is after that date
   *
   * @param now __Only used for testing__
   */
  isExpired(now = new Date()): boolean {
    const results = chrono.parse(this.title, this.createdAt)

    core.debug(`Issue.isExpired(): ${this.url}`)

    if (results.length === 0) {
      core.debug(`No date found: ${this.url}`)

      return false
    }

    core.debug(`Ref date: ${this.createdAt}`)
    core.debug(`Date text: ${results[0].text}`)
    core.debug(`Date start: ${results[0].start?.date()}`)
    core.debug(`Date end: ${results[0].end?.date()}`)
    core.debug(`Now: ${now}`)

    if (results[0].end) {
      if (results[0].end?.date() < now) {
        return true
      }
    } else if (results[0].start) {
      if (results[0].start?.date() < now) {
        return true
      }
    }

    return false
  }
}
