import * as chrono from 'chrono-node'
import * as core from '@actions/core'
import * as github from '@actions/github'

import { GitHub } from '@actions/github/lib/utils'

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
query($url: String!) {
  resource(url: $url) {
    ... on Issue {
      createdAt
      title
      url
    }
  }
}
`

interface CloseMutationResponse {
  closeIssue: {
    issue: {
      state: IssueState
      url: string
    }
  }
}

/**
 * Information retrieved on an Issue by the query.
 */
interface IssueInfo {
  /** Date and time the issue was created. */
  createdAt: Date

  /** GraphQL ID of the Issue. */
  id: string

  /** Title of the Issue. */
  title: string

  /** URL to locate the Issue. */
  url: string
}

interface IssueQueryResponse {
  resource: IssueInfo
}

// eslint-disable-next-line no-shadow, @typescript-eslint/no-unused-vars
enum IssueState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN'
}

export type GitHubClient = InstanceType<typeof GitHub>

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
    const client = github.getOctokit(token)

    core.debug(`Issue.fromUrl: ${url}`)

    const response: IssueQueryResponse = await client.graphql(issueQuery, { url })

    if (response) {
      core.debug(`Results: ${JSON.stringify(response, null, 2)}`)

      return new Issue(response.resource)
    } else {
      throw new Error(`No resource retrieved for: ${url}`)
    }
  }

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
